import type { MarketDataProvider } from "../provider";
import type {
  Candle,
  CandleInterval,
  Instrument,
  MarketHoursStatus,
  Quote,
  SessionPhase,
} from "../types";
import { MarketDataError } from "../types";
import {
  decimalString,
  isValidOhlc,
  normalizeSymbol,
  toIsoTimestamp,
} from "../normalize";
import { providerRateLimit } from "../provider-rate-limit";

type FinnhubConfig = {
  apiKey: string;
  baseUrl?: string;
};

const INTERVAL_MAP: Partial<Record<CandleInterval, string>> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "1d": "D",
  "1w": "W",
};

async function finnhubGet<T>(
  path: string,
  apiKey: string,
  baseUrl: string,
): Promise<T> {
  const limited = providerRateLimit({
    key: "finnhub",
    limit: 55,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    throw new MarketDataError(
      "RATE_LIMITED",
      `Provider rate limit; retry in ${limited.retryAfterSec}s`,
      429,
    );
  }

  const url = new URL(path, baseUrl);
  url.searchParams.set("token", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) {
      throw new MarketDataError(
        "PROVIDER_AUTH",
        "Market data provider authentication failed",
        res.status,
      );
    }
    if (res.status === 429) {
      throw new MarketDataError(
        "RATE_LIMITED",
        "Market data provider rate limited",
        429,
      );
    }
    if (!res.ok) {
      throw new MarketDataError(
        "PROVIDER_ERROR",
        `Market data provider error (${res.status})`,
        502,
      );
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof MarketDataError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new MarketDataError("TIMEOUT", "Market data provider timeout", 504);
    }
    throw new MarketDataError(
      "PROVIDER_ERROR",
      "Market data provider request failed",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

function mapType(type: string | undefined): Instrument["assetClass"] {
  const t = (type ?? "").toLowerCase();
  if (t.includes("etf")) return "etf";
  if (t.includes("forex") || t.includes("fx")) return "forex";
  if (t.includes("crypto")) return "crypto";
  if (t.includes("index")) return "index";
  return "equity";
}

function usSessionPhase(now = new Date()): SessionPhase {
  // Rough NYSE hours in America/New_York — refined by provider profile when available.
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      weekday: "short",
    });
    const parts = fmt.formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
    if (weekday === "Sat" || weekday === "Sun") return "closed";
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const mins = hour * 60 + minute;
    if (mins >= 4 * 60 && mins < 9 * 60 + 30) return "premarket";
    if (mins >= 9 * 60 + 30 && mins < 16 * 60) return "regular";
    if (mins >= 16 * 60 && mins < 20 * 60) return "afterhours";
    return "closed";
  } catch {
    return "unknown";
  }
}

/**
 * Finnhub REST adapter. Activated only when API key is configured.
 * Free-tier quotes are typically delayed — freshness is DELAYED, never LIVE
 * unless entitlement is explicitly upgraded later.
 */
export function createFinnhubMarketDataProvider(
  config: FinnhubConfig,
): MarketDataProvider {
  const baseUrl = config.baseUrl ?? "https://finnhub.io/api/v1/";
  const apiKey = config.apiKey;

  return {
    meta: {
      mode: "live",
      providerId: "finnhub",
      providerLabel: "Finnhub",
      freshnessDefault: "DELAYED",
      supportedAssetClasses: ["equity", "etf", "forex"],
      supportsRealtime: false,
      notes:
        "Finnhub REST quotes/candles. Free-tier data is treated as DELAYED. WebSocket streaming not enabled in Phase 2 without dedicated entitlement review.",
    },

    async searchInstruments({ query, limit = 12 }) {
      const q = query.trim();
      if (q.length < 1) return [];
      const data = await finnhubGet<{
        result?: Array<{
          symbol?: string;
          description?: string;
          type?: string;
          displaySymbol?: string;
        }>;
      }>(`search?q=${encodeURIComponent(q)}`, apiKey, baseUrl);

      return (data.result ?? [])
        .filter((r) => r.symbol)
        .slice(0, Math.min(limit, 25))
        .map((r) => {
          const symbol = normalizeSymbol(r.symbol!);
          return {
            id: `finnhub:${symbol}`,
            symbol,
            displaySymbol: r.displaySymbol ?? symbol,
            name: r.description ?? symbol,
            assetClass: mapType(r.type),
            exchange: null,
            currency: null,
            status: "active" as const,
            timezone: "America/New_York",
          };
        });
    },

    async getInstrument(symbol) {
      const sym = normalizeSymbol(symbol);
      const profile = await finnhubGet<{
        name?: string;
        ticker?: string;
        exchange?: string;
        currency?: string;
        finnhubIndustry?: string;
      }>(`stock/profile2?symbol=${encodeURIComponent(sym)}`, apiKey, baseUrl);

      if (!profile?.ticker && !profile?.name) {
        // Forex symbols often lack stock profile — fall back to search hit
        const hits = await this.searchInstruments({ query: sym, limit: 5 });
        return hits.find((h) => h.symbol === sym) ?? null;
      }

      return {
        id: `finnhub:${sym}`,
        symbol: sym,
        displaySymbol: sym,
        name: profile.name ?? sym,
        assetClass: "equity",
        exchange: profile.exchange ?? null,
        currency: profile.currency ?? "USD",
        status: "active",
        timezone: "America/New_York",
      };
    },

    async getQuote(symbol) {
      const sym = normalizeSymbol(symbol);
      const data = await finnhubGet<{
        c?: number;
        d?: number;
        dp?: number;
        h?: number;
        l?: number;
        o?: number;
        pc?: number;
        t?: number;
      }>(`quote?symbol=${encodeURIComponent(sym)}`, apiKey, baseUrl);

      if (data.c === undefined || (data.c === 0 && data.t === 0)) {
        throw new MarketDataError("NOT_FOUND", `No quote for ${sym}`, 404);
      }

      const last = decimalString(data.c);
      if (!last) {
        throw new MarketDataError(
          "INVALID_PAYLOAD",
          "Invalid quote payload",
          502,
        );
      }

      return {
        instrumentId: `finnhub:${sym}`,
        symbol: sym,
        bid: null,
        ask: null,
        last,
        open: decimalString(data.o),
        high: decimalString(data.h),
        low: decimalString(data.l),
        previousClose: decimalString(data.pc),
        change: decimalString(data.d),
        changePercent: decimalString(data.dp),
        volume: null,
        timestamp: toIsoTimestamp(data.t),
        marketStatus: usSessionPhase(),
        freshness: "DELAYED",
        delayMinutes: 15,
      } satisfies Quote;
    },

    async getQuotes(symbols) {
      const unique = [...new Set(symbols.map(normalizeSymbol))].slice(0, 25);
      const out: Quote[] = [];
      for (const sym of unique) {
        try {
          out.push(await this.getQuote(sym));
        } catch (error) {
          if (error instanceof MarketDataError && error.code === "NOT_FOUND") {
            continue;
          }
          throw error;
        }
      }
      return out;
    },

    async getCandles({ symbol, interval, from, to, limit = 120 }) {
      const mapped = INTERVAL_MAP[interval];
      if (!mapped) {
        throw new MarketDataError(
          "UNSUPPORTED_INTERVAL",
          `Interval ${interval} is not supported by Finnhub adapter`,
          400,
        );
      }
      const sym = normalizeSymbol(symbol);
      const capped = Math.min(Math.max(limit, 1), 500);
      const toSec = Math.floor((to ?? new Date()).getTime() / 1000);
      const span: Record<string, number> = {
        "1": 60 * capped,
        "5": 5 * 60 * capped,
        "15": 15 * 60 * capped,
        "30": 30 * 60 * capped,
        "60": 60 * 60 * capped,
        D: 24 * 60 * 60 * capped,
        W: 7 * 24 * 60 * 60 * capped,
      };
      const fromSec =
        Math.floor((from?.getTime() ?? 0) / 1000) ||
        toSec - (span[mapped] ?? 24 * 60 * 60 * capped);

      const data = await finnhubGet<{
        s?: string;
        t?: number[];
        o?: number[];
        h?: number[];
        l?: number[];
        c?: number[];
        v?: number[];
      }>(
        `stock/candle?symbol=${encodeURIComponent(sym)}&resolution=${mapped}&from=${fromSec}&to=${toSec}`,
        apiKey,
        baseUrl,
      );

      if (data.s !== "ok" || !data.t?.length) {
        return [];
      }

      const candles: Candle[] = [];
      for (let i = 0; i < data.t.length; i++) {
        const candle = {
          timestamp: toIsoTimestamp(data.t[i])!,
          open: decimalString(data.o?.[i])!,
          high: decimalString(data.h?.[i])!,
          low: decimalString(data.l?.[i])!,
          close: decimalString(data.c?.[i])!,
          volume: decimalString(data.v?.[i]),
        };
        if (
          candle.timestamp &&
          candle.open &&
          candle.high &&
          candle.low &&
          candle.close &&
          isValidOhlc(candle)
        ) {
          candles.push(candle);
        }
      }
      return candles.slice(-capped);
    },

    async getMarketStatus(market = "US"): Promise<MarketHoursStatus> {
      const status = usSessionPhase();
      return {
        market,
        status,
        opensAt: null,
        closesAt: null,
        timezone: "America/New_York",
        freshness: "DELAYED",
      };
    },
  };
}
