# AnnyTrade Phase 10 — Administration, Observability & Platform Operations

## Status

**ANNYTRADE PHASE 10 OPERATIONS COMPLETE** (technical).

Live trading remains **DISABLED** (`PHASE8_LIVE_SUBMISSION_HARD_BLOCK`).

## Admin authorization

- Table `annytrade.admin_roles` — explicit assignment (`ADMIN` | `OPERATOR` | `READONLY`)
- Bootstrap: `ANNYTRADE_ADMIN_EMAILS=comma,separated@emails` (optional)
- Grant API: `POST /api/annytrade/admin/roles/grant` (ADMIN only)
- **`requireAdmin` is server-side** — UI route hiding is not security

## Admin UI

`/annytrade/admin` — overview, users, health, reconcile, audit, metrics  
Denied users see access denied; APIs still return 403.

## Admin APIs

| Path | Min role |
|------|----------|
| `GET /admin/me` | READONLY |
| `GET /admin/dashboard` | READONLY |
| `GET /admin/users` | READONLY |
| `POST /admin/users/[id]/suspend` | OPERATOR |
| `POST /admin/users/[id]/unsuspend` | OPERATOR |
| `GET /admin/health` | READONLY |
| `GET /admin/audit` | READONLY |
| `GET /admin/reconcile` | READONLY |
| `GET /admin/metrics` | READONLY |
| `POST /admin/adjustments` | ADMIN |
| `POST /admin/roles/grant` | ADMIN |

Emails are redacted in admin payloads.

## Financial record controls

- Admins **cannot** casually edit cash, rewrite fills, or mutate audit rows via UI
- Authorized paper cash changes: immutable `ADJUSTMENT` ledger + `ledger_adjustments` + admin action audit

## Observability

- Structured JSON logs (`observability/log.ts`)
- Metrics foundation (latency, errors, gauges)
- Rate-limit events persisted
- Job runs for `orders.process` / `alerts.process` / cron
- Optional Sentry via `ANNYTRADE_SENTRY_DSN` / `SENTRY_DSN` (no invented credentials)
- Optional alert webhook `ANNYTRADE_ALERT_WEBHOOK_URL`

## Role enforcement

Service-layer `assertAdminMinRole` backs route gates so privilege checks are not UI-only:
- Suspend/unsuspend → OPERATOR+
- Ledger adjustments / role grant → ADMIN

## Migration

`008_admin_ops.sql`

## Tests

`npm run annytrade:test:admin` — customer denial, env bootstrap, READONLY escalation blocked, adjustments immutable, live hard-block.
