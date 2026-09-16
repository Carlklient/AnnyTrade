import { roundInd, type OhlcBar, type SeriesPoint } from "./types";

/** Simple moving average of closes. Null until `period` bars available. */
export function sma(bars: OhlcBar[], period: number): SeriesPoint[] {
  if (period < 1) throw new Error("SMA period must be >= 1");
  const out: SeriesPoint[] = [];
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    sum += bars[i]!.close;
    if (i >= period) sum -= bars[i - period]!.close;
    if (i + 1 < period) {
      out.push({ time: bars[i]!.time, value: null });
    } else {
      out.push({ time: bars[i]!.time, value: roundInd(sum / period) });
    }
  }
  return out;
}

export function smaValues(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    out.push(i + 1 < period ? null : roundInd(sum / period));
  }
  return out;
}
