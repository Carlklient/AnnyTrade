# AnnyTrade Phase 7 — Broker Sandbox Architecture

## Status

**Broker foundation complete.** Official **Alpaca Paper** adapter is implemented.
Without `ANNYTRADE_BROKER_API_KEY_ID` / `ANNYTRADE_BROKER_API_SECRET_KEY`, connection
is **not faked** — status reports credentials required.

## Distinction (never mixed)

| Venue | Label | Ledger |
|-------|-------|--------|
| Internal | **AnnyTrade PAPER** | Phase 3 paper engine + ledger |
| Broker | **Broker Paper / Sandbox** | Broker-authoritative; mirrored locally |

`liveMoney` is always `false`. Live Alpaca URL `api.alpaca.markets` is **forbidden**.

## Kill switch

`ANNYTRADE_BROKER_ORDERS_ENABLED` must be exactly `true` to submit/cancel broker
orders. Default: **disabled**.

## Credentials

```
ANNYTRADE_BROKER_PROVIDER=alpaca_paper   # or test
ANNYTRADE_BROKER_API_KEY_ID=
ANNYTRADE_BROKER_API_SECRET_KEY=
ANNYTRADE_BROKER_ENCRYPTION_KEY=         # 64-hex or passphrase for at-rest encrypt
ANNYTRADE_BROKER_ORDERS_ENABLED=false
```

Secrets encrypted with AES-256-GCM when stored per-user. Never logged.

## APIs (session)

| Method | Path |
|--------|------|
| GET | `/api/annytrade/broker/status` |
| POST | `/api/annytrade/broker/connect` |
| GET | `/api/annytrade/broker/account` |
| GET/POST | `/api/annytrade/broker/orders` |
| DELETE | `/api/annytrade/broker/orders/[id]` |
| POST | `/api/annytrade/broker/reconcile` |

## Capabilities

Connect, account/buying power, positions, submit/cancel/list orders, executions
(via Alpaca FILL activities), reconcile + event dedupe, audit events.

Streaming: Alpaca Paper `trade_updates` websocket is implemented on the provider
(`subscribeOrderUpdates`). Reconcile + polling remain authoritative for durable
state and duplicate-event safety.

## Supported (Alpaca Paper)

- Order types: MARKET, LIMIT, STOP, STOP_LIMIT
- Assets: US equities/ETFs (entitlements vary)
- See [Alpaca paper trading docs](https://docs.alpaca.markets/docs/paper-trading)

## Limitations

- No real-money LIVE path
- Paper ≠ dividends / email fills
- Kill switch off by default
- Optional smoke: `npm run annytrade:test:broker-sandbox` (not CI)

## Migration

`005_broker_sandbox.sql` — connections, broker orders/executions, dedupe, position cache,
`BROKER_SANDBOX` account type (separate from PAPER).
