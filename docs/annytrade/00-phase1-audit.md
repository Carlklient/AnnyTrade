# AnnyTrade Phase 1 — Audit Findings (pre-implementation)

## Current state
- AnnyTrade is a client-side product island under `/annytrade` with typed mocks behind `annytradeApi`.
- Auth screens navigate only; no sessions, no API routes, no middleware guards.
- Portfolio marketing lives under `app/(site)/` and must stay untouched.
- Supabase client stubs exist but are unused; no migrations, no Zod dependency, no argon2.

## What becomes REAL in Phase 1
- Users, sessions, profiles/preferences
- Watchlists + items
- Paper trading accounts + ledger foundation
- Order/fill schema (no execution)
- Notifications persistence
- Security audit events
- `/api/annytrade/*` with validation, authz, rate limits

## What stays DEMO / MOCK
- Market prices, charts, order books
- Signals, news, economic calendar
- Simulated balances / trade fills / wallet funding UX labels
- Demo vs Preview Live posture (UI), with real paper accounts underneath when authenticated

## Architecture decision
- Next.js App Router Route Handlers (`app/api/annytrade/*`)
- PostgreSQL via `DATABASE_URL` (Docker locally; any hosted PG in staging/prod)
- Custom Argon2id password hashing + HTTP-only session cookies
- Layers: route → validation → service → repository → PostgreSQL
- Keep `annytradeApi` façade; split real backend calls from mock market data

## Explicit non-goals
- Brokerage, real money, live market APIs, fake fills presented as real execution
