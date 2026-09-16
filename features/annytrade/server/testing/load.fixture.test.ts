import { describe, expect, it } from "vitest";

import { createTestBrokerProvider } from "../broker/providers/test";
import { createTestMarketDataProvider } from "../market/providers/demo";
import { rateLimitAsync, resetRateLimitForTests } from "../security/rate-limit";

/**
 * Load tests use internal fixtures only — never third-party APIs.
 */
describe("Phase 11 load fixtures (internal only)", () => {
  it("handles concurrent quote reads against demo fixture", async () => {
    const p = createTestMarketDataProvider();
    const started = Date.now();
    const quotes = await Promise.all(
      Array.from({ length: 100 }, () => p.getQuote("AAPL")),
    );
    expect(quotes).toHaveLength(100);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("handles concurrent watchlist-sized quote batches", async () => {
    const p = createTestMarketDataProvider();
    const symbols = ["AAPL", "MSFT", "GOOG", "AMZN"];
    const batches = await Promise.all(
      Array.from({ length: 40 }, () => p.getQuotes(symbols)),
    );
    expect(batches).toHaveLength(40);
    expect(batches.every((b) => b.length >= 1)).toBe(true);
  });

  it("handles concurrent paper-broker order submissions with unique client ids", async () => {
    const broker = createTestBrokerProvider();
    const creds = { apiKeyId: "load", apiSecretKey: "load" };
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        broker.submitOrder(creds, {
          clientOrderId: `load-${i}`,
          symbol: "AAPL",
          side: "BUY",
          orderType: "MARKET",
          quantity: 1,
          limitPrice: 10,
        }),
      ),
    );
    expect(results).toHaveLength(50);
    const ids = new Set(results.map((r) => r.brokerOrderId));
    expect(ids.size).toBe(50);
  });

  it("rate limiter withstands burst without throwing", async () => {
    resetRateLimitForTests();
    const outcomes = await Promise.all(
      Array.from({ length: 200 }, () =>
        rateLimitAsync({
          key: "load:api:shared",
          limit: 30,
          windowMs: 60_000,
        }),
      ),
    );
    expect(outcomes.some((o) => o.ok)).toBe(true);
    expect(outcomes.some((o) => !o.ok)).toBe(true);
  });
});
