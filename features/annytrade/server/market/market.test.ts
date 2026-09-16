import { beforeEach, describe, expect, it } from "vitest";

import { cacheClear, cached, cacheGet, MarketCacheTTL } from "./cache";
import {
  getMarketCredentialStatus,
  getMarketDataProvider,
  resetMarketDataProviderCache,
} from "./factory";
import {
  decimalString,
  isValidOhlc,
  normalizeSymbol,
  toIsoTimestamp,
} from "./normalize";
import {
  createDemoMarketDataProvider,
  createTestMarketDataProvider,
} from "./providers/demo";
import {
  resetProviderRateLimits,
  providerRateLimit,
} from "./provider-rate-limit";
import { marketDataService } from "./service";
import { MarketDataError } from "./types";

describe("normalize", () => {
  it("normalizes symbols", () => {
    expect(normalizeSymbol(" aapl ")).toBe("AAPL");
  });

  it("decimalString rejects NaN", () => {
    expect(decimalString(Number.NaN)).toBeNull();
    expect(decimalString(12.5)).toBe("12.5");
  });

  it("validates OHLC", () => {
    expect(isValidOhlc({ open: "10", high: "12", low: "9", close: "11" })).toBe(
      true,
    );
    expect(isValidOhlc({ open: "10", high: "9", low: "8", close: "11" })).toBe(
      false,
    );
  });

  it("parses timestamps", () => {
    expect(toIsoTimestamp(1_700_000_000)?.startsWith("2023")).toBe(true);
    expect(toIsoTimestamp("not-a-date")).toBeNull();
  });
});

describe("cache + dedupe", () => {
  beforeEach(() => {
    cacheClear();
  });

  it("caches values for TTL", async () => {
    let calls = 0;
    const a = await cached("k", 10_000, async () => {
      calls += 1;
      return "x";
    });
    const b = await cached("k", 10_000, async () => {
      calls += 1;
      return "y";
    });
    expect(a).toBe("x");
    expect(b).toBe("x");
    expect(calls).toBe(1);
    expect(cacheGet<string>("k")).toBe("x");
  });

  it("dedupes in-flight requests", async () => {
    let calls = 0;
    const p1 = cached("inflight", MarketCacheTTL.quote, async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return 1;
    });
    const p2 = cached("inflight", MarketCacheTTL.quote, async () => {
      calls += 1;
      return 2;
    });
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(calls).toBe(1);
  });
});

describe("provider rate limit", () => {
  beforeEach(() => resetProviderRateLimits());

  it("blocks after limit", () => {
    expect(providerRateLimit({ key: "t", limit: 2, windowMs: 60_000 }).ok).toBe(
      true,
    );
    expect(providerRateLimit({ key: "t", limit: 2, windowMs: 60_000 }).ok).toBe(
      true,
    );
    const third = providerRateLimit({ key: "t", limit: 2, windowMs: 60_000 });
    expect(third.ok).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("test/demo provider", () => {
  it("searches instruments", async () => {
    const p = createTestMarketDataProvider();
    const hits = await p.searchInstruments({ query: "apple", limit: 5 });
    expect(hits.some((h) => h.symbol === "AAPL")).toBe(true);
    expect(p.meta.mode).toBe("test");
    expect(p.meta.freshnessDefault).toBe("DEMO");
  });

  it("returns quotes and candles", async () => {
    const p = createDemoMarketDataProvider();
    const q = await p.getQuote("AAPL");
    expect(q.freshness).toBe("DEMO");
    expect(q.last).toBeTruthy();
    const candles = await p.getCandles({
      symbol: "AAPL",
      interval: "1h",
      limit: 10,
    });
    expect(candles).toHaveLength(10);
  });

  it("404s unknown symbols", async () => {
    const p = createDemoMarketDataProvider();
    await expect(p.getQuote("ZZZZZ")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("batch quotes", async () => {
    const p = createDemoMarketDataProvider();
    const quotes = await p.getQuotes(["AAPL", "MSFT"]);
    expect(quotes).toHaveLength(2);
  });
});

describe("marketDataService with test provider", () => {
  beforeEach(() => {
    cacheClear();
    resetMarketDataProviderCache();
    process.env.ANNYTRADE_MARKET_DATA_PROVIDER = "test";
    delete process.env.ANNYTRADE_MARKET_DATA_API_KEY;
  });

  it("resolves search, instrument, quote, candles, status", async () => {
    const provider = getMarketDataProvider();
    expect(provider.meta.providerId).toBe("test");

    const hits = await marketDataService.search({ query: "MSFT", limit: 5 });
    expect(hits[0]?.symbol).toBe("MSFT");

    const inst = await marketDataService.instrument("msft");
    expect(inst.symbol).toBe("MSFT");

    const quote = await marketDataService.quote("MSFT");
    expect(quote.freshness).toBe("DEMO");

    const batch = await marketDataService.quotes(["AAPL", "MSFT"]);
    expect(batch.length).toBe(2);

    const candles = await marketDataService.candles({
      symbol: "AAPL",
      interval: "1d",
      limit: 5,
    });
    expect(candles.length).toBe(5);

    const status = await marketDataService.status("US");
    expect(status.freshness).toBe("DEMO");

    const creds = getMarketCredentialStatus();
    expect(creds.hasApiKey).toBe(false);
    expect(creds.credentialRequired).toBe(false); // test mode, not demo fallback
  });

  it("validates batch size", async () => {
    const many = Array.from({ length: 26 }, (_, i) => `S${i}`);
    expect(() => marketDataService.quotes(many)).toThrow(MarketDataError);
  });
});

describe("factory without credentials", () => {
  beforeEach(() => {
    resetMarketDataProviderCache();
    process.env.ANNYTRADE_MARKET_DATA_PROVIDER = "demo";
    delete process.env.ANNYTRADE_MARKET_DATA_API_KEY;
  });

  it("stays on demo when finnhub requested without key", () => {
    process.env.ANNYTRADE_MARKET_DATA_PROVIDER = "finnhub";
    const p = getMarketDataProvider();
    expect(p.meta.mode).toBe("demo");
    expect(getMarketCredentialStatus().credentialRequired).toBe(true);
  });
});
