# AnnyTrade Phase 1 — Backend Foundation

## Architecture

```
app/api/annytrade/*          Route handlers (controllers)
  ↓
validation (zod)
  ↓
services (auth, accounts helpers)
  ↓
repos (SQL access)
  ↓
PostgreSQL schema `annytrade`
```

UI continues to use:
- **Mock market data** via `features/annytrade/services/api.ts` (prices, charts, signals, news, calendar)
- **Real backend** via `features/annytrade/services/client.ts` → `/api/annytrade/*` for auth, profile, watchlists, paper accounts, notifications

## Demo vs authenticated

| Surface | Guest (public demo) | Signed-in |
| --- | --- | --- |
| Dashboard / markets / trade UI | Simulated mock data | Same mock market data |
| Account / watchlists / notifications | Demo copy + CTA to sign in | PostgreSQL-backed |
| Paper ledger | Not created | Created on register (`INITIAL_BALANCE`) |

Guests can inspect the product without an account. Authenticated users never see another user’s data (authorization enforced in repositories/services).

## Database

- Schema: `annytrade`
- Connection: `ANNYTRADE_DATABASE_URL` or `DATABASE_URL` (server-only)
- Migrations: `features/annytrade/server/db/migrations/*.sql`
- Commands:
  - `npm run annytrade:migrate`
  - `npm run annytrade:seed`

### Tables

users, sessions, profiles, watchlists, watchlist_items, trading_accounts, account_ledger_entries, orders, executions, notifications, audit_events, password_reset_tokens, email_verification_tokens, schema_migrations

Orders/executions are **schema foundation only** — no fills in Phase 1.

## Authentication

- Argon2id password hashing (`@node-rs/argon2`)
- Opaque session tokens; only SHA-256 hashes stored
- HTTP-only cookie `annytrade_session` (`Secure` in production, `SameSite=Lax`)
- Account statuses: `ACTIVE` | `SUSPENDED` | `CLOSED`
- Password reset + email verification **token foundation** (email delivery when Resend is configured)

## API

- `POST /api/annytrade/auth/register`
- `POST /api/annytrade/auth/login`
- `POST /api/annytrade/auth/logout`
- `GET  /api/annytrade/auth/me`
- `POST /api/annytrade/auth/password-reset`
- `POST /api/annytrade/auth/verify-email`
- `GET|PATCH /api/annytrade/profile`
- `GET|POST /api/annytrade/watchlists`
- `PATCH|DELETE /api/annytrade/watchlists/:id`
- `POST /api/annytrade/watchlists/:id/items`
- `DELETE /api/annytrade/watchlists/:id/items/:symbol`
- `GET /api/annytrade/accounts`
- `GET /api/annytrade/accounts/:id`
- `GET|PATCH /api/annytrade/notifications`
- `PATCH /api/annytrade/notifications/:id/read`

## Security

- Server-side Zod validation
- In-memory rate limits on auth routes (replace with Redis/edge in multi-instance prod)
- Same-origin CSRF check on mutating routes
- Security response headers
- Audit events for register/login/logout/failures/resets (no secrets logged)

## Local Postgres (Docker)

```bash
docker run -d --name annytrade-pg \
  -e POSTGRES_USER=annytrade \
  -e POSTGRES_PASSWORD=annytrade_dev \
  -e POSTGRES_DB=annytrade \
  -p 54329:5432 postgres:16-alpine

cp .env.example .env.local   # set ANNYTRADE_DATABASE_URL
npm run annytrade:migrate
npm run annytrade:seed
```

Seed user: `demo@annytrade.local` / `DemoPass1234` (synthetic, local only).

## Tests

```bash
npm test
```

Integration tests require PostgreSQL via `ANNYTRADE_DATABASE_URL`.

## Known limitations (Phase 1)

- No live market APIs
- No brokerage / real-money deposits / withdrawals
- No order execution / fills
- Password-reset email not sent until Resend is wired
- Rate limiter is process-local
- Paper ledger balance is not yet the source of truth for the mock desk equity widgets (UI still shows simulated desk numbers; Account page shows real paper ledger)

## Phase 2 handoff

Connect market data feeds, drive quotes into the existing UI, and keep paper trading execution separate from any future broker account type.
