# AnnyTrade Phase 8 — Live Broker Execution Readiness

## Status

**LIVE EXECUTION DISABLED.**

Architecture and safety controls for eventual `BROKER_LIVE` are in place.
No real-money orders can be submitted. Sandbox success is **not** treated as
proof of live launch readiness.

## Execution environments

| Environment | Label | Real money | Default |
|-------------|-------|------------|---------|
| `INTERNAL_PAPER` | AnnyTrade PAPER | No | Active (Phase 3 engine) |
| `BROKER_SANDBOX` | Broker Paper / Sandbox | No | Active (Phase 7; kill-switched) |
| `BROKER_LIVE` | Broker Live | Yes | **DISABLED** |

UI Demo / UI Preview (`ModeSwitch`) is **not** an execution environment and cannot
enable Broker Live.

## Feature flags (all required; defaults OFF)

```
ANNYTRADE_BROKER_LIVE_ENABLED=false
ANNYTRADE_BROKER_LIVE_ORDERS_ENABLED=false
ANNYTRADE_ALLOW_LIVE_TRADING=false
ANNYTRADE_LIVE_OPERATOR_CONFIRMATION=   # must equal ENABLE_LIVE_TRADING_I_UNDERSTAND_THE_RISKS
ANNYTRADE_EMERGENCY_KILL_SWITCH=false   # true → disables ALL broker orders
```

Even if every env flag is set, Phase 8 keeps:

`PHASE8_LIVE_SUBMISSION_HARD_BLOCK = true`

in code. Env alone cannot unlock live submission.

Sandbox orders still require `ANNYTRADE_BROKER_ORDERS_ENABLED=true`.

## Safety controls

- Order review confirmation (symbol, side, qty, type, limit/stop, est. value, market, account, environment)
- Duplicate-order window + `clientOrderId` idempotency
- Stale-price protection (server quotes)
- Server-side max notional / quantity / open-order limits
- Account-level trading disable (`POST /api/annytrade/accounts/[id]/trading`)
- Global emergency kill switch
- Market/broker mark disagreement check
- Broker connectivity checks before sandbox orders
- Reconcile before/after sandbox order activity
- Authoritative broker balance/position sync on reconcile (frontend never authoritative)
- Encrypted broker token lifecycle metadata
- Stronger rate limits on live endpoints
- Immutable `execution_audit` + `ops_alerts`
- Compliance checklist placeholders (**not** auto-approved)
- No customer fund custody / no arbitrary crypto custody

## APIs

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/annytrade/execution/readiness` | Aggregate readiness |
| POST | `/api/annytrade/execution/order-review` | Review object (LIVE → BLOCKED) |
| GET | `/api/annytrade/broker/live/status` | Always disabled |
| GET/POST | `/api/annytrade/broker/live/orders` | POST always 403 `LIVE_EXECUTION_DISABLED` |
| POST | `/api/annytrade/accounts/[id]/trading` | Account trading enable/disable |

## Migration

`006_live_readiness.sql` — trading_controls, ops_alerts, order_reviews,
execution_audit, compliance_checklist, credential rotation columns.

## Operator steps before live trading (human-gated)

Do **not** treat this list as approval. A future phase must also remove the
code hard block under review.

1. Complete jurisdiction / broker eligibility assessment (human sign-off).
2. Execute live broker account agreement and API terms with the licensed broker.
3. Confirm KYC/AML is handled by the broker; AnnyTrade does not custody funds.
4. Publish customer risk disclosures for live trading.
5. Finalize incident / emergency kill-switch runbook and on-call.
6. Document reconciliation SLA and mismatch escalation.
7. Pass extended sandbox E2E and paper/broker isolation regression.
8. Provision live broker API credentials in a secrets manager (never in git).
9. Implement and review a dedicated live broker adapter (official APIs only).
10. Set **all** live env flags + operator confirmation phrase in production only.
11. Flip `PHASE8_LIVE_SUBMISSION_HARD_BLOCK` (or successor) in a reviewed PR.
12. Enable with monitoring: connectivity, reconcile, rejection, stuck-order alerts.
13. Keep `ANNYTRADE_EMERGENCY_KILL_SWITCH` runnable without deploy.

## Tests

- `features/annytrade/server/execution/live-readiness.test.ts` proves LIVE stays blocked
  even when all env flags are true.
- Sandbox smoke remains: `npm run annytrade:test:broker-sandbox` (optional, not CI).
