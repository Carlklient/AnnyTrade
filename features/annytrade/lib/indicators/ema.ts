import { roundInd, type OhlcBar, type SeriesPoint } from "./types";
import { smaValues } from "./sma";

/**
 * Exponential moving average of closes.
 * Seed: SMA of first `period` closes; then EMA = α, close + (1-α), prevEMA, α = 2/(period+1).
 */
export function ema(bars: OhlcBar[], period: number): SeriesPoint[] {
  if (period < 1) throw new Error("EMA period must be >= 1");
  const closes = bars.map((b) => b.close);
  const values = emaValues(closes, period);
  return bars.map((b, i) => ({ time: b.time, value: values[i]! }));
}

export function emaValues(values: number[], period: number): (number | null)[] {
  if (period < 1) throw new Error("EMA period must be >= 1");
  const out: (number | null)[] = Array(values.length).fill(null);
  if (values.length < period) return out;

  const seed = smaValues(values.slice(0, period), period)[period - 1];
  if (seed == null) return out;

  const alpha = 2 / (period + 1);
  out[period - 1] = seed;
  for (let i = period; i < values.length; i++) {
    out[i] = roundInd(alpha * values[i]! + (1 - alpha) * out[i - 1]!);
  }
  return out;
}
