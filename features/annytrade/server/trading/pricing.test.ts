import { describe, expect, it } from "vitest";

import {
  applyPaperSlippage,
  isPaperSessionTradable,
  paperFeeAmount,
  paperMarketFillQty,
} from "./pricing";
import type { Quote } from "../market/types";

function quote(status: Quote["marketStatus"] = "regular"): Quote {
  return {
    instrumentId: "eq:AAPL",
    symbol: "AAPL",
    bid: "100",
    ask: "100.1",
    last: "100.05",
    open: null,
    high: null,
    low: null,
    previousClose: null,
    change: null,
    changePercent: null,
    volume: null,
    timestamp: new Date().toISOString(),
    marketStatus: status,
    freshness: "DEMO",
    delayMinutes: null,
  };
}

describe("paper pricing realism", () => {
  it("applies adverse slippage by side", () => {
    const prev = process.env.ANNYTRADE_PAPER_SLIPPAGE_BPS;
    process.env.ANNYTRADE_PAPER_SLIPPAGE_BPS = "10";
    expect(applyPaperSlippage(100, "BUY")).toBeCloseTo(100.1, 6);
    expect(applyPaperSlippage(100, "SELL")).toBeCloseTo(99.9, 6);
    if (prev === undefined) delete process.env.ANNYTRADE_PAPER_SLIPPAGE_BPS;
    else process.env.ANNYTRADE_PAPER_SLIPPAGE_BPS = prev;
  });

  it("computes fee from bps", () => {
    const prev = process.env.ANNYTRADE_PAPER_FEE_BPS;
    process.env.ANNYTRADE_PAPER_FEE_BPS = "10";
    expect(paperFeeAmount(10_000)).toBe(10);
    if (prev === undefined) delete process.env.ANNYTRADE_PAPER_FEE_BPS;
    else process.env.ANNYTRADE_PAPER_FEE_BPS = prev;
  });

  it("respects session only when flag enabled", () => {
    const prev = process.env.ANNYTRADE_PAPER_RESPECT_SESSION;
    delete process.env.ANNYTRADE_PAPER_RESPECT_SESSION;
    expect(isPaperSessionTradable(quote("closed"))).toBe(true);
    process.env.ANNYTRADE_PAPER_RESPECT_SESSION = "true";
    expect(isPaperSessionTradable(quote("closed"))).toBe(false);
    expect(isPaperSessionTradable(quote("regular"))).toBe(true);
    if (prev === undefined) delete process.env.ANNYTRADE_PAPER_RESPECT_SESSION;
    else process.env.ANNYTRADE_PAPER_RESPECT_SESSION = prev;
  });

  it("caps market fill qty when partial frac set", () => {
    const prev = process.env.ANNYTRADE_PAPER_PARTIAL_MAX_FRAC;
    process.env.ANNYTRADE_PAPER_PARTIAL_MAX_FRAC = "0.5";
    expect(paperMarketFillQty(10)).toBe(5);
    delete process.env.ANNYTRADE_PAPER_PARTIAL_MAX_FRAC;
    expect(paperMarketFillQty(10)).toBe(10);
    if (prev !== undefined) process.env.ANNYTRADE_PAPER_PARTIAL_MAX_FRAC = prev;
  });
});
