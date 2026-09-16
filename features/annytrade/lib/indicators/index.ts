export type { OhlcBar, SeriesPoint } from "./types";
export { sma, smaValues } from "./sma";
export { ema, emaValues } from "./ema";
export { rsi, rsiValues } from "./rsi";
export { macd, macdValues, macdSeriesAsPoints, type MacdPoint } from "./macd";
export { bollinger, type BollingerPoint } from "./bollinger";
export { atr } from "./atr";

import type { OhlcBar } from "./types";
import { sma } from "./sma";
import { ema } from "./ema";
import { rsi } from "./rsi";
import { macd } from "./macd";
import { bollinger } from "./bollinger";
import { atr } from "./atr";

export type IndicatorId =
  "sma20" | "sma50" | "ema20" | "ema50" | "rsi14" | "macd" | "bb" | "atr14";

export type ChartIndicatorBundle = {
  sma20: ReturnType<typeof sma>;
  sma50: ReturnType<typeof sma>;
  ema20: ReturnType<typeof ema>;
  ema50: ReturnType<typeof ema>;
  rsi14: ReturnType<typeof rsi>;
  macd: ReturnType<typeof macd>;
  bb: ReturnType<typeof bollinger>;
  atr14: ReturnType<typeof atr>;
};

/** Compute all chart indicators once for a candle series. */
export function computeChartIndicators(bars: OhlcBar[]): ChartIndicatorBundle {
  return {
    sma20: sma(bars, 20),
    sma50: sma(bars, 50),
    ema20: ema(bars, 20),
    ema50: ema(bars, 50),
    rsi14: rsi(bars, 14),
    macd: macd(bars, 12, 26, 9),
    bb: bollinger(bars, 20, 2),
    atr14: atr(bars, 14),
  };
}
