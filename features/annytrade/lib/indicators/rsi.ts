import { roundInd, type OhlcBar, type SeriesPoint } from "./types";

/**
 * Wilder RSI.
 * First average gain/loss = SMA of period changes; then Wilder smooth.
 * RSI = 100 - 100/(1+RS). Null until period+1 closes (period changes).
 */
export function rsi(bars: OhlcBar[], period = 14): SeriesPoint[] {
  if (period < 1) throw new Error("RSI period must be >= 1");
  const closes = bars.map((b) => b.close);
  const values = rsiValues(closes, period);
  return bars.map((b, i) => ({ time: b.time, value: values[i]! }));
}

export function rsiValues(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = Array(closes.length).fill(null);
  if (closes.length <= period) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    if (ch >= 0) gainSum += ch;
    else lossSum -= ch;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = toRsi(avgGain, avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    const gain = ch > 0 ? ch : 0;
    const loss = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = toRsi(avgGain, avgLoss);
  }
  return out;
}

function toRsi(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return roundInd(100 - 100 / (1 + rs));
}
