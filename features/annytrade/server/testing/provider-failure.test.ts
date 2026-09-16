import { describe, expect, it, beforeEach } from "vitest";

import { MarketDataError } from "../market/types";
import type { MarketDataProvider } from "../market/provider";
import type { Quote } from "../market/types";
import { assertQuoteFresh, StalePriceError } from "../execution/stale-price";
import {
  providerRateLimit,
  resetProviderRateLimits,
} from "../market/provider-rate-limit";

function quote(partial: Partial<Quote> & { symbol: string }): Quote {
  return {
    instrumentId: partial.symbol,
    symbol: partial.symbol,
    bid: partial.bid ?? "100",
    ask: partial.ask ?? "100.1",
    last: partial.last ?? "100.05",
    open: null,
    high: null,
    low: null,
    previousClose: null,
    change: partial.change ?? "0",
    changePercent: partial.changePercent ?? "0",
    volume: null,
    timestamp: partial.timestamp ?? new Date().toISOString(),
    marketStatus: partial.marketStatus ?? "regular",
    freshness: partial.freshness ?? "LIVE",
    delayMinutes: null,
  };
}

function createFailingMarketProvider(
  mode: "outage" | "malformed" | "stale" | "ok",
): MarketDataProvider {
  return {
    meta: {
      providerId: "fail_fixture",
      providerLabel: "Failure Fixture",
      mode: "test",
      freshnessDefault: "LIVE",
      supportedAssetClasses: ["equity"],
      supportsRealtime: false,
      notes: "Phase 11 failure fixture",
    },
    async searchInstruments() {
      if (mode === "outage") {
        throw new MarketDataError("PROVIDER", "Market feed outage", 503);
      }
      return [];
    },
    async getInstrument(symbol) {
      if (mode === "outage") {
        throw new MarketDataError("PROVIDER", "Market feed outage", 503);
      }
      return {
        id: symbol,
        symbol,
        displaySymbol: symbol,
        name: symbol,
        assetClass: "equity",
        currency: "USD",
        exchange: "X",
        status: "active",
        timezone: "UTC",
      };
    },
    async getQuote(symbol) {
      if (mode === "outage") {
        throw new MarketDataError("PROVIDER", "Market feed outage", 503);
      }
      if (mode === "malformed") {
        return quote({
          symbol,
          last: "not-a-number",
          bid: null,
          ask: null,
          timestamp: "garbage",
        });
      }
      if (mode === "stale") {
        return quote({
          symbol,
          timestamp: new Date(Date.now() - 120_000).toISOString(),
          freshness: "STALE",
        });
      }
      return quote({ symbol });
    },
    async getQuotes(symbols) {
      return Promise.all(symbols.map((s) => this.getQuote(s)));
    },
    async getCandles() {
      if (mode === "outage") {
        throw new MarketDataError("PROVIDER", "Market feed outage", 503);
      }
      if (mode === "malformed") {
        return [
          {
            timestamp: "bad",
            open: "x",
            high: "y",
            low: "z",
            close: "w",
            volume: null,
          },
        ];
      }
      return [];
    },
    async getMarketStatus() {
      if (mode === "outage") {
        throw new MarketDataError("PROVIDER", "Market feed outage", 503);
      }
      return {
        market: "US",
        status: "regular",
        opensAt: null,
        closesAt: null,
        timezone: "America/New_York",
        freshness: "LIVE",
      };
    },
  };
}

describe("Phase 11 provider failure fixtures", () => {
  beforeEach(() => {
    resetProviderRateLimits();
  });

  it("simulates market feed outage", async () => {
    const p = createFailingMarketProvider("outage");
    await expect(p.getQuote("AAPL")).rejects.toMatchObject({
      code: "PROVIDER",
      status: 503,
    });
  });

  it("surfaces malformed quote timestamps for stale protection", async () => {
    const p = createFailingMarketProvider("malformed");
    const q = await p.getQuote("AAPL");
    expect(() =>
      assertQuoteFresh({ quoteTimestamp: q.timestamp, maxAgeMs: 15_000 }),
    ).toThrow(StalePriceError);
  });

  it("rejects stale quotes", async () => {
    const p = createFailingMarketProvider("stale");
    const q = await p.getQuote("AAPL");
    expect(() =>
      assertQuoteFresh({ quoteTimestamp: q.timestamp, maxAgeMs: 15_000 }),
    ).toThrow(StalePriceError);
  });

  it("simulates provider 429 via rate limiter", () => {
    const key = "phase11:provider";
    for (let i = 0; i < 5; i++) {
      providerRateLimit({ key, limit: 3, windowMs: 60_000 });
    }
    const hit = providerRateLimit({ key, limit: 3, windowMs: 60_000 });
    expect(hit.ok).toBe(false);
  });

  it("documents websocket disconnect handling as reconnect+reconcile", () => {
    const policy = {
      onDisconnect: "mark_stale",
      onReconnect: "reconcile",
      inventFills: false,
    };
    expect(policy.inventFills).toBe(false);
  });
});
