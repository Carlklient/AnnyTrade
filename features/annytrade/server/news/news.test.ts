import { describe, expect, it } from "vitest";

import { createDemoNewsProvider } from "./providers/demo";
import { createFinnhubNewsProvider } from "./providers/finnhub";

describe("demo news provider", () => {
  it("filters by symbol and never returns empty url", async () => {
    const p = createDemoNewsProvider();
    const all = await p.listNews({ limit: 20 });
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((a) => a.url.startsWith("http"))).toBe(true);
    expect(all.every((a) => a.headline.length > 0)).toBe(true);
    const aapl = await p.listNews({ symbol: "AAPL" });
    expect(aapl.every((a) => a.relatedSymbols.includes("AAPL"))).toBe(true);
  });

  it("handles unknown symbol without throwing", async () => {
    const p = createDemoNewsProvider();
    const out = await p.listNews({ symbol: "ZZZNOPE" });
    expect(out).toEqual([]);
  });
});

describe("finnhub news mapper resilience", () => {
  it("rejects malformed articles without url/headline", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          { id: 1, headline: "", url: "https://x.test", datetime: 1 },
          { id: 2, headline: "Ok", url: "not-a-url", datetime: 1 },
          {
            id: 3,
            headline: "Valid",
            url: "https://example.com/a",
            datetime: 1_700_000_000,
            summary: "x".repeat(500),
            related: "AAPL,MSFT",
          },
        ]),
        { status: 200 },
      )) as typeof fetch;
    try {
      const p = createFinnhubNewsProvider({ apiKey: "test-key" });
      const articles = await p.listNews({ symbol: "AAPL", limit: 10 });
      expect(articles).toHaveLength(1);
      expect(articles[0]!.summary!.endsWith("…")).toBe(true);
      expect(articles[0]!.summary!.length).toBeLessThanOrEqual(401);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
