-- Phase 6: price alerts + notification preference columns

ALTER TABLE annytrade.profiles
  ADD COLUMN IF NOT EXISTS notify_price_alerts BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE annytrade.profiles
  ADD COLUMN IF NOT EXISTS notify_email_alerts BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS annytrade.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES annytrade.users (id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  condition TEXT NOT NULL
    CHECK (condition IN ('PRICE_ABOVE', 'PRICE_BELOW', 'PCT_MOVE')),
  target_value NUMERIC(24, 8) NOT NULL,
  baseline_price NUMERIC(24, 8),
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'TRIGGERED', 'DISABLED', 'CANCELLED')),
  cooldown_seconds INT NOT NULL DEFAULT 3600
    CHECK (cooldown_seconds >= 60 AND cooldown_seconds <= 86400),
  last_triggered_at TIMESTAMPTZ,
  trigger_count INT NOT NULL DEFAULT 0,
  armed BOOLEAN NOT NULL DEFAULT TRUE,
  notify_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  notify_email BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS price_alerts_user_status_idx
  ON annytrade.price_alerts (user_id, status);

CREATE INDEX IF NOT EXISTS price_alerts_active_symbol_idx
  ON annytrade.price_alerts (symbol)
  WHERE status = 'ACTIVE';
