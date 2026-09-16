# AnnyTrade Phase 11 — Test Matrix

Live broker execution remains **OFF** (`PHASE8_LIVE_SUBMISSION_HARD_BLOCK`).

## Unit

| Area | Location | Status |
|------|----------|--------|
| Indicators | `lib/indicators/indicators.test.ts` | Covered |
| Portfolio calc | `server/portfolio/calc.test.ts` | Covered |
| Validation / schemas | `server/validation/schemas.test.ts` | Covered |
| Normalization | `server/market/market.test.ts` | Covered |
| Signal rules | `server/analysis/signal-engine.test.ts` | Covered |
| Alerts conditions | `server/alerts/engine.test.ts` | Covered |
| Stale price / risk / live block | `server/execution/live-readiness.test.ts` | Covered |
| Security redaction / webhooks | `server/security/security.test.ts` | Covered |
| Broker fixtures | `server/broker/broker.test.ts` | Covered |
| Order rules (risk/dup/normalize) | `server/testing/order-rules.test.ts` | Phase 11 |
| Provider failure fixtures | `server/testing/provider-failure.test.ts` | Phase 11 |
| Broker failure fixtures | `server/testing/broker-failure.test.ts` | Phase 11 |
| Load fixtures | `server/testing/load.fixture.test.ts` | Phase 11 |
| Security attack surface | `server/testing/security-attacks.test.ts` | Phase 11 |

## Integration (PostgreSQL)

| Area | Location |
|------|----------|
| Auth / watchlists | `phase1.integration.test.ts` |
| Paper engine + concurrency | `trading/paper.integration.test.ts` |
| Portfolio analytics | `portfolio/portfolio.integration.test.ts` |
| IDOR | `security/idor.integration.test.ts` |
| Admin isolation | `admin/admin.integration.test.ts` |
| Order races / cancel-vs-fill | `testing/concurrency.integration.test.ts` |
| DB recoverable failure | `testing/db-failure.integration.test.ts` |

## E2E (Playwright)

| Flow | Spec |
|------|------|
| Register → login → desk smoke | `e2e/annytrade/auth-desk.spec.ts` |
| Paper trade path (API-assisted) | `e2e/annytrade/paper-trading-api.spec.ts` |
| Desk route smoke | `e2e/annytrade/paper-flow.spec.ts` |
| Mobile + desktop viewports | same specs (`projects`) |
| Accessibility smoke | `e2e/annytrade/a11y.spec.ts` |

## Failure / load / staging

| Category | Approach |
|----------|----------|
| Market outage / 429 / malformed / stale / WS | Fixture providers in unit tests |
| Broker timeout / dup webhook / partial / reject | Test broker + webhook helpers |
| Load | In-process fixture concurrency only — **no** third-party API load |
| Staging | Separate DB + secrets; see `11-staging.md` |

## Gate commands

```bash
npm test
npm run annytrade:test:phase11
npm run annytrade:test:e2e          # requires app + DB
npm run annytrade:test:load
```
