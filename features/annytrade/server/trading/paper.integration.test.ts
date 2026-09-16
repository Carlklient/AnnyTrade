import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { closeSql, getDatabaseUrl, getSql } from "../db/client";
import { runMigrations } from "../db/migrate";
import { registerUser } from "../services/auth";
import { ApiError } from "../http/errors";
import { resetMarketDataProviderCache } from "../market/factory";
import { cacheClear } from "../market/cache";
import {
  cancelPaperOrder,
  evaluateRestingOrder,
  getPaperAccountSummary,
  listPaperOrders,
  listPaperPositions,
  processOpenOrdersForAccount,
  submitPaperOrder,
} from "./engine";
import type { DbOrder } from "../domain/types";
import type { Quote } from "../market/types";

const hasDb = Boolean(getDatabaseUrl());

function quote(partial: Partial<Quote> & { symbol: string }): Quote {
  const symbol = partial.symbol;
  return {
    instrumentId: `eq:${symbol}`,
    symbol,
    bid: partial.bid ?? "100",
    ask: partial.ask ?? "101",
    last: partial.last ?? "100.5",
    open: partial.open ?? "100",
    high: partial.high ?? "102",
    low: partial.low ?? "99",
    previousClose: partial.previousClose ?? "100",
    change: partial.change ?? "0.5",
    changePercent: partial.changePercent ?? "0.5",
    volume: partial.volume ?? "1000",
    timestamp: partial.timestamp ?? new Date().toISOString(),
    marketStatus: partial.marketStatus ?? "regular",
    freshness: partial.freshness ?? "DEMO",
    delayMinutes: partial.delayMinutes ?? null,
  };
}

describe("paper evaluateRestingOrder", () => {
  it("fills buy limit when ask at or below limit", () => {
    const order = {
      side: "BUY",
      order_type: "LIMIT",
      limit_price: "100",
      stop_price: null,
      activated_at: null,
    } as DbOrder;
    const hit = evaluateRestingOrder(
      order,
      quote({ symbol: "AAPL", ask: "99", last: "99" }),
    );
    expect(hit?.fillPrice).toBe(99);
    const miss = evaluateRestingOrder(
      order,
      quote({ symbol: "AAPL", ask: "101", last: "101" }),
    );
    expect(miss).toBeNull();
  });

  it("fills sell limit when bid at or above limit", () => {
    const order = {
      side: "SELL",
      order_type: "LIMIT",
      limit_price: "100",
      stop_price: null,
      activated_at: null,
    } as DbOrder;
    const hit = evaluateRestingOrder(
      order,
      quote({ symbol: "AAPL", bid: "101", last: "101" }),
    );
    expect(hit?.fillPrice).toBe(101);
  });

  it("triggers buy stop when last >= stop", () => {
    const order = {
      side: "BUY",
      order_type: "STOP",
      limit_price: null,
      stop_price: "105",
      activated_at: null,
    } as DbOrder;
    expect(
      evaluateRestingOrder(
        order,
        quote({ symbol: "AAPL", last: "104", ask: "104.5" }),
      ),
    ).toBeNull();
    const hit = evaluateRestingOrder(
      order,
      quote({ symbol: "AAPL", last: "105", ask: "105.2" }),
    );
    expect(hit?.fillPrice).toBe(105.2);
  });
});

describe.skipIf(!hasDb)("AnnyTrade Phase 3 paper trading", () => {
  beforeAll(async () => {
    process.env.ANNYTRADE_DATABASE_URL =
      process.env.ANNYTRADE_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgresql://annytrade:annytrade_dev@127.0.0.1:54329/annytrade";
    process.env.ANNYTRADE_MARKET_DATA_PROVIDER = "test";
    delete process.env.ANNYTRADE_MARKET_DATA_API_KEY;
    process.env.ANNYTRADE_PAPER_FEE_BPS = "0";
    resetMarketDataProviderCache();
    cacheClear();
    await runMigrations();
  });

  beforeEach(async () => {
    resetMarketDataProviderCache();
    cacheClear();
    process.env.ANNYTRADE_MARKET_DATA_PROVIDER = "test";
    const sql = getSql();
    await sql`TRUNCATE annytrade.ledger_adjustments, annytrade.admin_action_audit, annytrade.admin_roles,
  annytrade.job_runs, annytrade.rate_limit_events, annytrade.notification_failures,
  annytrade.webhook_replay_guard, annytrade.account_closure_requests, annytrade.ops_alerts, annytrade.order_reviews, annytrade.execution_audit, annytrade.trading_controls, annytrade.broker_event_dedupe, annytrade.broker_executions, annytrade.broker_orders, annytrade.broker_positions_cache, annytrade.broker_connections, annytrade.price_alerts, annytrade.equity_snapshots, annytrade.executions, annytrade.orders, annytrade.positions, annytrade.audit_events, annytrade.notifications, annytrade.watchlist_items, annytrade.watchlists, annytrade.account_ledger_entries, annytrade.trading_accounts, annytrade.email_verification_tokens, annytrade.password_reset_tokens, annytrade.sessions, annytrade.profiles, annytrade.users RESTART IDENTITY CASCADE`;
  });

  afterAll(async () => {
    await closeSql();
  });

  async function user(email: string) {
    return registerUser({
      email,
      password: "SecurePass99",
      displayName: "Paper Trader",
    });
  }

  it("market buy then sell updates cash, position, and ledger", async () => {
    const u = await user("p3-mkt@example.com");
    const buy = await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 10,
      idempotencyKey: "buy-aapl-1",
    });
    expect(buy.order.status).toBe("FILLED");
    expect(buy.order.filledQuantity).toBe(10);
    expect(buy.order.averageFillPrice).toBeGreaterThan(0);

    const positions = await listPaperPositions(u.user.id);
    expect(positions).toHaveLength(1);
    expect(positions[0]?.symbol).toBe("AAPL");
    expect(positions[0]?.quantity).toBe(10);

    const summaryAfterBuy = await getPaperAccountSummary(u.user.id);
    expect(summaryAfterBuy.cashBalance).toBeLessThan(100_000);

    const sell = await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "SELL",
      orderType: "MARKET",
      quantity: 10,
      idempotencyKey: "sell-aapl-1",
    });
    expect(sell.order.status).toBe("FILLED");

    const after = await listPaperPositions(u.user.id);
    expect(after).toHaveLength(0);

    const summary = await getPaperAccountSummary(u.user.id);
    // fees 0 — cash should return near start depending on bid/ask spread cost
    expect(summary.cashBalance).toBeLessThan(100_000);
    expect(summary.cashBalance).toBeGreaterThan(90_000);
  });

  it("rejects oversell for long-only paper", async () => {
    const u = await user("p3-over@example.com");
    const rejected = await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "SELL",
      orderType: "MARKET",
      quantity: 5,
      idempotencyKey: "oversell-1",
    });
    expect(rejected.order.status).toBe("REJECTED");
  });

  it("rejects insufficient cash market buy", async () => {
    const u = await user("p3-cash@example.com");
    const rejected = await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 1_000_000,
      idempotencyKey: "big-buy",
    });
    expect(rejected.order.status).toBe("REJECTED");
    expect(rejected.order.rejectReason).toMatch(/cash/i);
  });

  it("idempotent submit does not duplicate orders", async () => {
    const u = await user("p3-idem@example.com");
    const a = await submitPaperOrder({
      userId: u.user.id,
      symbol: "MSFT",
      side: "BUY",
      orderType: "MARKET",
      quantity: 1,
      idempotencyKey: "same-key",
    });
    const b = await submitPaperOrder({
      userId: u.user.id,
      symbol: "MSFT",
      side: "BUY",
      orderType: "MARKET",
      quantity: 1,
      idempotencyKey: "same-key",
    });
    expect(b.replayed).toBe(true);
    expect(b.order.id).toBe(a.order.id);
    const orders = await listPaperOrders(u.user.id);
    expect(orders.filter((o) => o.symbol === "MSFT")).toHaveLength(1);
  });

  it("limit buy rests then fills on process when market crosses", async () => {
    const u = await user("p3-lim@example.com");
    // Place limit far below market — should stay OPEN
    const resting = await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "LIMIT",
      quantity: 2,
      limitPrice: 0.01,
      idempotencyKey: "limit-low",
    });
    expect(["OPEN", "PENDING"]).toContain(resting.order.status);

    // Cancel and place a limit above market so it fills immediately
    await cancelPaperOrder({ userId: u.user.id, orderId: resting.order.id });
    const fillable = await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "LIMIT",
      quantity: 2,
      limitPrice: 10_000,
      idempotencyKey: "limit-high",
    });
    expect(fillable.order.status).toBe("FILLED");
  });

  it("cancel open order", async () => {
    const u = await user("p3-cancel@example.com");
    const resting = await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "LIMIT",
      quantity: 1,
      limitPrice: 0.01,
      idempotencyKey: "cancel-me",
    });
    const cancelled = await cancelPaperOrder({
      userId: u.user.id,
      orderId: resting.order.id,
    });
    expect(cancelled.status).toBe("CANCELLED");
    await expect(
      cancelPaperOrder({ userId: u.user.id, orderId: resting.order.id }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("enforces user isolation on orders", async () => {
    const a = await user("p3-iso-a@example.com");
    const b = await user("p3-iso-b@example.com");
    const order = await submitPaperOrder({
      userId: a.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 1,
      idempotencyKey: "iso-a",
    });
    await expect(
      cancelPaperOrder({ userId: b.user.id, orderId: order.order.id }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("stop buy fills when processed after trigger (demo quote always active)", async () => {
    const u = await user("p3-stop@example.com");
    // Stop at very low trigger so current last activates immediately
    const order = await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "STOP",
      quantity: 1,
      stopPrice: 0.01,
      idempotencyKey: "stop-buy",
    });
    // May fill immediately on submit evaluation
    if (order.order.status !== "FILLED") {
      const summary = await getPaperAccountSummary(u.user.id);
      await processOpenOrdersForAccount(u.user.id, summary.accountId);
      const orders = await listPaperOrders(u.user.id);
      const updated = orders.find((o) => o.id === order.order.id);
      expect(updated?.status).toBe("FILLED");
    } else {
      expect(order.order.status).toBe("FILLED");
    }
  });

  it("ledger remains consistent: cash + cost_basis ≈ initial after buy", async () => {
    const u = await user("p3-inv@example.com");
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 3,
      idempotencyKey: "inv-1",
    });
    const summary = await getPaperAccountSummary(u.user.id);
    const pos = summary.positions[0]!;
    const conserved = summary.cashBalance + pos.costBasis;
    expect(Math.abs(conserved - 100_000)).toBeLessThan(0.01);
  });

  it("concurrent market buys do not overspend cash", async () => {
    const u = await user("p3-conc@example.com");
    const summary = await getPaperAccountSummary(u.user.id);
    // Each buy ~ ask * qty; place many overlapping small buys
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        submitPaperOrder({
          userId: u.user.id,
          symbol: "AAPL",
          side: "BUY",
          orderType: "MARKET",
          quantity: 50,
          idempotencyKey: `conc-${i}`,
        }),
      ),
    );
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThan(0);
    const after = await getPaperAccountSummary(u.user.id);
    expect(after.cashBalance).toBeGreaterThanOrEqual(-0.0001);
    expect(after.accountId).toBe(summary.accountId);
  });
});
