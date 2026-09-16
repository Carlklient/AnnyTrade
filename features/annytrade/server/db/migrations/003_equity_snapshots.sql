-- Phase 4: equity history snapshots for drawdown / returns (no fake reconstruction)

CREATE TABLE IF NOT EXISTS annytrade.equity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES annytrade.trading_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES annytrade.users(id) ON DELETE CASCADE,
  as_of DATE NOT NULL,
  cash_balance NUMERIC(20, 8) NOT NULL,
  market_value NUMERIC(20, 8) NOT NULL DEFAULT 0,
  cost_basis NUMERIC(20, 8) NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
  realized_pnl NUMERIC(20, 8) NOT NULL DEFAULT 0,
  fees_paid NUMERIC(20, 8) NOT NULL DEFAULT 0,
  equity NUMERIC(20, 8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  marks_complete BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, as_of)
);

CREATE INDEX IF NOT EXISTS equity_snapshots_user_as_of_idx
  ON annytrade.equity_snapshots (user_id, as_of DESC);

CREATE INDEX IF NOT EXISTS equity_snapshots_account_as_of_idx
  ON annytrade.equity_snapshots (account_id, as_of ASC);
