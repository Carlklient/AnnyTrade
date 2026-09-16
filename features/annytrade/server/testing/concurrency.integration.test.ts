import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { closeSql, getDatabaseUrl, getSql } from "../db/client";
import { runMigrations } from "../db/migrate";
import { registerUser } from "../services/auth";
import {
  submitPaperOrder,
  cancelPaperOrder,
  listPaperOrders,
  processOpenOrdersForAccount,
  getPaperAccountSummary,
} from "../trading/engine";
import { listAccountsForUser } from "../repos/accounts";

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

describe.skipIf(!hasDb)("Phase 11 concurrency / race conditions", () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await getSql().unsafe(TRUNCATE);
  });

  afterAll(async () => {
    await closeSql();
  });

  it("duplicate idempotent submissions do not double-fill", async () => {
    const u = await registerUser({
      email: `race-idem-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "Race",
    });
    const key = "same-key-race";
    const [a, b] = await Promise.all([
      submitPaperOrder({
        userId: u.user.id,
        symbol: "AAPL",
        side: "BUY",
        orderType: "MARKET",
        quantity: 1,
        idempotencyKey: key,
      }),
      submitPaperOrder({
        userId: u.user.id,
        symbol: "AAPL",
        side: "BUY",
        orderType: "MARKET",
        quantity: 1,
        idempotencyKey: key,
      }),
    ]);
    expect(a.order.id).toBe(b.order.id);
    expect(a.replayed || b.replayed).toBe(true);
    const orders = await listPaperOrders(u.user.id);
    expect(orders.filter((o) => o.id === a.order.id)).toHaveLength(1);
  });

  it("simultaneous distinct orders respect non-negative cash", async () => {
    const u = await registerUser({
      email: `race-cash-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "CashRace",
    });
    await Promise.allSettled(
      Array.from({ length: 30 }, (_, i) =>
        submitPaperOrder({
          userId: u.user.id,
          symbol: "AAPL",
          side: "BUY",
          orderType: "MARKET",
          quantity: 40,
          idempotencyKey: `cash-race-${i}`,
        }),
      ),
    );
    const summary = await getPaperAccountSummary(u.user.id);
    expect(summary.cashBalance).toBeGreaterThanOrEqual(-0.0001);
  });

  it("cancel vs process race does not leave inconsistent open qty", async () => {
    const u = await registerUser({
      email: `race-cx-${Date.now()}@example.com`,
      password: "Password1!",
      displayName: "CxRace",
    });
    const accounts = await listAccountsForUser(u.user.id);
    const accountId = accounts[0]!.id;
    const resting = await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "LIMIT",
      quantity: 1,
      limitPrice: 0.01,
      idempotencyKey: `rest-${Date.now()}`,
    });

    await Promise.allSettled([
      cancelPaperOrder({ userId: u.user.id, orderId: resting.order.id }),
      processOpenOrdersForAccount(u.user.id, accountId),
    ]);

    const orders = await listPaperOrders(u.user.id);
    const order = orders.find((o) => o.id === resting.order.id);
    expect(order).toBeTruthy();
    expect([
      "CANCELLED",
      "FILLED",
      "OPEN",
      "PENDING",
      "PARTIALLY_FILLED",
    ]).toContain(order!.status);
    if (order!.status === "CANCELLED") {
      expect(order!.filledQuantity).toBe(0);
    }
  });
});
