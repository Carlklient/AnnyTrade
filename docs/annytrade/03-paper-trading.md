# AnnyTrade Phase 3 — Paper Trading

## Status

**Paper trading engine complete.** Orders, executions, positions, and ledger effects
run server-side against the Phase 2 market-data abstraction. UI is labeled **PAPER**.

## Execution policy

| Side | Market / stop fill price |
|------|---------------------------|
| BUY  | Prefer **ask**, else **last** |
| SELL | Prefer **bid**, else **last** |

Limit buys fill when market ask/last ≤ limit (fill at `min(limit, ask)`).  
Limit sells fill when market bid/last ≥ limit (fill at `max(limit, bid)`).

Stop trigger uses **last**. Activation is separate from fill price (stop → market;
stop-limit → limit after activation).

Client-supplied prices are **never** used as fill prices.

## Order lifecycle

`PENDING` → `OPEN` / `PARTIALLY_FILLED` → `FILLED` | `CANCELLED` | `REJECTED`

Types: `MARKET`, `LIMIT`, `STOP`, `STOP_LIMIT`.  
Long-only: selling more than owned quantity is rejected.

## Cash & ledger

Authoritative cash = `SUM(account_ledger_entries.amount)`.  
Categories: `TRADE_DEBIT`, `TRADE_CREDIT`, `FEE`, plus Phase 1 `INITIAL_BALANCE`.  
Available cash = balance − reserved notional of open BUY orders.

Fees: `ANNYTRADE_PAPER_FEE_BPS` (default `0`).

## Idempotency

- Order submit: `idempotencyKey` body field or `Idempotency-Key` header (unique per user).
- Fills: `executions.external_execution_id` unique.

## APIs

- `POST /api/annytrade/orders`
- `GET /api/annytrade/orders`
- `GET /api/annytrade/orders/:id`
- `POST /api/annytrade/orders/:id/cancel`
- `POST /api/annytrade/orders/process`
- `GET /api/annytrade/positions`
- `GET /api/annytrade/accounts/paper-summary`

## Limitations

- No margin / leverage
- No short selling
- Resting orders evaluated on submit/list/process (not a continuous matching exchange)
- Process-local; multi-instance needs shared job/queue later
- SL/TP ticket fields from earlier UI were not persisted (use STOP / STOP_LIMIT orders)

## Phase 4 handoff

Deposits/withdrawals/funding UI — do not start automatically.
