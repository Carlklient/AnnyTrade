import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeSql, getDatabaseUrl, getSql } from "./db/client";
import { runMigrations } from "./db/migrate";
import { hashPassword, verifyPassword } from "./security/password";
import {
  loginUser,
  logoutUser,
  registerUser,
  getSessionUser,
  listPublicAccounts,
} from "./services/auth";
import { listWatchlists, addWatchlistItem } from "./repos/watchlists";
import { updateUserStatus } from "./repos/users";
import {
  listNotifications,
  markAllNotificationsRead,
} from "./repos/notifications";
import { ApiError } from "./http/errors";

const hasDb = Boolean(getDatabaseUrl());

describe.skipIf(!hasDb)("AnnyTrade Phase 1 backend", () => {
  beforeAll(async () => {
    process.env.ANNYTRADE_DATABASE_URL =
      process.env.ANNYTRADE_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgresql://annytrade:annytrade_dev@127.0.0.1:54329/annytrade";
    await runMigrations();
    const sql = getSql();
    await sql`TRUNCATE annytrade.ledger_adjustments, annytrade.admin_action_audit, annytrade.admin_roles,
  annytrade.job_runs, annytrade.rate_limit_events, annytrade.notification_failures,
  annytrade.webhook_replay_guard, annytrade.account_closure_requests, annytrade.ops_alerts, annytrade.order_reviews, annytrade.execution_audit, annytrade.trading_controls, annytrade.broker_event_dedupe, annytrade.broker_executions, annytrade.broker_orders, annytrade.broker_positions_cache, annytrade.broker_connections, annytrade.price_alerts, annytrade.equity_snapshots, annytrade.executions, annytrade.orders, annytrade.positions, annytrade.audit_events, annytrade.notifications, annytrade.watchlist_items, annytrade.watchlists, annytrade.account_ledger_entries, annytrade.trading_accounts, annytrade.email_verification_tokens, annytrade.password_reset_tokens, annytrade.sessions, annytrade.profiles, annytrade.users RESTART IDENTITY CASCADE`;
  });

  afterAll(async () => {
    await closeSql();
  });

  it("hashes passwords with Argon2id", async () => {
    const hash = await hashPassword("SecurePass99");
    expect(hash.includes("argon2")).toBe(true);
    expect(await verifyPassword("SecurePass99", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("registers, logs in, and persists session user", async () => {
    const registered = await registerUser({
      email: "alice@example.com",
      password: "SecurePass99",
      displayName: "Alice Trader",
    });
    expect(registered.user.email).toBe("alice@example.com");

    const session = await getSessionUser(registered.token);
    expect(session?.user.displayName).toBe("Alice Trader");

    const accounts = await listPublicAccounts(registered.user.id);
    expect(accounts.length).toBe(1);
    expect(accounts[0]?.accountType).toBe("PAPER");
    expect(accounts[0]?.ledgerBalance).toBe(100000);

    const lists = await listWatchlists(registered.user.id);
    expect(lists[0]?.symbols.length).toBeGreaterThan(0);

    await logoutUser({ token: registered.token });
    expect(await getSessionUser(registered.token)).toBeNull();

    const login = await loginUser({
      email: "alice@example.com",
      password: "SecurePass99",
    });
    expect(login.user.id).toBe(registered.user.id);
  });

  it("enforces user isolation on watchlists", async () => {
    const a = await registerUser({
      email: "iso-a@example.com",
      password: "SecurePass99",
      displayName: "Iso A",
    });
    const b = await registerUser({
      email: "iso-b@example.com",
      password: "SecurePass99",
      displayName: "Iso B",
    });

    const aLists = await listWatchlists(a.user.id);
    const watchlistId = aLists[0]!.id;
    await addWatchlistItem(a.user.id, watchlistId, "NVDA");

    await expect(
      addWatchlistItem(b.user.id, watchlistId, "AAPL"),
    ).rejects.toThrow();

    const bLists = await listWatchlists(b.user.id);
    expect(bLists.some((w) => w.symbols.includes("NVDA"))).toBe(false);
  });

  it("blocks suspended users from login", async () => {
    const user = await registerUser({
      email: "suspended@example.com",
      password: "SecurePass99",
      displayName: "Suspended",
    });
    await updateUserStatus(user.user.id, "SUSPENDED");
    await expect(
      loginUser({ email: "suspended@example.com", password: "SecurePass99" }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("persists notifications and mark-all-read", async () => {
    const user = await registerUser({
      email: "notify@example.com",
      password: "SecurePass99",
      displayName: "Notify",
    });
    const notes = await listNotifications(user.user.id);
    expect(notes.length).toBeGreaterThan(0);
    const updated = await markAllNotificationsRead(user.user.id);
    expect(updated).toBeGreaterThan(0);
    const after = await listNotifications(user.user.id);
    expect(after.every((n) => n.read_at)).toBe(true);
  });

  it("rejects invalid credentials without leaking existence", async () => {
    await expect(
      loginUser({ email: "missing@example.com", password: "SecurePass99" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});
