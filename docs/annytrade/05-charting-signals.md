# AnnyTrade Phase 5 — Charting, Indicators & Signal Engine

## Status

**Analysis engine complete.** Candlestick charts use Phase 2 OHLC; indicators are
pure deterministic modules; signals are transparent rule-based readings with
explanations — not advice and not guarantees.

## Chart

- Real OHLC via `useCandles` → `/api/annytrade/markets/candles`
- Intervals: provider-supported set (`1m…1h`, `1d`, `1w`)
- Crosshair + OHLC tooltip, volume pane, scroll/drag pan, current price marker
- Overlays/panes: SMA20/50, EMA20/50, Bollinger, RSI, MACD, ATR, volume
- Indicator math computed outside the chart (`computeChartIndicators` + `useMemo`)
- Preferences (timeframe + toggles) persisted in `localStorage` (`annytrade.chart.prefs.v1`)
- Accessibility: down candles are hollow/hatched — not color-only

## Indicators (tested)

| Indicator | Module | Notes |
|-----------|--------|-------|
| SMA | `lib/indicators/sma.ts` | Simple average of closes |
| EMA | `lib/indicators/ema.ts` | SMA seed, α = 2/(n+1) |
| RSI | `lib/indicators/rsi.ts` | Wilder |
| MACD | `lib/indicators/macd.ts` | 12/26/9 |
| Bollinger | `lib/indicators/bollinger.ts` | SMA ± k·population σ |
| ATR | `lib/indicators/atr.ts` | Wilder TR |

## Signal engine

- `server/analysis/signal-engine.ts` + `service.ts`
- APIs: `GET /api/annytrade/signals`, `GET /api/annytrade/signals/[id]`
- Scan uses watchlist symbols when signed in, else default liquid names
- Labels: **Bullish / Bearish / Neutral / Watch** only
- Every signal includes `reasons[]` (why), inputs, timeframe, timestamps
- Lifecycle: **Active → Stale → Expired** (freshness, bar roll, expiry window)
- Educational disclosure on list + detail

### Confidence methodology

```
score = 35 + 12×min(5, confirming) − 10×conflicting
clamp [10, 95]; Neutral/Watch ≤ 45; insufficient history → 0
```

This is an **alignment score of rule factors**, not a win-rate or success probability.

### Rules (summary)

- EMA20 vs EMA50 trend
- RSI zone (55–70 / 30–45 / extended)
- MACD histogram sign
- Close vs SMA20
- ATR + Bollinger width (volatility context)
- Volume vs 20-bar average when volume exists

## UI

- Trade chart: live indicators + prefs
- `/signals` + `/signals/[id]` wired to API (mock signals removed from UI path)
- Watchlist quotes show compact bias summaries linking to signal detail

## Tests

- `lib/indicators/indicators.test.ts` — fixture math
- `server/analysis/signal-engine.test.ts` — rules, confidence, expiry, missing volume

## Limitations

- Signals are regenerated from latest candles (ephemeral IDs); no historical signal store
- No `4h` in Finnhub-supported interval list
- Volume rules skip when provider omits volume
- Chart pan is window-based (not full zoom stack)
- Not financial advice; indicators describe past relationships only
