-- Phase 3: paper trading positions + order idempotency / stop activation

ALTER TABLE annytrade.orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS orders_user_idempotency_uidx
  ON annytrade.orders (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_open_status_idx
  ON annytrade.orders (account_id, status)
  WHERE status IN ('PENDING', 'OPEN', 'PARTIALLY_FILLED');

CREATE UNIQUE INDEX IF NOT EXISTS executions_external_id_uidx
  ON annytrade.executions (external_execution_id)
  WHERE external_execution_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS annytrade.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES annytrade.trading_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES annytrade.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL CHECK (quantity >= 0),
  average_entry NUMERIC(20, 8) NOT NULL CHECK (average_entry >= 0),
  cost_basis NUMERIC(20, 8) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  UNIQUE (account_id, symbol)
);

CREATE INDEX IF NOT EXISTS positions_user_id_idx ON annytrade.positions(user_id);
CREATE INDEX IF NOT EXISTS positions_account_open_idx
  ON annytrade.positions (account_id)
  WHERE quantity > 0 AND closed_at IS NULL;
