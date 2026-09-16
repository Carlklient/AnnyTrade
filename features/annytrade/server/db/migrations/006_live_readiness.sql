-- Phase 8: Live execution readiness — safety controls (LIVE remains disabled)

-- Account-level trading disable switch
CREATE TABLE IF NOT EXISTS annytrade.trading_controls (
  account_id UUID PRIMARY KEY REFERENCES annytrade.trading_accounts (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES annytrade.users (id) ON DELETE CASCADE,
  trading_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  disabled_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trading_controls_user_idx
  ON annytrade.trading_controls (user_id);

-- Operational alerts (append-only style; acknowledge separately)
CREATE TABLE IF NOT EXISTS annytrade.ops_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL
    CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  message TEXT NOT NULL,
  user_id UUID REFERENCES annytrade.users (id) ON DELETE SET NULL,
  connection_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ops_alerts_created_idx
  ON annytrade.ops_alerts (created_at DESC);

CREATE INDEX IF NOT EXISTS ops_alerts_type_idx
  ON annytrade.ops_alerts (alert_type, created_at DESC);

-- Order review confirmations (for future live; sandbox may use too)
CREATE TABLE IF NOT EXISTS annytrade.order_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES annytrade.users (id) ON DELETE CASCADE,
  account_id UUID REFERENCES annytrade.trading_accounts (id) ON DELETE SET NULL,
  environment TEXT NOT NULL
    CHECK (environment IN ('INTERNAL_PAPER', 'BROKER_SANDBOX', 'BROKER_LIVE')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION'
    CHECK (status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'EXPIRED', 'BLOCKED')),
  blocked_reason TEXT,
  confirmed_at TIMESTAMPTZ,
  client_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_reviews_user_idx
  ON annytrade.order_reviews (user_id, created_at DESC);

-- Broker connection token lifecycle columns (secrets remain ciphertext)
ALTER TABLE annytrade.broker_connections
  ADD COLUMN IF NOT EXISTS credentials_rotated_at TIMESTAMPTZ;

ALTER TABLE annytrade.broker_connections
  ADD COLUMN IF NOT EXISTS credentials_expires_at TIMESTAMPTZ;

-- Immutable-style execution audit (append-only; no UPDATE/DELETE grants implied)
CREATE TABLE IF NOT EXISTS annytrade.execution_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES annytrade.users (id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  environment TEXT NOT NULL
    CHECK (environment IN ('INTERNAL_PAPER', 'BROKER_SANDBOX', 'BROKER_LIVE')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS execution_audit_created_idx
  ON annytrade.execution_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS execution_audit_env_idx
  ON annytrade.execution_audit (environment, created_at DESC);

-- Compliance checklist placeholders (never auto-approve)
CREATE TABLE IF NOT EXISTS annytrade.compliance_checklist (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_assessed'
    CHECK (status IN ('not_assessed', 'pending', 'complete', 'blocked', 'not_applicable')),
  requires_human_sign_off BOOLEAN NOT NULL DEFAULT TRUE,
  signed_off_at TIMESTAMPTZ,
  signed_off_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
