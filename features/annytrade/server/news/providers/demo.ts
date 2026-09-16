import type { NewsProvider } from "../provider";
import type { ListNewsInput, NewsArticle } from "../types";

const DEMO: Omit<NewsArticle, "id" | "freshness">[] = [
  {
    headline: "US equities mixed as traders weigh rate path clues",
    source: "AnnyTrade Demo Wire",
    publishedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    url: "https://example.com/news/demo-equities-mixed",
    summary: "Demo headline for paper desk context, not a live wire.",
    relatedSymbols: ["AAPL", "MSFT", "SPY"],
    imageUrl: null,
    category: "equities",
  },
  {
    headline: "Dollar softens ahead of inflation prints",
    source: "AnnyTrade Demo Wire",
    publishedAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
    url: "https://example.com/news/demo-dollar",
    summary: "Illustrative FX note for calendar pairing demos.",
    relatedSymbols: ["EURUSD", "DXY"],
    imageUrl: null,
    category: "forex",
  },
  {
    headline: "Crude oil futures steady on inventory watch",
    source: "AnnyTrade Demo Wire",
    publishedAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
    url: "https://example.com/news/demo-oil",
    summary: null,
    relatedSymbols: ["USOIL", "XOM"],
    imageUrl: null,
    category: "commodities",
  },
  {
    headline: "Bitcoin consolidates after weekend volatility",
    source: "AnnyTrade Demo Wire",
    publishedAt: new Date(Date.now() - 12 * 3600_000).toISOString(),
    url: "https://example.com/news/demo-btc",
    summary: "Demo crypto blurb, link only, no scraped article body.",
    relatedSymbols: ["BTCUSD", "ETHUSD"],
    imageUrl: null,
    category: "crypto",
  },
];

function filterArticles(
  articles: NewsArticle[],
  input: ListNewsInput,
): NewsArticle[] {
  let out = articles;
  if (input.symbol) {
    const sym = input.symbol.toUpperCase();
    out = out.filter((a) =>
      a.relatedSymbols.some((s) => s.toUpperCase() === sym),
    );
  }
  if (input.category) {
    const cat = input.category.toLowerCase();
    out = out.filter((a) => (a.category ?? "").toLowerCase() === cat);
  }
  if (input.from) {
    const from = input.from.getTime();
    out = out.filter((a) => Date.parse(a.publishedAt) >= from);
  }
  if (input.to) {
    const to = input.to.getTime();
    out = out.filter((a) => Date.parse(a.publishedAt) <= to);
  }
  const limit = Math.min(input.limit ?? 40, 100);
  return out.slice(0, limit);
}

export function createDemoNewsProvider(): NewsProvider {
  return {
    meta: {
      providerId: "demo-news",
      providerLabel: "AnnyTrade Demo News",
      mode: "demo",
      freshnessDefault: "DEMO",
      notes:
        "Synthetic headlines for development when no news credential is set.",
    },
    async listNews(input) {
      const articles: NewsArticle[] = DEMO.map((a, i) => ({
        ...a,
        id: `demo-news-${i}-${a.relatedSymbols[0] ?? "GEN"}`,
        freshness: "DEMO",
        publishedAt: new Date(
          Date.now() - (i + 1) * 2 * 3600_000,
        ).toISOString(),
      }));
      return filterArticles(articles, input);
    },
  };
}

export function createTestNewsProvider(): NewsProvider {
  const demo = createDemoNewsProvider();
  return {
    ...demo,
    meta: {
      ...demo.meta,
      providerId: "test-news",
      providerLabel: "AnnyTrade Test News",
      mode: "test",
    },
  };
}
