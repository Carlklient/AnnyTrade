/** Shared OHLC bar for indicator math (server + client). */
export type OhlcBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type SeriesPoint = {
  time: string;
  value: number | null;
};

export function closes(bars: OhlcBar[]): number[] {
  return bars.map((b) => b.close);
}

export function highs(bars: OhlcBar[]): number[] {
  return bars.map((b) => b.high);
}

export function lows(bars: OhlcBar[]): number[] {
  return bars.map((b) => b.low);
}

export function roundInd(n: number, dp = 8): number {
  const f = 10 ** dp;
  return Math.round((n + Number.EPSILON) * f) / f;
}
