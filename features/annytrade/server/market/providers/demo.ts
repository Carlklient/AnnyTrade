import type { MarketDataProvider } from "../provider";
import type {
  Candle,
  CandleInterval,
  Instrument,
  MarketHoursStatus,
  Quote,
} from "../types";
import { MarketDataError } from "../types";
import { decimalString, isValidOhlc, normalizeSymbol } from "../normalize";

const UNIVERSE: Instrument[] = [
  {
    id: "eq:AAPL",
    symbol: "AAPL",
    displaySymbol: "AAPL",
    name: "Apple Inc.",
    assetClass: "equity",
    exchange: "XNAS",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "eq:MSFT",
    symbol: "MSFT",
    displaySymbol: "MSFT",
    name: "Microsoft Corporation",
    assetClass: "equity",
    exchange: "XNAS",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "eq:NVDA",
    symbol: "NVDA",
    displaySymbol: "NVDA",
    name: "NVIDIA Corporation",
    assetClass: "equity",
    exchange: "XNAS",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "eq:TSLA",
    symbol: "TSLA",
    displaySymbol: "TSLA",
    name: "Tesla, Inc.",
    assetClass: "equity",
    exchange: "XNAS",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "eq:SPY",
    symbol: "SPY",
    displaySymbol: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    assetClass: "etf",
    exchange: "ARCX",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "fx:EURUSD",
    symbol: "EURUSD",
    displaySymbol: "EUR/USD",
    name: "Euro / US Dollar",
    assetClass: "forex",
    exchange: "FX",
    currency: "USD",
    status: "active",
    timezone: "UTC",
  },
  {
    id: "fx:GBPUSD",
    symbol: "GBPUSD",
    displaySymbol: "GBP/USD",
    name: "British Pound / US Dollar",
    assetClass: "forex",
    exchange: "FX",
    currency: "USD",
    status: "active",
    timezone: "UTC",
  },
];

const BASE: Record<string, number> = {
  AAPL: 214.32,
  MSFT: 428.15,
  NVDA: 128.74,
  TSLA: 248.6,
  SPY: 561.18,
  EURUSD: 1.08452,
  GBPUSD: 1.27341,
};

function seedWave(symbol: string, i: number): number {
  const base = BASE[symbol] ?? 100;
  const code = symbol.charCodeAt(0) + symbol.length;
  return (
    base * (1 + Math.sin((i + code) / 7) * 0.012 + ((i * code) % 5) * 0.0004)
  );
}

function buildQuote(symbol: string, now = Date.now()): Quote {
  const sym = normalizeSymbol(symbol);
  const instrument = UNIVERSE.find((u) => u.symbol === sym);
  if (!instrument) {
    throw new MarketDataError("NOT_FOUND", `Unknown symbol ${sym}`, 404);
  }
  const last = seedWave(sym, Math.floor(now / 60_000));
  const prev = seedWave(sym, Math.floor(now / 60_000) - 1);
  const change = last - prev;
  const changePercent = (change / prev) * 100;
  const bid = last * 0.9999;
  const ask = last * 1.0001;
  return {
    instrumentId: instrument.id,
    symbol: sym,
    bid: decimalString(bid),
    ask: decimalString(ask),
    last: decimalString(last),
    open: decimalString(seedWave(sym, 0)),
    high: decimalString(Math.max(last, prev) * 1.01),
    low: decimalString(Math.min(last, prev) * 0.99),
    previousClose: decimalString(prev),
    change: decimalString(change),
    changePercent: decimalString(changePercent),
    volume: decimalString(1_000_000 + (sym.charCodeAt(0) % 9) * 100_000),
    timestamp: new Date(now).toISOString(),
    marketStatus: "regular",
    freshness: "DEMO",
    delayMinutes: null,
  };
}

function buildCandles(
  symbol: string,
  interval: CandleInterval,
  limit: number,
): Candle[] {
  const sym = normalizeSymbol(symbol);
  if (!UNIVERSE.some((u) => u.symbol === sym)) {
    throw new MarketDataError("NOT_FOUND", `Unknown symbol ${sym}`, 404);
  }
  const stepMs: Record<CandleInterval, number> = {
    "1m": 60_000,
    "5m": 5 * 60_000,
    "15m": 15 * 60_000,
    "30m": 30 * 60_000,
    "1h": 60 * 60_000,
    "4h": 4 * 60 * 60_000,
    "1d": 24 * 60 * 60_000,
    "1w": 7 * 24 * 60 * 60_000,
  };
  const step = stepMs[interval];
  const now = Date.now();
  const out: Candle[] = [];
  for (let i = limit - 1; i >= 0; i--) {
    const t = now - i * step;
    // Time-based seed so demo candles (and signals) advance live as the clock moves.
    const idx = Math.floor(t / step);
    const barOpen = idx * step;
    // Forming (latest) bar phases with wall clock so OHLC and signals tick within the interval.
    const phase = i === 0 ? Math.min(0.99, (now % step) / step) : 0.5;
    const open = seedWave(sym, idx);
    const close = seedWave(sym, idx + phase);
    const high = Math.max(open, close) * 1.004;
    const low = Math.min(open, close) * 0.996;
    const candle = {
      timestamp: new Date(barOpen).toISOString(),
      open: decimalString(open)!,
      high: decimalString(high)!,
      low: decimalString(low)!,
      close: decimalString(close)!,
      volume: decimalString(50_000 + (idx % 200) * 17),
    };
    if (isValidOhlc(candle)) out.push(candle);
  }
  return out;
}

/** Explicit DEMO provider — never claims LIVE. Used without vendor credentials. */
export function createDemoMarketDataProvider(): MarketDataProvider {
  return {
    meta: {
      mode: "demo",
      providerId: "demo",
      providerLabel: "AnnyTrade Demo Feed",
      freshnessDefault: "DEMO",
      supportedAssetClasses: ["equity", "etf", "forex"],
      supportsRealtime: false,
      notes:
        "Deterministic demo quotes. Not a live market feed. Set ANNYTRADE_MARKET_DATA_API_KEY to enable a real provider.",
    },

    async searchInstruments({ query, limit = 12 }) {
      const q = query.trim().toLowerCase();
      if (q.length < 1) return [];
      return UNIVERSE.filter(
        (i) =>
          i.symbol.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q) ||
          i.displaySymbol.toLowerCase().includes(q),
      ).slice(0, Math.min(limit, 25));
    },

    async getInstrument(symbol) {
      const sym = normalizeSymbol(symbol);
      return UNIVERSE.find((u) => u.symbol === sym) ?? null;
    },

    async getQuote(symbol) {
      return buildQuote(symbol);
    },

    async getQuotes(symbols) {
      const unique = [...new Set(symbols.map(normalizeSymbol))].filter(Boolean);
      const out: Quote[] = [];
      for (const s of unique) {
        try {
          out.push(buildQuote(s));
        } catch (error) {
          if (error instanceof MarketDataError && error.code === "NOT_FOUND") {
            continue;
          }
          throw error;
        }
      }
      return out;
    },

    async getCandles({ symbol, interval, limit = 80 }) {
      const capped = Math.min(Math.max(limit, 1), 500);
      return buildCandles(symbol, interval, capped);
    },

    async getMarketStatus(market = "US"): Promise<MarketHoursStatus> {
      return {
        market,
        status: "regular",
        opensAt: null,
        closesAt: null,
        timezone: market === "US" ? "America/New_York" : "UTC",
        freshness: "DEMO",
      };
    },
  };
}

/** Alias for CI — same deterministic feed, mode=test in meta. */
export function createTestMarketDataProvider(): MarketDataProvider {
  const demo = createDemoMarketDataProvider();
  return {
    ...demo,
    meta: {
      ...demo.meta,
      mode: "test",
      providerId: "test",
      providerLabel: "AnnyTrade Test Feed",
      notes: "Deterministic fixtures for automated tests.",
    },
  };
}
