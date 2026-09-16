# AnnyTrade Phase 11 — Defect Log

Generated during staging/validation. Severity: **blocker** | major | minor | note.

| ID | Severity | Area | Finding | Resolution |
|----|----------|------|---------|------------|
| P11-001 | note | E2E | Full browser register→trade path needs live DB + built app | Playwright suite + API-assisted paper flow against staging |
| P11-002 | note | Load | Third-party API load intentionally not executed | Internal fixture load tests only |
| P11-003 | note | Staging | Staging DB must be provisioned separately | `docker-compose.staging.yml` + `.env.staging` (gitignored) |
| P11-004 | blocker-check | Live | Live execution must remain OFF | Asserted in Phase 11 gate + live-readiness tests — **PASS** |
| P11-005 | major→fixed | Auth/E2E | Production `Secure` cookies blocked HTTP staging sessions | `ANNYTRADE_COOKIE_INSECURE=1` for local HTTP staging only |
| P11-006 | minor→fixed | A11y | Auth email/password lacked associated labels | Labels + ids on `AuthView` |
| P11-007 | minor→fixed | Scripts | Staging backup script top-level await broke under tsx CJS | Wrapped in `main()` |
| P11-008 | note | Backup | `pg_dump` not on PATH | SQL `schema_migrations` round-trip proof used |
| P11-009 | note | Perf | No dedicated Lighthouse CI | Desk route E2E + API latency metrics instrumentation remain |
| P11-010 | major→fixed | E2E/CSRF | `127.0.0.1` vs `localhost` Origin mismatch on paper API E2E | Playwright baseURL → `localhost`; CSRF loopback equivalence; webServer sets `COOKIE_INSECURE` |
| P11-011 | blocker-check | Infra | Docker Desktop stopped → integration ECONNREFUSED | Started `annytrade-pg` + staging DB; migrate scripts load `.env.local` |

No open **blocker** defects after Phase 11 staging re-validation (2026-09-14). Live broker execution remains **OFF**.
