# AnnyTrade Phase 4 — Portfolio, P&L & Performance Analytics

## Status

**PAPER portfolio analytics complete.** Metrics are derived from ledger cash,
open/closed positions, executions, market marks, and equity snapshots. No random
or reconstructed fake history.

## Equity model

```
equity = ledger_cash + Σ(qty × mark)   // only when every open lot is marked
```

- **Cash** — sum of `account_ledger_entries` (authoritative).
- **Market value** — open lots × current mark (`referenceLast` from quotes).
- **Cost basis** — position `cost_basis` from the paper engine.
- **Unrealized P&L** — `(mark − average_entry) × qty` for marked lots.
- **Realized P&L** — cumulative on open rows (partial sells) + closed position rows.
- **Total P&L** — realized + unrealized.
- **Fees** — ledger `FEE` category; also allocated into FIFO trade P&L.

If any open symbol lacks a mark, **`equity` is `null`**, `marksComplete` is false,
and growth / daily P&L that depend on equity are withheld. Marks are never invented.

## Allocation & exposure

- Allocation = share of marked market value by symbol.
- Exposure = gross MV and net exposure % of equity (`MV / |equity|`).
- Sector allocation is **not** shown — no invented sector metadata.

## Equity history & drawdown

- Table: `annytrade.equity_snapshots` (migration `003_equity_snapshots.sql`).
- Snapshots written when portfolio compute succeeds with complete marks (API
  refresh and post-fill best-effort).
- History **starts** when the first reliable snapshot exists.
- Daily / weekly / monthly series are bucketed from snapshots only.
- Drawdown (peak, current %, max %) requires ≥ 2 snapshot points; otherwise
  `insufficientHistory: true`.

## Returns methodology

| Metric | Formula |
|--------|---------|
| Account growth % | `(equity − INITIAL_BALANCE) / INITIAL_BALANCE × 100` |
| Daily P&L | `equity_today − equity_on_or_before_yesterday` (snapshots) |
| Series P&L | Δ equity between consecutive bucket points |

## Trade statistics (FIFO)

Completed round-trips from executions:

`P&L = (exit − entry) × qty − allocated_buy_fee − allocated_sell_fee`

Reported when trades exist: win/loss counts, win rate, avg win/loss, profit
factor (null if no losses), largest win/loss, duration, best/worst symbol,
volume. Empty history → `insufficientHistory` and UI shows **n/a**.

Paper is **long-only** → long 100% / short 0%.

## APIs (session required)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/annytrade/portfolio/summary` | Dashboard / Portfolio KPIs |
| GET | `/api/annytrade/portfolio/analytics` | Full analytics; `from` / `to` filters |

Authorization: `requireSessionUser`. Rate-limited. Account scoped to the
authenticated user.

## UI

- **Dashboard** — PAPER cash, available, equity, unrealized, daily P&L.
- **Portfolio** — cash, MV, cost basis, equity, realized/unrealized/total P&L,
  positions with marks.
- **Analytics** — growth, trade stats, drawdown, allocation, snapshot series,
  methodology panel, date range.

## Limitations

- No sector breakdown without trustworthy instrument metadata.
- Drawdown / multi-day daily P&L need multi-day snapshots.
- Stale quotes still mark with provider last but are listed in `staleMarks`.
- DEMO/test marks are valid when that provider is active; LIVE claims never use
  invented fallbacks.
