import {
  atr,
  bollinger,
  ema,
  macd,
  rsi,
  sma,
  type OhlcBar,
} from "../../lib/indicators";
import type { CandleInterval } from "../market/types";
import type { DataFreshness } from "../market/types";

export type SignalBias = "Bullish" | "Bearish" | "Neutral" | "Watch";
export type SignalLifecycle = "Active" | "Stale" | "Expired";

export type SignalReason = {
  code: string;
  label: string;
  detail: string;
};

export type AnalysisSignal = {
  id: string;
  symbol: string;
  interval: CandleInterval;
  bias: SignalBias;
  /** Documented 0 to 100 score , not a success probability. */
  confidence: number;
  confidenceMethod: string;
  status: SignalLifecycle;
  generatedAt: string;
  barTime: string;
  expiresAt: string;
  staleAfterBars: number;
  inputs: {
    ema20: number | null;
    ema50: number | null;
    sma20: number | null;
    rsi14: number | null;
    macdHist: number | null;
    atr14: number | null;
    bbUpper: number | null;
    bbLower: number | null;
    close: number;
    volume: number | null;
    volumeAvg20: number | null;
  };
  reasons: SignalReason[];
  title: string;
  summary: string;
  disclosure: string;
  dataFreshness: DataFreshness;
  candleCount: number;
  insufficientHistory: boolean;
};

const DISCLOSURE =
  "Educational market analysis only, not financial advice. Indicators describe historical relationships; they do not guarantee outcomes. No signal is a guaranteed buy, sell, or profit.";

const INTERVAL_MS: Record<CandleInterval, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "1w": 7 * 24 * 60 * 60_000,
};

/** Bars after which a signal is Expired if not refreshed from a newer close. */
export const SIGNAL_STALE_AFTER_BARS = 3;

export function encodeSignalId(parts: {
  symbol: string;
  interval: string;
  barTime: string;
  bias: string;
}): string {
  const raw = `${parts.symbol}|${parts.interval}|${parts.barTime}|${parts.bias}`;
  return `sig_${Buffer.from(raw, "utf8").toString("base64url")}`;
}

export function decodeSignalId(
  id: string,
): { symbol: string; interval: string; barTime: string; bias: string } | null {
  if (!id.startsWith("sig_")) return null;
  try {
    const raw = Buffer.from(id.slice(4), "base64url").toString("utf8");
    const [symbol, interval, barTime, bias] = raw.split("|");
    if (!symbol || !interval || !barTime || !bias) return null;
    return { symbol, interval, barTime, bias };
  } catch {
    return null;
  }
}

/**
 * Confidence methodology (documented):
 * Start at 35. Each confirming factor adds +12 (max 5 counted → cap 95).
 * Conflicting factors subtract 10 each (floor 10).
 * Insufficient history or Neutral/Watch caps at 45.
 * This is an alignment score of rule factors , NOT win-rate or success probability.
 */
export function scoreConfidence(input: {
  confirming: number;
  conflicting: number;
  bias: SignalBias;
  insufficientHistory: boolean;
}): number {
  if (input.insufficientHistory) return 0;
  let score = 35 + Math.min(5, input.confirming) * 12 - input.conflicting * 10;
  score = Math.max(10, Math.min(95, score));
  if (input.bias === "Neutral" || input.bias === "Watch") {
    score = Math.min(score, 45);
  }
  return Math.round(score);
}

export function analyzeSymbolCandles(input: {
  symbol: string;
  interval: CandleInterval;
  bars: OhlcBar[];
  dataFreshness: DataFreshness;
  now?: Date;
}): AnalysisSignal | null {
  const now = input.now ?? new Date();
  const { symbol, interval, bars, dataFreshness } = input;
  const minBars = 55;
  const insufficientHistory = bars.length < minBars;

  if (bars.length === 0) return null;

  const last = bars[bars.length - 1]!;
  const ema20 = ema(bars, 20);
  const ema50 = ema(bars, 50);
  const sma20 = sma(bars, 20);
  const rsi14 = rsi(bars, 14);
  const macdSeries = macd(bars);
  const bb = bollinger(bars, 20, 2);
  const atr14 = atr(bars, 14);

  const i = bars.length - 1;
  const e20 = ema20[i]?.value ?? null;
  const e50 = ema50[i]?.value ?? null;
  const s20 = sma20[i]?.value ?? null;
  const r = rsi14[i]?.value ?? null;
  const hist = macdSeries[i]?.histogram ?? null;
  const a14 = atr14[i]?.value ?? null;
  const bbU = bb[i]?.upper ?? null;
  const bbL = bb[i]?.lower ?? null;

  const volumes = bars.map((b) => b.volume).filter((v) => v > 0);
  const hasVolume = volumes.length >= 20;
  let volumeAvg20: number | null = null;
  if (hasVolume) {
    const slice = bars.slice(-20).map((b) => b.volume);
    volumeAvg20 = slice.reduce((s, v) => s + v, 0) / slice.length;
  }
  const lastVol = last.volume > 0 ? last.volume : null;

  const reasons: SignalReason[] = [];
  let bull = 0;
  let bear = 0;

  if (e20 != null && e50 != null) {
    if (e20 > e50) {
      bull++;
      reasons.push({
        code: "EMA_TREND_UP",
        label: "Trend",
        detail: `20 EMA (${fmt(e20)}) above 50 EMA (${fmt(e50)})`,
      });
    } else if (e20 < e50) {
      bear++;
      reasons.push({
        code: "EMA_TREND_DOWN",
        label: "Trend",
        detail: `20 EMA (${fmt(e20)}) below 50 EMA (${fmt(e50)})`,
      });
    } else {
      reasons.push({
        code: "EMA_FLAT",
        label: "Trend",
        detail: "20 EMA equal to 50 EMA",
      });
    }
  }

  if (r != null) {
    if (r >= 55 && r <= 70) {
      bull++;
      reasons.push({
        code: "RSI_BULLISH_ZONE",
        label: "RSI",
        detail: `RSI ${fmt(r)} in constructive 55 to 70 zone`,
      });
    } else if (r >= 30 && r <= 45) {
      bear++;
      reasons.push({
        code: "RSI_BEARISH_ZONE",
        label: "RSI",
        detail: `RSI ${fmt(r)} in soft 30 to 45 zone`,
      });
    } else if (r > 70) {
      reasons.push({
        code: "RSI_EXTENDED_HIGH",
        label: "RSI",
        detail: `RSI ${fmt(r)} extended, watch for exhaustion`,
      });
    } else if (r < 30) {
      reasons.push({
        code: "RSI_EXTENDED_LOW",
        label: "RSI",
        detail: `RSI ${fmt(r)} extended low, watch for bounce`,
      });
    } else {
      reasons.push({
        code: "RSI_NEUTRAL",
        label: "RSI",
        detail: `RSI ${fmt(r)} mid range`,
      });
    }
  }

  if (hist != null) {
    if (hist > 0) {
      bull++;
      reasons.push({
        code: "MACD_HIST_POS",
        label: "MACD",
        detail: `MACD histogram positive (${fmt(Math.abs(hist))})`,
      });
    } else if (hist < 0) {
      bear++;
      reasons.push({
        code: "MACD_HIST_NEG",
        label: "MACD",
        detail: `MACD histogram negative (${fmt(Math.abs(hist))})`,
      });
    }
  }

  if (s20 != null) {
    if (last.close > s20) {
      bull++;
      reasons.push({
        code: "PRICE_ABOVE_SMA20",
        label: "Price SMA",
        detail: `Close ${fmt(last.close)} above SMA20 ${fmt(s20)}`,
      });
    } else if (last.close < s20) {
      bear++;
      reasons.push({
        code: "PRICE_BELOW_SMA20",
        label: "Price SMA",
        detail: `Close ${fmt(last.close)} below SMA20 ${fmt(s20)}`,
      });
    }
  }

  if (bbU != null && bbL != null && a14 != null) {
    const width = bbU - bbL;
    if (width > 0 && a14 > 0) {
      reasons.push({
        code: "VOLATILITY_ATR_BB",
        label: "Volatility",
        detail: `ATR14 ${fmt(a14)}; Bollinger width ${fmt(width)}`,
      });
    }
  }

  if (hasVolume && lastVol != null && volumeAvg20 != null && volumeAvg20 > 0) {
    const ratio = lastVol / volumeAvg20;
    if (ratio >= 1.25) {
      reasons.push({
        code: "VOLUME_ABOVE_AVG",
        label: "Volume",
        detail: `Volume ${fmt(lastVol)} ≈ ${fmt(ratio)}× 20 bar average`,
      });
      if (bull > bear) bull++;
      else if (bear > bull) bear++;
    } else {
      reasons.push({
        code: "VOLUME_NORMAL",
        label: "Volume",
        detail: `Volume near average (${fmt(ratio)}×)`,
      });
    }
  } else {
    reasons.push({
      code: "VOLUME_UNAVAILABLE",
      label: "Volume",
      detail: "Volume unavailable or insufficient, not used in bias",
    });
  }

  let bias: SignalBias;
  if (insufficientHistory) {
    bias = "Watch";
    reasons.unshift({
      code: "INSUFFICIENT_HISTORY",
      label: "Data",
      detail: `Need ≥${minBars} candles; have ${bars.length}`,
    });
  } else if (bull >= bear + 2 && bull >= 3) {
    bias = "Bullish";
  } else if (bear >= bull + 2 && bear >= 3) {
    bias = "Bearish";
  } else if (bull === bear) {
    bias = "Neutral";
  } else {
    bias = "Watch";
  }

  const confirming = Math.max(bull, bear);
  const conflicting = Math.min(bull, bear);
  const confidence = scoreConfidence({
    confirming,
    conflicting,
    bias,
    insufficientHistory,
  });

  const barMs = Date.parse(last.time);
  const intervalMs = INTERVAL_MS[interval] ?? INTERVAL_MS["1h"];
  const expiresAt = new Date(
    (Number.isFinite(barMs) ? barMs : now.getTime()) +
      SIGNAL_STALE_AFTER_BARS * intervalMs,
  ).toISOString();

  let status: SignalLifecycle = "Active";
  // DELAYED vendor feeds stay Active with freshness shown separately.
  // Only mark Stale when data is truly unusable.
  if (dataFreshness === "STALE" || dataFreshness === "UNAVAILABLE") {
    status = "Stale";
  }
  if (now.getTime() > Date.parse(expiresAt)) {
    status = "Expired";
  }
  if (insufficientHistory) {
    status = status === "Expired" ? "Expired" : "Stale";
  }

  const title =
    bias === "Bullish"
      ? "Bullish momentum structure"
      : bias === "Bearish"
        ? "Bearish momentum structure"
        : bias === "Neutral"
          ? "Neutral / mixed structure"
          : "Watch, mixed or incomplete readings";

  const summary = reasons
    .filter(
      (r) => r.code !== "VOLUME_UNAVAILABLE" && r.code !== "VOLUME_NORMAL",
    )
    .slice(0, 4)
    .map((r) => r.detail)
    .join("; ");

  const id = encodeSignalId({
    symbol: symbol.toUpperCase(),
    interval,
    barTime: last.time,
    bias,
  });

  return {
    id,
    symbol: symbol.toUpperCase(),
    interval,
    bias,
    confidence,
    confidenceMethod:
      "alignment score: 35 + 12×min(5,confirming) minus 10×conflicting, capped; Neutral/Watch ≤45; not a win rate",
    status,
    generatedAt: now.toISOString(),
    barTime: last.time,
    expiresAt,
    staleAfterBars: SIGNAL_STALE_AFTER_BARS,
    inputs: {
      ema20: e20,
      ema50: e50,
      sma20: s20,
      rsi14: r,
      macdHist: hist,
      atr14: a14,
      bbUpper: bbU,
      bbLower: bbL,
      close: last.close,
      volume: lastVol,
      volumeAvg20,
    },
    reasons,
    title,
    summary: summary || "Insufficient confirming factors.",
    disclosure: DISCLOSURE,
    dataFreshness,
    candleCount: bars.length,
    insufficientHistory,
  };
}

function fmt(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(3);
  return n.toFixed(5);
}
