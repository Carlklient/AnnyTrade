import { annytradeFetch } from "./client";
import type {
  Candle as DomainCandle,
  CandleInterval,
  DataFreshness,
  Instrument,
  MarketDataSourceMeta,
  MarketHoursStatus,
  Quote,
} from "../server/market/types";

export type MarketMetaResponse = {
  meta: MarketDataSourceMeta;
  credentials: {
    providerRequested: string;
    hasApiKey: boolean;
    activeProviderId: string;
    mode: "demo" | "live" | "test";
    credentialRequired: boolean;
  };
};

export type ChartCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export function toChartCandles(candles: DomainCandle[]): ChartCandle[] {
  return candles
    .map((c) => ({
      time: c.timestamp,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: c.volume != null ? Number(c.volume) : 0,
    }))
    .filter(
      (c) =>
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close),
    );
}

export function num(value: string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const marketClient = {
  meta() {
    return annytradeFetch<MarketMetaResponse>("/markets/meta", {
      method: "GET",
    });
  },

  search(q: string, limit = 12, signal?: AbortSignal) {
    const params = new URLSearchParams({ q, limit: String(limit) });
    return annytradeFetch<{ instruments: Instrument[] }>(
      `/markets/search?${params}`,
      { method: "GET", signal },
    );
  },

  instrument(symbol: string, signal?: AbortSignal) {
    return annytradeFetch<{ instrument: Instrument }>(
      `/markets/instruments/${encodeURIComponent(symbol)}`,
      { method: "GET", signal },
    );
  },

  quote(symbol: string, signal?: AbortSignal) {
    return annytradeFetch<{ quote: Quote }>(
      `/markets/quotes/${encodeURIComponent(symbol)}`,
      { method: "GET", signal },
    );
  },

  quotes(symbols: string[], signal?: AbortSignal) {
    const params = new URLSearchParams({ symbols: symbols.join(",") });
    return annytradeFetch<{ quotes: Quote[] }>(`/markets/quotes?${params}`, {
      method: "GET",
      signal,
    });
  },

  candles(
    input: {
      symbol: string;
      interval: CandleInterval;
      limit?: number;
      from?: string;
      to?: string;
    },
    signal?: AbortSignal,
  ) {
    const params = new URLSearchParams({
      symbol: input.symbol,
      interval: input.interval,
    });
    if (input.limit) params.set("limit", String(input.limit));
    if (input.from) params.set("from", input.from);
    if (input.to) params.set("to", input.to);
    return annytradeFetch<{
      candles: DomainCandle[];
      interval: CandleInterval;
      symbol: string;
    }>(`/markets/candles?${params}`, { method: "GET", signal });
  },

  status(market = "US", signal?: AbortSignal) {
    return annytradeFetch<{ status: MarketHoursStatus }>(
      `/markets/status?market=${encodeURIComponent(market)}`,
      { method: "GET", signal },
    );
  },
};

export function freshnessLabel(f: DataFreshness): string {
  switch (f) {
    case "LIVE":
      return "LIVE";
    case "DELAYED":
      return "DELAYED";
    case "STALE":
      return "STALE";
    case "DEMO":
      return "DEMO";
    default:
      return "UNAVAILABLE";
  }
}

export type {
  Instrument,
  Quote,
  DomainCandle as MarketCandle,
  DataFreshness,
  CandleInterval,
};
