# AnnyTrade Phase 2 — Market Data

## Status

**Foundation complete.** No live vendor credential was present in the environment at
implementation time, so the active runtime defaults to the **DEMO** provider until
`ANNYTRADE_MARKET_DATA_API_KEY` is configured.

Outcome label: **MARKET DATA FOUNDATION COMPLETE — PROVIDER CREDENTIAL REQUIRED**

## Provider abstraction

Application code depends on `MarketDataProvider`
(`features/annytrade/server/market/provider.ts`):

- `searchInstruments`
- `getInstrument`
- `getQuote` / `getQuotes`
- `getCandles`
- `getMarketStatus`
- optional `subscribeQuotes`

React components and route handlers never import vendor SDKs. Adapters live under
`features/annytrade/server/market/providers/`.

## Selected real provider

**Finnhub** (`providers/finnhub.ts`) — chosen because:

- Clear REST surface for US equities search, quotes, and candles
- Forex search/quotes available on common plans
- Easy server-side API key usage (no browser exposure)

Free-tier Finnhub quotes are treated as **DELAYED** (default 15 minutes). We do
**not** label them LIVE without an entitlement upgrade.

## Credentials

Server-only:

```
ANNYTRADE_MARKET_DATA_PROVIDER=demo|finnhub|test|auto|live
ANNYTRADE_MARKET_DATA_API_KEY=
```

Never use `NEXT_PUBLIC_*` for market-data keys.

| Mode | Behavior |
|------|----------|
| `demo` (default) | Deterministic demo feed, freshness `DEMO` |
| `test` | Same fixtures, `mode=test` for CI |
| `finnhub` + key | Live adapter, freshness `DELAYED` |
| `finnhub` without key | Falls back to DEMO + `credentialRequired` |
| `auto` + key | Selects Finnhub |

## Numeric precision

Domain quote/candle money fields use **decimal strings** across service boundaries.
Charting converts to `number` at the UI edge only. Persisted financial math (Phase 3+)
must not rely on IEEE floats for balances/fills.

## Supported asset classes (Phase 2)

- US equities
- ETFs (when returned by provider)
- Major forex pairs (demo fixtures + Finnhub where entitled)

**Not live:** crypto, options, futures, commodities, broad indices — UI labels them
unavailable rather than faking live prices.

## REST architecture

| Endpoint | Purpose |
|----------|---------|
| `GET /api/annytrade/markets/meta` | Provider mode + credential status |
| `GET /api/annytrade/markets/search?q=` | Symbol/name search |
| `GET /api/annytrade/markets/instruments/:symbol` | Instrument metadata |
| `GET /api/annytrade/markets/quotes/:symbol` | Single quote |
| `GET /api/annytrade/markets/quotes?symbols=` | Batch quotes (max 25) |
| `GET /api/annytrade/markets/candles` | OHLC history |
| `GET /api/annytrade/markets/status` | Session phase |
| `GET /api/annytrade/markets/stream?symbols=` | SSE quote fan-out |

All expensive endpoints are rate-limited at the AnnyTrade edge.

## Realtime architecture

**Transport: Server-Sent Events (SSE)**

Why SSE:

1. Provider secrets stay on the server
2. Works with `ReadableStream` in the Next.js App Router
3. Simple fan-out from a shared subscription manager
4. Adequate for quote refresh when vendor WebSocket entitlement is limited

Flow:

```
Provider REST (or future WS)
        ↓
marketDataService + cache
        ↓
QuoteSubscriptionManager (refcount + poll loop + backoff)
        ↓
SSE → AnnyTrade clients
```

UI screens also poll REST via hooks (`useQuotes` / `useCandles`) so charts and tables
work without an open stream.

## Subscription manager

`features/annytrade/server/market/subscriptions.ts`

- Tracks subscriber ids, symbol sets, last quote, connection state
- Upstream poll ~5s while consumers exist
- Exponential backoff on failure (capped)
- Marks quotes **STALE** when timestamps age out (non-demo)

**Multi-instance:** process-local today. Before horizontal scale, move fan-out and
shared last-quote cache to **Redis pub/sub + shared cache**. Do not fake distributed
sync in a single Node Map.

## Caching

| Data | TTL |
|------|-----|
| Instrument metadata | 1 hour |
| Search | 60s |
| Quote | 3s |
| Intraday candles | 30s |
| Daily candles | 5m |
| Market status | 30s |

In-flight request **deduplication** prevents stampeding the provider when many
widgets request the same symbol.

## Rate limits

- Provider adapter: ~55 Finnhub calls / minute (process-local)
- Public AnnyTrade routes: per-IP buckets via `rateLimit`
- Batch quotes preferred over N single-symbol calls

## Demo vs live separation

- DEMO mode is explicit (`freshness: DEMO`, badge “Market Data DEMO”)
- Failures do **not** silently swap in demo prices while showing LIVE
- Finnhub without a key refuses to claim live integration

## UI integration

- Dashboard watchlist / movers → market quotes
- Markets page → search + quotes; unsupported classes labeled n/a
- Trade screen → instrument, quote, candles; **Buy/Sell disabled** (Phase 3)
- Signals / news / calendar → remain simulated and labeled
- Topbar → `MarketDataBadge`

## Signals / news / calendar

Out of Phase 2 scope for production feeds. Simulated content stays labeled.

## Security

- API keys server-only
- Input validation (query length, symbol counts, candle range ≤ ~1 year)
- Rate limits on market routes
- Normalized errors (no raw provider payloads / tokens in responses)

## Observability

Structured console warnings for missing credentials; subscription status includes
connection state and reconnect attempt. Expand to metrics exporter later. Never log
API keys.

## Tests

- `features/annytrade/server/market/market.test.ts` — normalize, cache, dedupe,
  rate limit, demo/test provider, service, factory fallback
- Phase 1 integration tests remain authoritative for auth/DB
- Opt-in smoke: `npm run annytrade:test:market-provider`

## Known limitations

- No vendor WebSocket entitlement wired (REST poll + SSE fan-out)
- Finnhub free tier = delayed; not LIVE
- Process-local cache/subscriptions (Redis needed for multi-instance)
- Paper order matching not implemented (Phase 3)
- Persistent watchlist symbols resolve via market APIs when UI requests quotes;
  invalid symbols are not auto-deleted

## Phase 3 handoff

Use real quotes for mark-to-market on paper positions once order matching exists.
Do not begin brokerage, deposits, or KYC here.
