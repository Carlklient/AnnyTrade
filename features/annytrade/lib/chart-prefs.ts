export type ChartIndicatorFlags = {
  sma20: boolean;
  sma50: boolean;
  ema20: boolean;
  ema50: boolean;
  bb: boolean;
  rsi: boolean;
  macd: boolean;
  atr: boolean;
  volume: boolean;
};

export type ChartPrefs = {
  timeframeId: string;
  indicators: ChartIndicatorFlags;
};

const KEY = "annytrade.chart.prefs.v1";

export const DEFAULT_CHART_PREFS: ChartPrefs = {
  timeframeId: "1M",
  indicators: {
    sma20: true,
    sma50: false,
    ema20: true,
    ema50: true,
    bb: false,
    rsi: true,
    macd: true,
    atr: false,
    volume: true,
  },
};

export function loadChartPrefs(): ChartPrefs {
  if (typeof window === "undefined") return DEFAULT_CHART_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CHART_PREFS;
    const parsed = JSON.parse(raw) as Partial<ChartPrefs>;
    return {
      timeframeId: parsed.timeframeId ?? DEFAULT_CHART_PREFS.timeframeId,
      indicators: {
        ...DEFAULT_CHART_PREFS.indicators,
        ...(parsed.indicators ?? {}),
      },
    };
  } catch {
    return DEFAULT_CHART_PREFS;
  }
}

export function saveChartPrefs(prefs: ChartPrefs): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota */
  }
}
