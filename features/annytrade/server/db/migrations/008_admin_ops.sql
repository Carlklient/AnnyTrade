-- Phase 10: Admin authorization + operations observability

CREATE TABLE IF NOT EXISTS annytrade.admin_roles (
  user_id UUID PRIMARY KEY REFERENCES annytrade.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'ADMIN'
    CHECK (role IN ('ADMIN', 'OPERATOR', 'READONLY')),
  granted_by UUID REFERENCES annytrade.users (id) ON DELETE SET NULL,
  grant_source TEXT NOT NULL DEFAULT 'explicit'
    CHECK (grant_source IN ('explicit', 'env_bootstrap')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS annytrade.admin_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES annytrade.users (id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES annytrade.users (id) ON DELETE SET NULL,
  target_account_id UUID REFERENCES annytrade.trading_accounts (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_action_audit_created_idx
  ON annytrade.admin_action_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_action_audit_actor_idx
  ON annytrade.admin_action_audit (actor_user_id, created_at DESC);

-- Immutable ledger adjustments (append-only; never rewrite trade history)
CREATE TABLE IF NOT EXISTS annytrade.ledger_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES annytrade.trading_accounts (id) ON DELETE CASCADE,
  ledger_entry_id UUID NOT NULL REFERENCES annytrade.account_ledger_entries (id) ON DELETE RESTRICT,
  operator_user_id UUID NOT NULL REFERENCES annytrade.users (id) ON DELETE CASCADE,
  amount NUMERIC(20, 8) NOT NULL,
  currency TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ledger_adjustments_account_idx
  ON annytrade.ledger_adjustments (account_id, created_at DESC);

-- Rate-limit / security event telemetry (ops visibility)
CREATE TABLE IF NOT EXISTS annytrade.rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  client_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limit_events_created_idx
  ON annytrade.rate_limit_events (created_at DESC);

-- Background job run monitoring
CREATE TABLE IF NOT EXISTS annytrade.job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('RUNNING', 'SUCCEEDED', 'FAILED')),
  user_id UUID REFERENCES annytrade.users (id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS job_runs_name_started_idx
  ON annytrade.job_runs (job_name, started_at DESC);

-- Notification delivery failures (when email/provider fails)
CREATE TABLE IF NOT EXISTS annytrade.notification_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES annytrade.users (id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notification_failures_created_idx
  ON annytrade.notification_failures (created_at DESC);
