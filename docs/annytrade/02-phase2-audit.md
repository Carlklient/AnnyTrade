# Phase 2 Audit — Market Mock Dependency Map

## Consumers of fake market data (pre-Phase 2)

| Location | Fake fields used |
| --- | --- |
| `services/api.ts` | `listAssets`, `getAsset`, `getPriceData`, `getOrderBook` |
| `data/mock.ts` | `mockAssets`, `generateCandles`, `getOrderBook`, sparklines |
| `dashboard/DashboardView.tsx` | watchlist prices, movers, change %, sparkline |
| `markets/MarketsView.tsx` | full asset table (price, bid/ask, spread, %, OHLC, status) |
| `trade/TradeView.tsx` | instrument, quote, candles, order book |
| `signals/SignalDetailView.tsx` | chart candles via `getPriceData` |
| Positions/orders/wallet/analytics | account simulation (NOT market feed — leave alone) |
| News / Calendar | editorial mocks (out of Phase 2 scope) |

## Decision

- Introduce `MarketDataProvider` abstraction + service + REST/SSE APIs.
- Default without credentials: **Demo provider** with explicit `DEMO` freshness (never labeled LIVE).
- Optional real adapter: **Finnhub** when `ANNYTRADE_MARKET_DATA_PROVIDER=finnhub` + API key.
- Deterministic **Test provider** for CI.
- Keep Phase 1 auth/watchlists/paper accounts untouched.
- Signals/news/calendar remain simulated and labeled.
