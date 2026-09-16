import { roundInd, type OhlcBar, type SeriesPoint } from "./types";

/**
 * Average True Range (Wilder).
 * TR = max(high-low, |high-prevClose|, |low-prevClose|).
 * First ATR = SMA of first `period` TRs; then Wilder smooth.
 */
export function atr(bars: OhlcBar[], period = 14): SeriesPoint[] {
  if (period < 1) throw new Error("ATR period must be >= 1");
  const out: SeriesPoint[] = bars.map((b) => ({ time: b.time, value: null }));
  if (bars.length < period + 1) return out;

  const trs: number[] = [];
  for (let i = 0; i < bars.length; i++) {
    const h = bars[i]!.high;
    const l = bars[i]!.low;
    if (i === 0) {
      trs.push(h - l);
      continue;
    }
    const prevClose = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose)));
  }

  let atrVal = trs.slice(1, period + 1).reduce((s, v) => s + v, 0) / period;
  out[period] = { time: bars[period]!.time, value: roundInd(atrVal) };

  for (let i = period + 1; i < bars.length; i++) {
    atrVal = (atrVal * (period - 1) + trs[i]!) / period;
    out[i] = { time: bars[i]!.time, value: roundInd(atrVal) };
  }
  return out;
}
