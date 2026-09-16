import { MarketCacheTTL, cached } from "./cache";
import { getMarketCredentialStatus, getMarketDataProvider } from "./factory";
import type { GetCandlesInput, SearchInstrumentsInput } from "./provider";
import { normalizeSymbol } from "./normalize";
import type { CandleInterval } from "./types";
import { MarketDataError } from "./types";

export const marketDataService = {
  meta() {
    return getMarketDataProvider().meta;
  },

  credentialStatus() {
    return getMarketCredentialStatus();
  },

  search(input: SearchInstrumentsInput) {
    const q = input.query.trim();
    if (q.length < 1) return Promise.resolve([]);
    if (q.length > 64) {
      throw new MarketDataError("VALIDATION", "Query too long", 400);
    }
    const limit = Math.min(input.limit ?? 12, 25);
    return cached(
      `search:${q.toLowerCase()}:${limit}`,
      MarketCacheTTL.search,
      () => getMarketDataProvider().searchInstruments({ query: q, limit }),
    );
  },

  instrument(symbol: string) {
    const sym = normalizeSymbol(symbol);
    return cached(
      `instrument:${sym}`,
      MarketCacheTTL.instrumentMeta,
      async () => {
        const instrument = await getMarketDataProvider().getInstrument(sym);
        if (!instrument) {
          throw new MarketDataError(
            "NOT_FOUND",
            `Instrument ${sym} not found`,
            404,
          );
        }
        return instrument;
      },
    );
  },

  quote(symbol: string) {
    const sym = normalizeSymbol(symbol);
    return cached(`quote:${sym}`, MarketCacheTTL.quote, () =>
      getMarketDataProvider().getQuote(sym),
    );
  },

  quotes(symbols: string[]) {
    const unique = [...new Set(symbols.map(normalizeSymbol))].filter(Boolean);
    if (unique.length === 0) return Promise.resolve([]);
    if (unique.length > 25) {
      throw new MarketDataError("VALIDATION", "Too many symbols (max 25)", 400);
    }
    const key = `quotes:${unique.slice().sort().join(",")}`;
    return cached(key, MarketCacheTTL.quote, () =>
      getMarketDataProvider().getQuotes(unique),
    );
  },

  candles(input: GetCandlesInput) {
    const sym = normalizeSymbol(input.symbol);
    const interval = input.interval;
    const limit = Math.min(Math.max(input.limit ?? 120, 1), 500);
    const ttl =
      interval === "1d" || interval === "1w"
        ? MarketCacheTTL.candlesDaily
        : MarketCacheTTL.candlesIntraday;
    const key = `candles:${sym}:${interval}:${limit}:${input.from?.toISOString() ?? ""}:${input.to?.toISOString() ?? ""}`;
    return cached(key, ttl, () =>
      getMarketDataProvider().getCandles({ ...input, symbol: sym, limit }),
    );
  },

  status(market = "US") {
    return cached(`status:${market}`, MarketCacheTTL.marketStatus, () =>
      getMarketDataProvider().getMarketStatus(market),
    );
  },
};

export const SUPPORTED_INTERVALS: CandleInterval[] = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "1d",
  "1w",
];
