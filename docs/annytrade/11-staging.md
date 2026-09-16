# AnnyTrade Phase 11 — Staging Architecture

## Principles

- Staging is **production-like**, not production.
- **Never** share production credentials with staging.
- Broker = **sandbox / paper only**.
- Live execution remains **OFF**.

## Components

| Component | Staging |
|-----------|---------|
| App | Separate Vercel/preview project or `NODE_ENV=production` build with staging env |
| Database | Dedicated Postgres (`ANNYTRADE_DATABASE_URL` staging only) |
| Secrets | Staging secret store / `.env.staging` (gitignored) |
| Market data | `demo` or dedicated staging Finnhub key (not prod key) |
| Broker | Alpaca **Paper** keys only (`paper-api.alpaca.markets`) |
| Redis | Optional staging Upstash |
| Admin | `ANNYTRADE_ADMIN_EMAILS` staging-only list |

## Bootstrap

```bash
# 1. Copy template (never commit real secrets)
cp .env.staging.example .env.staging

# 2. Start staging Postgres (local)
docker compose -f docker-compose.staging.yml up -d

# 3. Migrate staging DB
npm run annytrade:migrate:staging

# 4. Backup / restore drill
npm run annytrade:staging:backup-restore

# 5. Run app against staging env
npm run build && npm run start
# or: dotenv -e .env.staging -- npm run start
```

## Backup / restore drill

`scripts/annytrade-staging-backup-restore.ts` dumps schema+data to a temp file and restores into a scratch database to prove recoverability. Does **not** touch production.

## E2E against staging

```bash
ANNYTRADE_E2E_BASE_URL=https://staging.example.com npm run annytrade:test:e2e
```

## Go / no-go

Staging validation does **not** authorize live broker execution. That remains a later human go/no-go after Phase 8 hard-block removal.
