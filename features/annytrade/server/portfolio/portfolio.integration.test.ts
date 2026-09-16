import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { closeSql, getDatabaseUrl, getSql } from "../db/client";
import { runMigrations } from "../db/migrate";
import { registerUser } from "../services/auth";
import { resetMarketDataProviderCache } from "../market/factory";
import { cacheClear } from "../market/cache";
import { marketDataService } from "../market/service";
import { submitPaperOrder } from "../trading/engine";
import { computePaperPortfolio } from "./service";
import { computePortfolioTotals } from "./calc";

const hasDb = Boolean(getDatabaseUrl());

const TRUNCATE = `
  TRUNCATE annytrade.ledger_adjustments, annytrade.admin_action_audit, annytrade.admin_roles,
  annytrade.job_runs, annytrade.rate_limit_events, annytrade.notification_failures,
  annytrade.webhook_replay_guard, annytrade.account_closure_requests,
  annytrade.ops_alerts, annytrade.order_reviews, annytrade.execution_audit,
  annytrade.trading_controls, annytrade.broker_event_dedupe, annytrade.broker_executions, annytrade.broker_orders,
  annytrade.broker_positions_cache, annytrade.broker_connections,
  annytrade.price_alerts, annytrade.equity_snapshots, annytrade.executions, annytrade.orders,
  annytrade.positions, annytrade.audit_events, annytrade.notifications,
  annytrade.watchlist_items, annytrade.watchlists, annytrade.account_ledger_entries,
  annytrade.trading_accounts, annytrade.email_verification_tokens,
  annytrade.password_reset_tokens, annytrade.sessions, annytrade.profiles,
  annytrade.users RESTART IDENTITY CASCADE
`;

describe.skipIf(!hasDb)("AnnyTrade Phase 4 portfolio analytics", () => {
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
    process.env.ANNYTRADE_PAPER_FEE_BPS = "0";
    vi.restoreAllMocks();
    const sql = getSql();
    await sql.unsafe(TRUNCATE);
  });

  afterAll(async () => {
    await closeSql();
  });

  async function user(email: string) {
    return registerUser({
      email,
      password: "SecurePass99",
      displayName: "Portfolio Trader",
    });
  }

  it("single buy: cash + MV = equity; cost basis conserved", async () => {
    const u = await user("p4-buy@example.com");
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 10,
      idempotencyKey: "p4-buy-1",
    });
    const a = await computePaperPortfolio(u.user.id, { recordSnapshot: true });
    expect(a.marksComplete).toBe(true);
    expect(a.equity).not.toBeNull();
    expect(a.equity).toBeCloseTo(a.cash + a.marketValue, 6);
    expect(Math.abs(a.cash + a.costBasis - 100_000)).toBeLessThan(0.02);
    expect(a.positions).toHaveLength(1);
    expect(a.tradeStats.insufficientHistory).toBe(true);
  });

  it("multiple buys then partial sell realizes FIFO P&L", async () => {
    const u = await user("p4-partial@example.com");
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 10,
      idempotencyKey: "p4-mb-1",
    });
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 5,
      idempotencyKey: "p4-mb-2",
    });
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "SELL",
      orderType: "MARKET",
      quantity: 6,
      idempotencyKey: "p4-ms-1",
    });
    const a = await computePaperPortfolio(u.user.id);
    expect(a.positions[0]?.quantity).toBe(9);
    expect(a.realizedPnl).not.toBe(0);
    expect(a.tradeStats.tradeCount).toBeGreaterThanOrEqual(1);
    expect(a.totalPnl).toBeCloseTo(a.realizedPnl + a.unrealizedPnl, 6);
  });

  it("full close produces completed trade stats", async () => {
    const u = await user("p4-close@example.com");
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "MSFT",
      side: "BUY",
      orderType: "MARKET",
      quantity: 4,
      idempotencyKey: "p4-fc-b",
    });
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "MSFT",
      side: "SELL",
      orderType: "MARKET",
      quantity: 4,
      idempotencyKey: "p4-fc-s",
    });
    const a = await computePaperPortfolio(u.user.id);
    expect(a.positions).toHaveLength(0);
    expect(a.marketValue).toBe(0);
    expect(a.equity).toBe(a.cash);
    expect(a.tradeStats.tradeCount).toBeGreaterThanOrEqual(1);
    expect(a.tradeStats.insufficientHistory).toBe(false);
    expect(a.bySymbolPnl.some((x) => x.symbol === "MSFT")).toBe(true);
  });

  it("fees are included in feesPaid and trade matching", async () => {
    process.env.ANNYTRADE_PAPER_FEE_BPS = "10"; // 0.10%
    const u = await user("p4-fees@example.com");
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 10,
      idempotencyKey: "p4-fee-b",
    });
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "SELL",
      orderType: "MARKET",
      quantity: 10,
      idempotencyKey: "p4-fee-s",
    });
    const a = await computePaperPortfolio(u.user.id);
    expect(a.feesPaid).toBeGreaterThan(0);
    expect(a.tradeStats.tradeCount).toBeGreaterThanOrEqual(1);
  });

  it("multiple symbols allocation sums ~100%", async () => {
    const u = await user("p4-multi@example.com");
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 5,
      idempotencyKey: "p4-m-a",
    });
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "MSFT",
      side: "BUY",
      orderType: "MARKET",
      quantity: 3,
      idempotencyKey: "p4-m-m",
    });
    const a = await computePaperPortfolio(u.user.id);
    expect(a.allocation.length).toBe(2);
    const pctSum = a.allocation.reduce((s, x) => s + x.pct, 0);
    expect(Math.abs(pctSum - 100)).toBeLessThan(0.05);
    expect(a.exposure.bySymbol).toHaveLength(2);
  });

  it("market-data failure yields marksComplete false and null equity", async () => {
    const u = await user("p4-mdfail@example.com");
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 2,
      idempotencyKey: "p4-md-b",
    });
    vi.spyOn(marketDataService, "quotes").mockRejectedValue(
      new Error("provider down"),
    );
    const a = await computePaperPortfolio(u.user.id, { recordSnapshot: false });
    expect(a.marksComplete).toBe(false);
    expect(a.equity).toBeNull();
    expect(a.unmarkedSymbols).toContain("AAPL");
    expect(a.accountGrowthPct).toBeNull();
  });

  it("equity snapshot history begins after reliable compute", async () => {
    const u = await user("p4-snap@example.com");
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 1,
      idempotencyKey: "p4-snap-1",
    });
    const a = await computePaperPortfolio(u.user.id, { recordSnapshot: true });
    expect(a.equityHistory.length).toBeGreaterThanOrEqual(1);
    expect(a.drawdown.insufficientHistory).toBe(true);
    // second snapshot same day upserts — still one day of history
    const b = await computePaperPortfolio(u.user.id, { recordSnapshot: true });
    expect(b.equityHistory.length).toBeGreaterThanOrEqual(1);
  });

  it("reconciliation: pure totals match service cash/MV/equity", async () => {
    const u = await user("p4-recon@example.com");
    await submitPaperOrder({
      userId: u.user.id,
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 7,
      idempotencyKey: "p4-recon-1",
    });
    const a = await computePaperPortfolio(u.user.id);
    const pure = computePortfolioTotals({
      cash: a.cash,
      reserved: a.reserved,
      feesPaid: a.feesPaid,
      realizedPnl: a.realizedPnl,
      positions: a.positions.map((p) => ({
        symbol: p.symbol,
        quantity: p.quantity,
        averageEntry: p.averageEntry,
        costBasis: p.costBasis,
        realizedPnl: p.realizedPnl,
        markPrice: p.markPrice,
      })),
    });
    expect(pure.equity).toBe(a.equity);
    expect(pure.marketValue).toBe(a.marketValue);
    expect(pure.unrealizedPnl).toBe(a.unrealizedPnl);
  });
});
