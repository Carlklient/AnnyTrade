# AnnyTrade Phase 12 — Deployment Report

## Verdict

# ANNYTRADE PHASE 12 DEPLOYMENT BLOCKED

Live trading remains **DISABLED** (`PHASE8_LIVE_SUBMISSION_HARD_BLOCK`).

## What completed

| Item | Status |
|------|--------|
| Topology decision (Vercel app + managed Postgres + optional Upstash + Cron jobs) | Done — `docs/annytrade/12-production.md` |
| Public health probe | Done — `GET /api/annytrade/health` |
| Background job auth + daily cron route | Done — `/api/annytrade/jobs/cron` + `vercel.json` |
| CI gates (lint, typecheck, unit, live-block, build, integration) | Done — `.github/workflows/annytrade-ci.yml` |
| Env separation templates | Done — `.env.example`, `.env.staging.example`, `.env.production.example` |
| Production schema migrations 001–008 | Done on Supabase project `dqhofxdztumkemhegmly` (schema `annytrade`) |
| Smoke / migrate / backup scripts | Done — `annytrade:prod:smoke`, `migrate:production`, `production:backup` |
| CSP / security headers | Already in `next.config.ts` |
| BROKER_LIVE | Remains OFF |

## Public URLs / infrastructure (no secrets)

| Component | Value |
|-----------|--------|
| Intended production site | `https://omotundeaanu.com` (DNS did not resolve from this environment at validation time) |
| Supabase API host (DB project) | `https://dqhofxdztumkemhegmly.supabase.co` |
| AnnyTrade schema | `annytrade` (migrations 001–008 recorded) |
| Vercel team | `carlklients-projects` (`team_citMKKYSklDsJAwFgp6yrBRj`) |
| Existing Vercel project on team | `flowdesk` only — AnnyTrade site project **not** successfully linked |
| Cron schedule (Hobby-safe) | `0 12 * * *` → `/api/annytrade/jobs/cron` |

## Blockers (release-critical)

1. **Production app deploy** — Vercel CLI has no credentials in this environment; `create_git_project` did not leave a usable linked project; Phase 11/12 code is largely **uncommitted / not pushed** to `Carlklient/omotundeaanu.com`.
2. **Production `ANNYTRADE_DATABASE_URL`** — schema is migrated via Supabase MCP, but the pooler connection string (password) must be set in Vercel env from the Supabase dashboard (never commit).
3. **Domain/TLS** — `omotundeaanu.com` did not resolve here; attach domain + TLS in Vercel after first successful deploy.
4. **Upstash Redis** — not provisioned (optional for single-instance; required before multi-instance rate-limit correctness). Render free Redis is protocol-incompatible with current Upstash REST client.
5. **Dedicated free Supabase project** — org hit 2-project free limit; `callflow-staging` was **paused** to attempt capacity; AnnyTrade schema lives on shared project `Carlklient's Project` until a dedicated project or paid plan is available.

## Safe next steps (human)

1. Commit + push Phase 11/12 to `master`.
2. In Vercel: Import `Carlklient/omotundeaanu.com`, set Production env from `.env.production.example`, add Supabase **transaction pooler** URL.
3. Set `CRON_SECRET` / `ANNYTRADE_CRON_SECRET`, keep all `*_LIVE_*` false.
4. Deploy production → run `ANNYTRADE_SMOKE_BASE_URL=https://<url> npm run annytrade:prod:smoke`.
5. Attach custom domain + confirm TLS.
6. Optionally restore/pause policy for `callflow-staging`; create dedicated `annytrade-production` when quota allows.

## Explicit non-goals held

- No real-money trades  
- No live broker enablement  
- No production secrets committed  
- No destructive third-party load tests  
