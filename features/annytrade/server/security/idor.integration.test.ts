import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { closeSql, getDatabaseUrl, getSql } from "../db/client";
import { runMigrations } from "../db/migrate";
import { registerUser } from "../services/auth";
import {
  submitPaperOrder,
  getPaperOrderDetail,
  cancelPaperOrder,
} from "../trading/engine";
import { computePaperPortfolio } from "../portfolio/service";
import { getAccountForUser, listAccountsForUser } from "../repos/accounts";
import {
  createWatchlist,
  addWatchlistItem,
  listWatchlists,
} from "../repos/watchlists";
import {
  createPriceAlert,
  getPriceAlertForUser,
  listPriceAlertsForUser,
} from "../repos/alerts";
import { ApiError } from "../http/errors";
import { closeUserAccount } from "../services/privacy";
import { PHASE8_LIVE_SUBMISSION_HARD_BLOCK } from "../execution/live-guard";
import { getBrokerOrderForUser } from "../repos/broker";

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

describe.skipIf(!hasDb)("AnnyTrade Phase 9 IDOR / user isolation", () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    const sql = getSql();
    await sql.unsafe(TRUNCATE);
  });

  afterAll(async () => {
    await closeSql();
  });

  it("preserves live execution hard block", () => {
    expect(PHASE8_LIVE_SUBMISSION_HARD_BLOCK).toBe(true);
  });

  it("isolates accounts, orders, portfolio, watchlists, alerts across users", async () => {
    const a = await registerUser({
      email: `idor-a-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "A",
    });
    const b = await registerUser({
      email: `idor-b-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "B",
    });

    const accountsA = await listAccountsForUser(a.user.id);
    const accountsB = await listAccountsForUser(b.user.id);
    const accA = accountsA[0]!;
    const accB = accountsB[0]!;

    expect(await getAccountForUser(accA.id, b.user.id)).toBeNull();
    expect(await getAccountForUser(accB.id, a.user.id)).toBeNull();

    const { order } = await submitPaperOrder({
      userId: a.user.id,
      accountId: accA.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 1,
    });

    await expect(
      getPaperOrderDetail(b.user.id, order.id),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });

    await expect(
      cancelPaperOrder({ userId: b.user.id, orderId: order.id }),
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      computePaperPortfolio(b.user.id, { accountId: accA.id }),
    ).rejects.toBeInstanceOf(ApiError);

    const wl = await createWatchlist(a.user.id, `wl-${Date.now()}`);
    const bLists = await listWatchlists(b.user.id);
    expect(bLists.every((l) => l.id !== wl.id)).toBe(true);
    await expect(
      addWatchlistItem(b.user.id, wl.id, "MSFT"),
    ).rejects.toBeTruthy();

    const alert = await createPriceAlert({
      userId: a.user.id,
      symbol: "AAPL",
      condition: "PRICE_ABOVE",
      targetValue: 999,
    });
    expect(await getPriceAlertForUser(b.user.id, alert.id)).toBeNull();
    const bAlerts = await listPriceAlertsForUser(b.user.id);
    expect(bAlerts.every((x) => x.id !== alert.id)).toBe(true);

    // Broker order lookup with foreign id returns null
    expect(await getBrokerOrderForUser(b.user.id, order.id)).toBeNull();
  });

  it("closes account with confirmation gate", async () => {
    const u = await registerUser({
      email: `close-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "CloseMe",
    });
    const result = await closeUserAccount({
      userId: u.user.id,
      confirmation: "CLOSE",
      reason: "user_request",
    });
    expect(result.status).toBe("CLOSED");
    await expect(
      closeUserAccount({
        userId: u.user.id,
        confirmation: "nope",
      }),
    ).rejects.toMatchObject({ code: "CONFIRMATION_REQUIRED" });
  });
});
