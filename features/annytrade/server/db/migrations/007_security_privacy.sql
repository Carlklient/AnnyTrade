-- Phase 9: Privacy, audit integrity, webhook replay, closure workflow

CREATE TABLE IF NOT EXISTS annytrade.account_closure_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES annytrade.users (id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'CLOSED'
    CHECK (status IN ('REQUESTED', 'CLOSED', 'ERASURE_PENDING', 'ERASED')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS account_closure_user_idx
  ON annytrade.account_closure_requests (user_id, created_at DESC);

-- Durable webhook / event replay protection (complements in-memory claim)
CREATE TABLE IF NOT EXISTS annytrade.webhook_replay_guard (
  event_id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'unknown',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS webhook_replay_expires_idx
  ON annytrade.webhook_replay_guard (expires_at);

-- Audit integrity chain (hash-linked append markers; not a legal seal)
ALTER TABLE annytrade.audit_events
  ADD COLUMN IF NOT EXISTS integrity_hash TEXT;

ALTER TABLE annytrade.execution_audit
  ADD COLUMN IF NOT EXISTS integrity_hash TEXT;

CREATE TABLE IF NOT EXISTS annytrade.audit_integrity_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream TEXT NOT NULL CHECK (stream IN ('audit_events', 'execution_audit')),
  last_event_id UUID,
  chain_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Privacy preferences placeholders (marketing opt-in already on profiles)
ALTER TABLE annytrade.profiles
  ADD COLUMN IF NOT EXISTS data_processing_acknowledged_at TIMESTAMPTZ;

ALTER TABLE annytrade.profiles
  ADD COLUMN IF NOT EXISTS risk_disclosure_acknowledged_at TIMESTAMPTZ;
