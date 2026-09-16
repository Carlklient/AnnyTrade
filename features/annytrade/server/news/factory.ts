import type { NewsProvider } from "./provider";
import {
  createDemoNewsProvider,
  createTestNewsProvider,
} from "./providers/demo";
import { createFinnhubNewsProvider } from "./providers/finnhub";

let cached: NewsProvider | null = null;

export function resetNewsProviderCache() {
  cached = null;
}

function resolveApiKey(): string | undefined {
  return (
    process.env.ANNYTRADE_NEWS_API_KEY ||
    process.env.ANNYTRADE_MARKET_DATA_API_KEY ||
    undefined
  );
}

export function getNewsProvider(): NewsProvider {
  if (cached) return cached;
  const requested = (
    process.env.ANNYTRADE_NEWS_PROVIDER ??
    process.env.ANNYTRADE_MARKET_DATA_PROVIDER ??
    "demo"
  ).toLowerCase();
  const apiKey = resolveApiKey();

  if (requested === "test") {
    cached = createTestNewsProvider();
    return cached;
  }
  if (requested === "finnhub" || requested === "live") {
    if (!apiKey) {
      console.warn(
        "[annytrade] News Finnhub selected but API key missing — using DEMO news",
      );
      cached = createDemoNewsProvider();
      return cached;
    }
    cached = createFinnhubNewsProvider({ apiKey });
    return cached;
  }
  if (requested === "auto" && apiKey) {
    cached = createFinnhubNewsProvider({ apiKey });
    return cached;
  }
  cached = createDemoNewsProvider();
  return cached;
}
