import { describe, expect, it } from "vitest";

import {
  bucketSeries,
  computeDrawdown,
  computeGrowthPct,
  computePortfolioTotals,
  dailyPnlFromSnapshots,
} from "./calc";
import { computeTradeStats, matchFifoTrades } from "./trades";

describe("computePortfolioTotals", () => {
  it("equity = cash + market value when all marked", () => {
    const t = computePortfolioTotals({
      cash: 90_000,
      reserved: 0,
      feesPaid: 0,
      realizedPnl: 0,
      positions: [
        {
          symbol: "AAPL",
          quantity: 10,
          averageEntry: 100,
          costBasis: 1000,
          realizedPnl: 0,
          markPrice: 110,
        },
      ],
    });
    expect(t.marketValue).toBe(1100);
    expect(t.unrealizedPnl).toBe(100);
    expect(t.equity).toBe(91_100);
    expect(t.marksComplete).toBe(true);
    expect(t.allocation[0]?.pct).toBe(100);
  });

  it("withholds equity when mark missing (no fake price)", () => {
    const t = computePortfolioTotals({
      cash: 90_000,
      reserved: 100,
      feesPaid: 5,
      realizedPnl: 20,
      positions: [
        {
          symbol: "AAPL",
          quantity: 10,
          averageEntry: 100,
          costBasis: 1000,
          realizedPnl: 0,
          markPrice: null,
        },
      ],
    });
    expect(t.equity).toBeNull();
    expect(t.marksComplete).toBe(false);
    expect(t.unmarkedSymbols).toEqual(["AAPL"]);
    expect(t.marketValue).toBe(0);
    expect(t.unrealizedPnl).toBe(0);
    expect(t.costBasis).toBe(1000);
    expect(t.totalPnl).toBe(20);
    expect(t.availableCash).toBe(89_900);
  });

  it("multiple symbols allocation and exposure", () => {
    const t = computePortfolioTotals({
      cash: 50_000,
      reserved: 0,
      feesPaid: 0,
      realizedPnl: 0,
      positions: [
        {
          symbol: "AAPL",
          quantity: 10,
          averageEntry: 100,
          costBasis: 1000,
          realizedPnl: 0,
          markPrice: 100,
        },
        {
          symbol: "MSFT",
          quantity: 5,
          averageEntry: 200,
          costBasis: 1000,
          realizedPnl: 0,
          markPrice: 200,
        },
      ],
    });
    expect(t.marketValue).toBe(2000);
    expect(t.equity).toBe(52_000);
    expect(t.allocation).toHaveLength(2);
    expect(t.exposure.netExposurePct).toBeCloseTo(3.84615385, 5);
  });

  it("zero position contributes nothing", () => {
    const t = computePortfolioTotals({
      cash: 100_000,
      reserved: 0,
      feesPaid: 0,
      realizedPnl: 50,
      positions: [
        {
          symbol: "AAPL",
          quantity: 0,
          averageEntry: 100,
          costBasis: 0,
          realizedPnl: 50,
          markPrice: 120,
        },
      ],
    });
    expect(t.marketValue).toBe(0);
    expect(t.equity).toBe(100_000);
    expect(t.realizedPnl).toBe(50);
    expect(t.totalPnl).toBe(50);
  });

  it("invariant: totalPnl = realized + unrealized", () => {
    const t = computePortfolioTotals({
      cash: 80_000,
      reserved: 0,
      feesPaid: 12.5,
      realizedPnl: 250,
      positions: [
        {
          symbol: "AAPL",
          quantity: 8,
          averageEntry: 50,
          costBasis: 400,
          realizedPnl: 100,
          markPrice: 55,
        },
      ],
    });
    expect(t.totalPnl).toBe(t.realizedPnl + t.unrealizedPnl);
    expect(t.feesPaid).toBe(12.5);
  });
});

describe("drawdown / growth / buckets", () => {
  it("insufficient history for single point", () => {
    const dd = computeDrawdown([{ asOf: "2026-01-01", equity: 100_000 }]);
    expect(dd.insufficientHistory).toBe(true);
    expect(dd.maxDrawdownPct).toBeNull();
  });

  it("computes peak and max drawdown", () => {
    const dd = computeDrawdown([
      { asOf: "2026-01-01", equity: 100_000 },
      { asOf: "2026-01-02", equity: 110_000 },
      { asOf: "2026-01-03", equity: 99_000 },
    ]);
    expect(dd.peakEquity).toBe(110_000);
    expect(dd.maxDrawdownPct).toBe(10);
    expect(dd.currentDrawdownPct).toBe(10);
    expect(dd.insufficientHistory).toBe(false);
  });

  it("growth and daily pnl", () => {
    expect(computeGrowthPct(110_000, 100_000)).toBe(10);
    expect(computeGrowthPct(null, 100_000)).toBeNull();
    expect(dailyPnlFromSnapshots(101_000, 100_000)).toBe(1000);
    expect(dailyPnlFromSnapshots(101_000, null)).toBeNull();
  });

  it("bucketSeries daily pnl deltas", () => {
    const series = bucketSeries(
      [
        { asOf: "2026-01-01", equity: 100 },
        { asOf: "2026-01-02", equity: 110 },
        { asOf: "2026-01-03", equity: 105 },
      ],
      "daily",
    );
    expect(series[0]?.pnl).toBe(0);
    expect(series[1]?.pnl).toBe(10);
    expect(series[2]?.pnl).toBe(-5);
  });
});

describe("FIFO trades + trade stats", () => {
  it("single buy then full close with fees", () => {
    const trades = matchFifoTrades([
      {
        symbol: "AAPL",
        side: "BUY",
        quantity: 10,
        price: 100,
        fee: 1,
        executedAt: "2026-01-01T10:00:00.000Z",
      },
      {
        symbol: "AAPL",
        side: "SELL",
        quantity: 10,
        price: 110,
        fee: 1,
        executedAt: "2026-01-02T10:00:00.000Z",
      },
    ]);
    expect(trades).toHaveLength(1);
    // (110-100)*10 - 1 - 1 = 98
    expect(trades[0]?.pnl).toBe(98);
    expect(trades[0]?.fees).toBe(2);
  });

  it("multiple buys then partial sell", () => {
    const trades = matchFifoTrades([
      {
        symbol: "AAPL",
        side: "BUY",
        quantity: 5,
        price: 100,
        fee: 0,
        executedAt: "2026-01-01T10:00:00.000Z",
      },
      {
        symbol: "AAPL",
        side: "BUY",
        quantity: 5,
        price: 120,
        fee: 0,
        executedAt: "2026-01-01T11:00:00.000Z",
      },
      {
        symbol: "AAPL",
        side: "SELL",
        quantity: 6,
        price: 130,
        fee: 0,
        executedAt: "2026-01-02T10:00:00.000Z",
      },
    ]);
    // FIFO: 5@100 then 1@120
    expect(trades).toHaveLength(2);
    expect(trades[0]?.pnl).toBe(150); // (130-100)*5
    expect(trades[1]?.pnl).toBe(10); // (130-120)*1
  });

  it("winning and losing positions across symbols", () => {
    const trades = matchFifoTrades([
      {
        symbol: "WIN",
        side: "BUY",
        quantity: 1,
        price: 10,
        fee: 0,
        executedAt: "2026-01-01T10:00:00.000Z",
      },
      {
        symbol: "WIN",
        side: "SELL",
        quantity: 1,
        price: 15,
        fee: 0,
        executedAt: "2026-01-02T10:00:00.000Z",
      },
      {
        symbol: "LOSE",
        side: "BUY",
        quantity: 1,
        price: 20,
        fee: 0,
        executedAt: "2026-01-01T10:00:00.000Z",
      },
      {
        symbol: "LOSE",
        side: "SELL",
        quantity: 1,
        price: 12,
        fee: 0,
        executedAt: "2026-01-02T10:00:00.000Z",
      },
    ]);
    const stats = computeTradeStats(trades);
    expect(stats.tradeCount).toBe(2);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(1);
    expect(stats.winRate).toBe(50);
    expect(stats.averageWin).toBe(5);
    expect(stats.averageLoss).toBe(8);
    expect(stats.profitFactor).toBe(0.625); // 5/8
    expect(stats.bestAsset).toBe("WIN");
    expect(stats.worstAsset).toBe("LOSE");
    expect(stats.longPct).toBe(100);
    expect(stats.shortPct).toBe(0);
    expect(stats.insufficientHistory).toBe(false);
  });

  it("insufficient history when no completed trades", () => {
    const stats = computeTradeStats([]);
    expect(stats.insufficientHistory).toBe(true);
    expect(stats.winRate).toBeNull();
    expect(stats.profitFactor).toBeNull();
  });

  it("profit factor null when only winners (undefined mathematically)", () => {
    const stats = computeTradeStats([
      {
        symbol: "AAPL",
        quantity: 1,
        entryPrice: 1,
        exitPrice: 2,
        pnl: 1,
        fees: 0,
        openedAt: "2026-01-01T00:00:00.000Z",
        closedAt: "2026-01-02T00:00:00.000Z",
        durationHours: 24,
      },
    ]);
    expect(stats.profitFactor).toBeNull();
    expect(stats.largestWin).toBe(1);
    expect(stats.largestLoss).toBeNull();
  });
});
