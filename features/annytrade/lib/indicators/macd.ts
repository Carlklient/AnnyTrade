import { emaValues } from "./ema";
import { roundInd, type OhlcBar, type SeriesPoint } from "./types";

export type MacdPoint = {
  time: string;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
};

/**
 * MACD = EMA(fast) - EMA(slow); signal = EMA(macd, signalPeriod); hist = macd - signal.
 * Defaults: 12 / 26 / 9.
 */
export function macd(
  bars: OhlcBar[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdPoint[] {
  const closes = bars.map((b) => b.close);
  const series = macdValues(closes, fast, slow, signalPeriod);
  return bars.map((b, i) => ({
    time: b.time,
    macd: series.macd[i]!,
    signal: series.signal[i]!,
    histogram: series.histogram[i]!,
  }));
}

export function macdValues(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEma = emaValues(closes, fast);
  const slowEma = emaValues(closes, slow);
  const macdLine: (number | null)[] = closes.map((_, i) => {
    if (fastEma[i] == null || slowEma[i] == null) return null;
    return roundInd(fastEma[i]! - slowEma[i]!);
  });

  const definedIdx: number[] = [];
  const definedVals: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] != null) {
      definedIdx.push(i);
      definedVals.push(macdLine[i]!);
    }
  }
  const signalOnDefined = emaValues(definedVals, signalPeriod);
  const signal: (number | null)[] = Array(closes.length).fill(null);
  for (let j = 0; j < definedIdx.length; j++) {
    signal[definedIdx[j]!] = signalOnDefined[j]!;
  }

  const histogram: (number | null)[] = closes.map((_, i) => {
    if (macdLine[i] == null || signal[i] == null) return null;
    return roundInd(macdLine[i]! - signal[i]!);
  });

  return { macd: macdLine, signal, histogram };
}

export function macdSeriesAsPoints(points: MacdPoint[]): {
  macd: SeriesPoint[];
  signal: SeriesPoint[];
  histogram: SeriesPoint[];
} {
  return {
    macd: points.map((p) => ({ time: p.time, value: p.macd })),
    signal: points.map((p) => ({ time: p.time, value: p.signal })),
    histogram: points.map((p) => ({ time: p.time, value: p.histogram })),
  };
}
