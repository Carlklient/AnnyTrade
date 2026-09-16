# AnnyTrade Phase 9 — Security Hardening, Privacy & Compliance Readiness

**Status:** Technical security controls implemented.  
**This document does not claim regulatory compliance, licenses, or approvals.**

Live execution remains **OFF** (`PHASE8_LIVE_SUBMISSION_HARD_BLOCK = true`).

---

## Part A — Technical controls (implemented)

### Threat model (summary)

| Threat | Controls |
|--------|----------|
| Authentication attacks | Argon2id passwords; lockout via rate limits; status CLOSED/SUSPENDED blocked |
| Session theft | HttpOnly + SameSite=Lax cookies; hashed session tokens; revoke-all on password reset |
| CSRF | Origin check on mutations; stricter in production (Origin required) |
| XSS | CSP site-wide; API `nosniff`; React escaping |
| SQL injection | Parameterized `postgres` queries |
| IDOR / privilege escalation | `user_id` scoped repos; opaque 404; IDOR integration tests |
| Credential stuffing | Auth rate limits; distributed Redis option |
| API / market-data abuse | Per-route rate limits; Redis REST for multi-instance |
| Order duplication | Idempotency keys + duplicate window |
| Broker credential theft | AES-256-GCM at rest; never logged; key rotation window |
| Webhook spoofing | HMAC verification + timestamp skew |
| Replay attacks | Event-id claim (memory + DB guard) |
| Admin compromise | No elevated admin trading console in Phase 9 |
| Dependency compromise | CI `npm audit` + AnnyTrade security workflow |

Full narrative: see sections below and `docs/annytrade/09-incident-response.md`.

### Rate limiting

- Default: process-local memory
- Production multi-instance: set `ANNYTRADE_REDIS_REST_URL` + `ANNYTRADE_REDIS_REST_TOKEN` (or Upstash equivalents)
- `ANNYTRADE_RATE_LIMIT_BACKEND=auto|memory|redis`
- Handlers use `rateLimitAsync`

### Secrets & key rotation

1. Store secrets in platform secret manager (Vercel/GitHub/Doppler) — never git
2. Broker user credentials encrypted (`secret-box`)
3. Rotation: set `ANNYTRADE_BROKER_ENCRYPTION_KEY_PREVIOUS`, new primary, rewrap, remove previous

### Privacy

- `GET/POST /api/annytrade/privacy/account` — data summary + closure (`confirmation: CLOSE`)
- Closure: status CLOSED, trading disabled, sessions revoked
- **Does not** auto-erase audits (retention is a legal question)

### Headers / CSP

- `next.config.ts` CSP + frame deny + permissions policy
- API `securityHeaders()` adds HSTS in production

### Webhooks

- `POST /api/annytrade/webhooks/provider` — HMAC + replay; **never** submits live orders

### Audit

- Hash-chained `integrity_hash` on audit append (technical control, not certified WORM)
- Retention strategy documented as requiring legal determination

### Signals / disclosures

- Signals explicitly not guarantees
- `RiskDisclosure` surfaces in shell + signals UI
- No fabricated SEC/FCA/FINRA claims

### DB least privilege (operator checklist)

Use a dedicated Postgres role for the app:

```sql
-- Illustrative — apply in your environment after legal/ops review
-- GRANT CONNECT ON DATABASE ... TO annytrade_app;
-- GRANT USAGE ON SCHEMA annytrade TO annytrade_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA annytrade TO annytrade_app;
-- Do NOT use superuser credentials in the application.
-- Prefer no DELETE on audit_events / execution_audit in production (revoke DELETE).
```

### Backups

- Encrypt backups at rest; restrict restore access
- Treat backups as containing PII + trading metadata
- Document restore drills; do not store encryption keys inside the same backup bundle

---

## Part B — Unresolved legal / compliance requirements

**Software does not answer these. Legal/regulatory determination required.**

1. **Jurisdictions served** — Which countries/states may use AnnyTrade?
2. **Broker model** — Introducing broker? Technology provider? Who holds customer funds?
3. **Investment-advice implications** — Do signals/copy risk being treated as advice?
4. **Signal functionality** — Marketing vs regulated research / recommendations?
5. **Customer identity (KYC/AML)** — What identity checks are required, and by whom?
6. **Record retention** — How long must orders, audits, communications be kept?
7. **Privacy laws** — GDPR/UK GDPR/CCPA/other applicability and lawful bases?
8. **Marketing claims** — What performance / capability claims are permitted?
9. **Risk disclosures** — What mandated disclosures apply before live trading?
10. **Licenses / memberships** — SEC, FCA, FINRA, or local equivalents — **none claimed by this software**

Compliance checklist placeholders remain `not_assessed` (`execution/compliance.ts`).

---

## Operator enablement (security)

CI: `.github/workflows/annytrade-security.yml`  
Tests: `security.test.ts`, `idor.integration.test.ts`, live hard-block suite  
Migration: `007_security_privacy.sql`
