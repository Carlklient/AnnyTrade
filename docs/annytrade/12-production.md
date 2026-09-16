# AnnyTrade Phase 12 — Production Infrastructure & Deployment

**Live broker execution remains OFF** (`PHASE8_LIVE_SUBMISSION_HARD_BLOCK = true`).

## Topology (actual, not assumed)

| Component | Production choice | Rationale |
|-----------|-------------------|-----------|
| Next.js UI + REST + SSE | **Vercel** | Fits request/stream model; site already Next.js |
| PostgreSQL | **Supabase Postgres** (schema `annytrade`) | Required durable store; pooler recommended for serverless |
| Redis rate-limit | **Upstash Redis REST** (optional → recommended) | Multi-instance rate limits; memory OK single-instance |
| Paper order / alert tick | **Vercel Cron** → `GET /api/annytrade/jobs/cron` | No separate worker binary yet; Alpaca WS unused |
| Broker streams | Not deployed as always-on process | Reconcile remains on-demand HTTP; live OFF |
| Portfolio marketing site | Same Vercel project | Shared deploy; AnnyTrade under `/annytrade` |

**Do not assume Vercel alone hosts every persistent workload forever.** When quote SSE fan-out or broker WebSocket ingestion must scale multi-instance, add Redis pub/sub + optional Fly/Render worker. Phase 12 ships cron + health without that worker.

## Environment separation

| Env | App URL | Database | Secrets |
|-----|---------|----------|---------|
| development | localhost | local Docker / `.env.local` | local only |
| test | CI | GitHub Actions Postgres service | ephemeral |
| staging | preview / staging host | dedicated staging DB (`.env.staging`) | staging-only |
| production | `https://omotundeaanu.com` (or Vercel production URL) | production Supabase project/schema | Vercel encrypted env |

Never share production credentials with staging/dev.

## Required production secrets (Vercel dashboard — never commit)

```
NEXT_PUBLIC_APP_URL=https://omotundeaanu.com
NEXT_PUBLIC_APP_ENV=production
ANNYTRADE_DATABASE_URL=postgresql://...pooler.../postgres   # transaction pooler
ANNYTRADE_MARKET_DATA_PROVIDER=demo|finnhub
ANNYTRADE_MARKET_DATA_API_KEY=…                              # if finnhub
ANNYTRADE_BROKER_PROVIDER=alpaca_paper|test
ANNYTRADE_BROKER_API_KEY_ID=…                                # paper only
ANNYTRADE_BROKER_API_SECRET_KEY=…
ANNYTRADE_BROKER_ENCRYPTION_KEY=…                            # 64 hex or passphrase
ANNYTRADE_BROKER_ORDERS_ENABLED=false                        # keep false until ready
ANNYTRADE_BROKER_LIVE_ENABLED=false
ANNYTRADE_BROKER_LIVE_ORDERS_ENABLED=false
ANNYTRADE_ALLOW_LIVE_TRADING=false
ANNYTRADE_LIVE_OPERATOR_CONFIRMATION=
ANNYTRADE_EMERGENCY_KILL_SWITCH=false
ANNYTRADE_RATE_LIMIT_BACKEND=auto
ANNYTRADE_REDIS_REST_URL=…                                   # Upstash
ANNYTRADE_REDIS_REST_TOKEN=…
ANNYTRADE_CRON_SECRET=…                                      # or CRON_SECRET (Vercel)
ANNYTRADE_ADMIN_EMAILS=ops@example.com
ANNYTRADE_SENTRY_DSN=…                                       # optional
ANNYTRADE_ALERT_WEBHOOK_URL=…                                # optional
RESEND_API_KEY=…                                             # optional email
RESEND_FROM_EMAIL=…
```

## Health / observability

- Public probe: `GET /api/annytrade/health` (DB + live hard-block flags; no secrets)
- Admin: `GET /api/annytrade/admin/health` (authenticated)
- Structured JSON logs + optional Sentry store + alert webhook
- CSP / security headers via `next.config.ts` + API `securityHeaders()`

## CI/CD gates

Workflow: `.github/workflows/annytrade-ci.yml`

1. lint  
2. typecheck  
3. unit/security/live-block tests  
4. production build  
5. integration against ephemeral Postgres + Phase 11 gate  

Deploy to Vercel production only after CI is green on `master`/`main`. Failures block the `deploy-gate` job; configure Vercel **Deployment Protection** / ignored build step if you want hard stop on red CI.

## Rollback

1. Vercel → Deployments → **Promote previous production deployment**  
2. If migration is unsafe forward-only: restore DB from Supabase PITR / backup to scratch, verify, then cut over  
3. Keep `ANNYTRADE_EMERGENCY_KILL_SWITCH=true` as immediate broker submit kill (live already hard-blocked)

## Backups & restore

- Prefer **Supabase automated backups / PITR** on paid plans; free tier: daily dump script  
- App drill: `ANNYTRADE_PRODUCTION_BACKUP=1 npm run annytrade:production:backup`  
- Restore: create scratch DB → `psql` / Supabase restore → run smoke → cut DNS/env

## Migrations

```bash
ANNYTRADE_PRODUCTION_MIGRATE=1 \
ANNYTRADE_PRODUCTION_DATABASE_URL='postgresql://…' \
npm run annytrade:migrate:production
```

## Smoke (safe only)

```bash
ANNYTRADE_SMOKE_BASE_URL=https://omotundeaanu.com npm run annytrade:prod:smoke
```

Does **not** submit real-money trades.

## Realtime scaling notes

- Quote/notification SSE are process-local today  
- Single Vercel instance / low concurrency: acceptable for Phase 12 paper  
- Before high concurrency: Upstash + Redis fan-out implementation (tracked as follow-up)

## Portfolio site

Marketing pages deploy with the same Vercel project. Verify `/`, `/work`, `/contact` separately from `/annytrade` after promote.
