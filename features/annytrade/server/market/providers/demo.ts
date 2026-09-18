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
    id: "eq:AMZN",
    symbol: "AMZN",
    displaySymbol: "AMZN",
    name: "Amazon.com, Inc.",
    assetClass: "equity",
    exchange: "XNAS",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "eq:META",
    symbol: "META",
    displaySymbol: "META",
    name: "Meta Platforms, Inc.",
    assetClass: "equity",
    exchange: "XNAS",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "eq:GOOGL",
    symbol: "GOOGL",
    displaySymbol: "GOOGL",
    name: "Alphabet Inc. Class A",
    assetClass: "equity",
    exchange: "XNAS",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "etf:SPY",
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
    id: "etf:QQQ",
    symbol: "QQQ",
    displaySymbol: "QQQ",
    name: "Invesco QQQ Trust",
    assetClass: "etf",
    exchange: "XNAS",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "etf:IWM",
    symbol: "IWM",
    displaySymbol: "IWM",
    name: "iShares Russell 2000 ETF",
    assetClass: "etf",
    exchange: "ARCX",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "idx:US500",
    symbol: "US500",
    displaySymbol: "US500",
    name: "S&P 500 Index (CFD demo)",
    assetClass: "index",
    exchange: "INDEX",
    currency: "USD",
    status: "active",
    timezone: "America/New_York",
  },
  {
    id: "idx:NAS100",
    symbol: "NAS100",
    displaySymbol: "NAS100",
    name: "Nasdaq-100 Index (CFD demo)",
    assetClass: "index",
    exchange: "INDEX",
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
  {
    id: "fx:USDJPY",
    symbol: "USDJPY",
    displaySymbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    assetClass: "forex",
    exchange: "FX",
    currency: "JPY",
    status: "active",
    timezone: "UTC",
  },
  {
    id: "fx:AUDUSD",
    symbol: "AUDUSD",
    displaySymbol: "AUD/USD",
    name: "Australian Dollar / US Dollar",
    assetClass: "forex",
    exchange: "FX",
    currency: "USD",
    status: "active",
    timezone: "UTC",
  },
  {
    id: "fx:USDCAD",
    symbol: "USDCAD",
    displaySymbol: "USD/CAD",
    name: "US Dollar / Canadian Dollar",
    assetClass: "forex",
    exchange: "FX",
    currency: "CAD",
    status: "active",
    timezone: "UTC",
  },
  {
    id: "cmd:XAUUSD",
    symbol: "XAUUSD",
    displaySymbol: "XAU/USD",
    name: "Gold / US Dollar",
    assetClass: "commodity",
    exchange: "CMDTY",
    currency: "USD",
    status: "active",
    timezone: "UTC",
  },
  {
    id: "cmd:XAGUSD",
    symbol: "XAGUSD",
    displaySymbol: "XAG/USD",
    name: "Silver / US Dollar",
    assetClass: "commodity",
    exchange: "CMDTY",
    currency: "USD",
    status: "active",
    timezone: "UTC",
  },
  {
    id: "cmd:WTIUSD",
    symbol: "WTIUSD",
    displaySymbol: "WTI/USD",
    name: "Crude Oil WTI (demo)",
    assetClass: "commodity",
    exchange: "CMDTY",
    currency: "USD",
    status: "active",
    timezone: "UTC",
  },
  {
    id: "crypto:BTCUSD",
    symbol: "BTCUSD",
    displaySymbol: "BTC/USD",
    name: "Bitcoin / US Dollar",
    assetClass: "crypto",
    exchange: "CRYPTO",
    currency: "USD",
    status: "active",
    timezone: "UTC",
  },
  {
    id: "crypto:ETHUSD",
    symbol: "ETHUSD",
    displaySymbol: "ETH/USD",
    name: "Ethereum / US Dollar",
    assetClass: "crypto",
    exchange: "CRYPTO",
    currency: "USD",
    status: "active",
    timezone: "UTC",
  },
  {
    id: "crypto:SOLUSD",
    symbol: "SOLUSD",
    displaySymbol: "SOL/USD",
    name: "Solana / US Dollar",
    assetClass: "crypto",
    exchange: "CRYPTO",
    currency: "USD",
    status: "active",
    timezone: "UTC",
  },
];

/** Public demo catalog symbols for Markets / rails. */
export { DEMO_CATALOG_SYMBOLS } from "../../../lib/demo-catalog";

const BASE: Record<string, number> = {
  AAPL: 214.32,
  MSFT: 428.15,
  NVDA: 128.74,
  TSLA: 248.6,
  AMZN: 186.4,
  META: 512.4,
  GOOGL: 168.2,
  SPY: 561.18,
  QQQ: 482.1,
  IWM: 218.5,
  US500: 5620.5,
  NAS100: 19840,
  EURUSD: 1.08452,
  GBPUSD: 1.27341,
  USDJPY: 149.82,
  AUDUSD: 0.6621,
  USDCAD: 1.3612,
  XAUUSD: 2385.4,
  XAGUSD: 28.65,
  WTIUSD: 78.4,
  BTCUSD: 67420,
  ETHUSD: 3450.2,
  SOLUSD: 148.6,
};

/** Half-spread fraction by asset class (ask = last*(1+h), bid = last*(1-h)). */
function halfSpread(assetClass: Instrument["assetClass"]): number {
  switch (assetClass) {
    case "forex":
      return 0.00004;
    case "crypto":
      return 0.00035;
    case "commodity":
      return 0.00012;
    case "index":
      return 0.00008;
    case "etf":
      return 0.00006;
    default:
      return 0.0001;
  }
}

function usEquitySessionPhase(now = new Date()): SessionPhase {
  // Approximate US RTH in America/New_York via UTC offset (EST/EDT rough).
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  if (weekday === "Sat" || weekday === "Sun") return "closed";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const mins = hour * 60 + minute;
  if (mins < 4 * 60) return "closed";
  if (mins < 9 * 60 + 30) return "premarket";
  if (mins < 16 * 60) return "regular";
  if (mins < 20 * 60) return "afterhours";
  return "closed";
}

function sessionForInstrument(
  instrument: Instrument,
  now = new Date(),
): SessionPhase {
  if (
    instrument.assetClass === "crypto" ||
    instrument.assetClass === "forex" ||
    instrument.assetClass === "commodity"
  ) {
    return "regular";
  }
  return usEquitySessionPhase(now);
}

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
  const hs = halfSpread(instrument.assetClass);
  const bid = last * (1 - hs);
  const ask = last * (1 + hs);
  const marketStatus = sessionForInstrument(instrument, new Date(now));
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
    marketStatus,
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
      supportedAssetClasses: [
        "equity",
        "etf",
        "forex",
        "crypto",
        "commodity",
        "index",
      ],
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
      const status =
        market === "US" || market === "EQUITY"
          ? usEquitySessionPhase()
          : "regular";
      return {
        market,
        status,
        opensAt: null,
        closesAt: null,
        timezone: market === "CRYPTO" || market === "FX" ? "UTC" : "America/New_York",
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
