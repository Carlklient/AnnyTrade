import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { closeSql, getDatabaseUrl, getSql } from "../db/client";
import { runMigrations } from "../db/migrate";
import { registerUser } from "../services/auth";
import { getAdminRole, grantAdminRole, requireAdmin } from "../admin/auth";
import { ApiError } from "../http/errors";
import { suspendUserAsAdmin } from "../admin/users";
import { createLedgerAdjustment } from "../admin/adjustments";
import { listAccountsForUser } from "../repos/accounts";
import { PHASE8_LIVE_SUBMISSION_HARD_BLOCK } from "../execution/live-guard";
import { getAdminDashboardSnapshot } from "../admin/dashboard";

const hasDb = Boolean(getDatabaseUrl());

const TRUNCATE = `
  TRUNCATE annytrade.ledger_adjustments, annytrade.admin_action_audit, annytrade.admin_roles,
  annytrade.job_runs, annytrade.rate_limit_events, annytrade.notification_failures,
  annytrade.webhook_replay_guard, annytrade.account_closure_requests,
  annytrade.ops_alerts, annytrade.order_reviews, annytrade.execution_audit,
  annytrade.trading_controls, annytrade.broker_event_dedupe, annytrade.broker_executions,
  annytrade.broker_orders, annytrade.broker_positions_cache, annytrade.broker_connections,
  annytrade.price_alerts, annytrade.equity_snapshots, annytrade.executions, annytrade.orders,
  annytrade.positions, annytrade.audit_events, annytrade.notifications,
  annytrade.watchlist_items, annytrade.watchlists, annytrade.account_ledger_entries,
  annytrade.trading_accounts, annytrade.email_verification_tokens,
  annytrade.password_reset_tokens, annytrade.sessions, annytrade.profiles,
  annytrade.users RESTART IDENTITY CASCADE
`;

describe.skipIf(!hasDb)("AnnyTrade Phase 10 admin isolation", () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    delete process.env.ANNYTRADE_ADMIN_EMAILS;
    const sql = getSql();
    await sql.unsafe(TRUNCATE);
  });

  afterAll(async () => {
    await closeSql();
  });

  it("keeps live trading hard-blocked", () => {
    expect(PHASE8_LIVE_SUBMISSION_HARD_BLOCK).toBe(true);
  });

  it("denies admin APIs to customers (privilege escalation blocked)", async () => {
    const customer = await registerUser({
      email: `cust-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "Customer",
    });
    expect(await getAdminRole(customer.user.id)).toBeNull();
    await expect(requireAdmin(customer.token)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows explicitly assigned admins and blocks customer suspend escalation", async () => {
    const adminReg = await registerUser({
      email: `admin-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "Admin",
    });
    const customer = await registerUser({
      email: `vict-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "Victim",
    });

    await grantAdminRole({
      userId: adminReg.user.id,
      role: "ADMIN",
      grantedBy: adminReg.user.id,
      grantSource: "explicit",
      reason: "test",
    });

    const adminCtx = await requireAdmin(adminReg.token, { minRole: "ADMIN" });
    expect(adminCtx.role).toBe("ADMIN");

    // Customer cannot grant themselves by calling grantAdminRole without being admin —
    // requireAdmin fails first; direct grantAdminRole is server-only.
    await expect(requireAdmin(customer.token)).rejects.toBeInstanceOf(ApiError);

    const suspended = await suspendUserAsAdmin(
      adminCtx,
      customer.user.id,
      "abuse",
    );
    expect(suspended.status).toBe("SUSPENDED");
  });

  it("env bootstrap assigns admin only for listed emails", async () => {
    const email = `boot-${Date.now()}@example.com`;
    process.env.ANNYTRADE_ADMIN_EMAILS = email;
    const user = await registerUser({
      email,
      password: "Password1!",
      displayName: "Boot",
    });
    const ctx = await requireAdmin(user.token);
    expect(ctx.role).toBe("ADMIN");
    expect(await getAdminRole(user.user.id)).toBe("ADMIN");
  });

  it("READONLY cannot perform OPERATOR actions (privilege escalation blocked)", async () => {
    const ro = await registerUser({
      email: `ro-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "ReadOnly",
    });
    const customer = await registerUser({
      email: `ro-vict-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "Target",
    });
    await grantAdminRole({
      userId: ro.user.id,
      role: "READONLY",
      grantedBy: null,
      grantSource: "explicit",
      reason: "test readonly",
    });
    await expect(
      requireAdmin(ro.token, { minRole: "READONLY" }),
    ).resolves.toMatchObject({
      role: "READONLY",
    });
    await expect(
      requireAdmin(ro.token, { minRole: "OPERATOR" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const roCtx = await requireAdmin(ro.token, { minRole: "READONLY" });
    await expect(
      suspendUserAsAdmin(roCtx, customer.user.id, "escalation attempt"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ledger adjustments are immutable append-only with audit", async () => {
    const adminReg = await registerUser({
      email: `adj-admin-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "AdjAdmin",
    });
    await grantAdminRole({
      userId: adminReg.user.id,
      role: "ADMIN",
      grantedBy: null,
      grantSource: "explicit",
      reason: "test",
    });
    const admin = await requireAdmin(adminReg.token, { minRole: "ADMIN" });
    const accounts = await listAccountsForUser(admin.userId);
    const result = await createLedgerAdjustment(admin, {
      accountId: accounts[0]!.id,
      amount: -10,
      reason: "Ops correction test entry",
    });
    expect(result.immutable).toBe(true);

    const snap = await getAdminDashboardSnapshot();
    expect(snap.liveTradingDisabled).toBe(true);
    expect(snap.health.broker.liveHardBlock).toBe(true);
  });
});
