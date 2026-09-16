import type { MarketDataProvider } from "./provider";
import {
  createDemoMarketDataProvider,
  createTestMarketDataProvider,
} from "./providers/demo";
import { createFinnhubMarketDataProvider } from "./providers/finnhub";

let cached: MarketDataProvider | null = null;

export function resetMarketDataProviderCache() {
  cached = null;
}

export function getMarketDataProvider(): MarketDataProvider {
  if (cached) return cached;

  const requested = (
    process.env.ANNYTRADE_MARKET_DATA_PROVIDER ?? "demo"
  ).toLowerCase();
  const apiKey = process.env.ANNYTRADE_MARKET_DATA_API_KEY;

  if (requested === "test") {
    cached = createTestMarketDataProvider();
    return cached;
  }

  if (requested === "finnhub") {
    if (!apiKey) {
      console.warn(
        "[annytrade] Finnhub selected but ANNYTRADE_MARKET_DATA_API_KEY missing — using DEMO provider",
      );
      cached = createDemoMarketDataProvider();
      return cached;
    }
    cached = createFinnhubMarketDataProvider({ apiKey });
    return cached;
  }

  // Auto: use Finnhub only when key present and provider unset/auto
  if (
    (requested === "auto" || requested === "demo") &&
    apiKey &&
    requested === "auto"
  ) {
    cached = createFinnhubMarketDataProvider({ apiKey });
    return cached;
  }

  if (apiKey && requested === "live") {
    cached = createFinnhubMarketDataProvider({ apiKey });
    return cached;
  }

  cached = createDemoMarketDataProvider();
  return cached;
}

export function getMarketCredentialStatus(): {
  providerRequested: string;
  hasApiKey: boolean;
  activeProviderId: string;
  mode: "demo" | "live" | "test";
  credentialRequired: boolean;
} {
  const provider = getMarketDataProvider();
  const requested = process.env.ANNYTRADE_MARKET_DATA_PROVIDER ?? "demo";
  const hasApiKey = Boolean(process.env.ANNYTRADE_MARKET_DATA_API_KEY);
  return {
    providerRequested: requested,
    hasApiKey,
    activeProviderId: provider.meta.providerId,
    mode: provider.meta.mode,
    credentialRequired: provider.meta.mode === "demo" && !hasApiKey,
  };
}
