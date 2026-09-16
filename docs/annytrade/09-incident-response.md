# AnnyTrade — Incident Response (technical playbook)

This is an **operational** playbook. It is not a certified SOC 2 / ISO procedure and does not satisfy regulatory incident obligations by itself.

## Severity

| Level | Examples |
|-------|----------|
| SEV1 | Suspected broker credential leak; live trading accidentally enabled; mass session theft |
| SEV2 | Auth bypass / IDOR confirmed; webhook forgery; ransomware on DB |
| SEV3 | Rate-limit outage; single-user account compromise; dependency CVE high |
| SEV4 | Failed login spikes; noisy alerts |

## Immediate actions (SEV1/SEV2)

1. **Kill switches**
   - Set `ANNYTRADE_EMERGENCY_KILL_SWITCH=true`
   - Ensure `ANNYTRADE_BROKER_ORDERS_ENABLED=false`
   - Confirm `PHASE8_LIVE_SUBMISSION_HARD_BLOCK` remains true (or redeploy last known good)
2. **Rotate secrets** — session signing/DB URLs, broker API keys, encryption keys (use PREVIOUS window), webhook HMAC
3. **Revoke sessions** — `revokeAllUserSessions` for affected users; consider global session wipe
4. **Preserve evidence** — snapshot logs/audits; do not wipe `audit_events` / `execution_audit`
5. **Notify** — internal on-call; legal/compliance contacts as required by jurisdiction (TBD legally)

## Detection sources

- `ops_alerts` (broker outage, reconcile mismatch, live_blocked_attempt, webhook failures)
- Auth audit: `auth.login_failed`, `auth.login_blocked`
- Rate-limit 429 spikes
- Dependency scan failures in CI

## Containment / recovery

- Disable broker connect endpoints via env if needed
- Rotate `ANNYTRADE_BROKER_ENCRYPTION_KEY` with PREVIOUS decrypt window; rewrap ciphertext
- Restore DB from encrypted backup only after integrity review
- Post-incident: write timeline; update threat model; add regression tests

## Contacts

Fill with real on-call / legal / broker contacts (not stored as approved compliance):

- Engineering on-call: _TBD_
- Legal / privacy: _TBD_
- Broker support: _TBD_
