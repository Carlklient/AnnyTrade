import { smaValues } from "./sma";
import { roundInd, type OhlcBar } from "./types";

export type BollingerPoint = {
  time: string;
  middle: number | null;
  upper: number | null;
  lower: number | null;
};

/**
 * Bollinger Bands: middle = SMA(period), upper/lower = middle ± k * population stdev of window.
 * Uses population stdev (divide by N) for deterministic fixture alignment.
 */
export function bollinger(
  bars: OhlcBar[],
  period = 20,
  k = 2,
): BollingerPoint[] {
  const closes = bars.map((b) => b.close);
  const mid = smaValues(closes, period);
  return bars.map((b, i) => {
    if (mid[i] == null) {
      return { time: b.time, middle: null, upper: null, lower: null };
    }
    const window = closes.slice(i - period + 1, i + 1);
    const mean = mid[i]!;
    const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const stdev = Math.sqrt(variance);
    return {
      time: b.time,
      middle: mean,
      upper: roundInd(mean + k * stdev),
      lower: roundInd(mean - k * stdev),
    };
  });
}
