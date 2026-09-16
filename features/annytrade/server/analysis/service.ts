import { ApiError } from "../http/errors";
import { marketDataService, SUPPORTED_INTERVALS } from "../market/service";
import type { CandleInterval } from "../market/types";
import { MarketDataError } from "../market/types";
import { listWatchlists } from "../repos/watchlists";
import {
  analyzeSymbolCandles,
  decodeSignalId,
  type AnalysisSignal,
} from "./signal-engine";
import type { OhlcBar } from "../../lib/indicators";

const DEFAULT_SCAN = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "SPY",
  "EURUSD",
  "GBPUSD",
];

export async function resolveScanSymbols(
  userId: string | null,
  requested?: string[],
): Promise<string[]> {
  if (requested && requested.length > 0) {
    return [...new Set(requested.map((s) => s.toUpperCase()))].slice(0, 25);
  }
  if (userId) {
    try {
      const lists = await listWatchlists(userId);
      const syms = lists.flatMap((l) => l.symbols);
      if (syms.length > 0)
        return [...new Set(syms.map((s) => s.toUpperCase()))].slice(0, 25);
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_SCAN;
}

function toBars(
  candles: Awaited<ReturnType<typeof marketDataService.candles>>,
): OhlcBar[] {
  return candles.map((c) => ({
    time: c.timestamp,
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
    volume: c.volume != null ? Number(c.volume) : 0,
  }));
}

export async function generateSignalsForSymbols(input: {
  symbols: string[];
  interval: CandleInterval;
  limit?: number;
}): Promise<{
  signals: AnalysisSignal[];
  errors: { symbol: string; message: string }[];
  interval: CandleInterval;
  generatedAt: string;
}> {
  if (!SUPPORTED_INTERVALS.includes(input.interval)) {
    throw new ApiError(
      400,
      "VALIDATION",
      `Unsupported interval ${input.interval}`,
    );
  }
  const limit = Math.min(Math.max(input.limit ?? 120, 60), 300);
  const meta = marketDataService.meta();
  const freshness = meta.freshnessDefault;
  const errors: { symbol: string; message: string }[] = [];
  const signals: AnalysisSignal[] = [];

  for (const symbol of input.symbols) {
    try {
      const candles = await marketDataService.candles({
        symbol,
        interval: input.interval,
        limit,
      });
      const bars = toBars(candles);
      const signal = analyzeSymbolCandles({
        symbol,
        interval: input.interval,
        bars,
        dataFreshness: freshness,
      });
      if (signal) signals.push(signal);
    } catch (err) {
      const message =
        err instanceof MarketDataError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Market data failure";
      errors.push({ symbol, message });
    }
  }

  signals.sort((a, b) => b.confidence - a.confidence);
  return {
    signals,
    errors,
    interval: input.interval,
    generatedAt: new Date().toISOString(),
  };
}

export async function getSignalById(id: string): Promise<AnalysisSignal> {
  const decoded = decodeSignalId(id);
  if (!decoded) {
    throw new ApiError(404, "NOT_FOUND", "Signal not found");
  }
  const interval = decoded.interval as CandleInterval;
  if (!SUPPORTED_INTERVALS.includes(interval)) {
    throw new ApiError(404, "NOT_FOUND", "Signal interval unsupported");
  }

  try {
    const candles = await marketDataService.candles({
      symbol: decoded.symbol,
      interval,
      limit: 120,
    });
    const bars = toBars(candles);
    const meta = marketDataService.meta();
    const signal = analyzeSymbolCandles({
      symbol: decoded.symbol,
      interval,
      bars,
      dataFreshness: meta.freshnessDefault,
    });
    if (!signal) {
      throw new ApiError(404, "NOT_FOUND", "Unable to rebuild signal");
    }
    // If bar rolled forward, mark prior id as Expired but still return current analysis
    // with note when id barTime doesn't match latest
    if (signal.barTime !== decoded.barTime) {
      return {
        ...signal,
        id,
        status: "Expired",
        reasons: [
          {
            code: "BAR_ROLLED",
            label: "Expiry",
            detail: `Original bar ${decoded.barTime} superseded by ${signal.barTime}`,
          },
          ...signal.reasons,
        ],
        summary: `Expired, newer bar available. Current reading: ${signal.summary}`,
      };
    }
    if (signal.bias !== decoded.bias) {
      return {
        ...signal,
        id,
        status: signal.status === "Expired" ? "Expired" : "Stale",
        reasons: [
          {
            code: "BIAS_CHANGED",
            label: "Invalidation",
            detail: `Bias shifted from ${decoded.bias} to ${signal.bias}`,
          },
          ...signal.reasons,
        ],
      };
    }
    return { ...signal, id };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof MarketDataError) {
      throw new ApiError(err.status, err.code, err.message);
    }
    throw new ApiError(
      502,
      "PROVIDER_ERROR",
      "Failed to load market data for signal",
    );
  }
}
