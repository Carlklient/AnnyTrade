-- Phase 7: Broker sandbox connections + mirrored orders (never LIVE money)

-- Allow BROKER_SANDBOX account type alongside AnnyTrade PAPER (separate ledgers).
ALTER TABLE annytrade.trading_accounts
  DROP CONSTRAINT IF EXISTS trading_accounts_account_type_check;

ALTER TABLE annytrade.trading_accounts
  ADD CONSTRAINT trading_accounts_account_type_check
  CHECK (account_type IN ('PAPER', 'BROKER_SANDBOX'));

CREATE TABLE IF NOT EXISTS annytrade.broker_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES annytrade.users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL
    CHECK (provider IN ('alpaca_paper', 'test')),
  -- Hard invariant: only SANDBOX / paper broker environments are allowed.
  environment TEXT NOT NULL DEFAULT 'SANDBOX'
    CHECK (environment = 'SANDBOX'),
  status TEXT NOT NULL DEFAULT 'DISCONNECTED'
    CHECK (status IN (
      'DISCONNECTED',
      'CREDENTIALS_REQUIRED',
      'CONNECTING',
      'CONNECTED',
      'ERROR',
      'DISABLED'
    )),
  api_key_ciphertext TEXT,
  api_secret_ciphertext TEXT,
  key_id_hint TEXT,
  external_account_id TEXT,
  trading_account_id UUID REFERENCES annytrade.trading_accounts (id) ON DELETE SET NULL,
  last_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS broker_connections_user_idx
  ON annytrade.broker_connections (user_id);

CREATE TABLE IF NOT EXISTS annytrade.broker_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES annytrade.broker_connections (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES annytrade.users (id) ON DELETE CASCADE,
  client_order_id TEXT NOT NULL,
  broker_order_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  order_type TEXT NOT NULL
    CHECK (order_type IN ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT')),
  quantity NUMERIC(24, 8) NOT NULL,
  limit_price NUMERIC(24, 8),
  stop_price NUMERIC(24, 8),
  time_in_force TEXT NOT NULL DEFAULT 'day',
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN (
      'PENDING',
      'SUBMITTED',
      'OPEN',
      'PARTIALLY_FILLED',
      'FILLED',
      'CANCELLED',
      'REJECTED',
      'EXPIRED',
      'ERROR'
    )),
  filled_quantity NUMERIC(24, 8) NOT NULL DEFAULT 0,
  average_fill_price NUMERIC(24, 8),
  broker_raw_status TEXT,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, client_order_id)
);

CREATE INDEX IF NOT EXISTS broker_orders_user_idx
  ON annytrade.broker_orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS broker_orders_broker_id_idx
  ON annytrade.broker_orders (broker_order_id)
  WHERE broker_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS annytrade.broker_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_order_id UUID NOT NULL REFERENCES annytrade.broker_orders (id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES annytrade.broker_connections (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES annytrade.users (id) ON DELETE CASCADE,
  external_execution_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity NUMERIC(24, 8) NOT NULL,
  price NUMERIC(24, 8) NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, external_execution_id)
);

CREATE TABLE IF NOT EXISTS annytrade.broker_event_dedupe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES annytrade.broker_connections (id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, event_key)
);

CREATE TABLE IF NOT EXISTS annytrade.broker_positions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES annytrade.broker_connections (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES annytrade.users (id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity NUMERIC(24, 8) NOT NULL,
  average_entry NUMERIC(24, 8) NOT NULL,
  market_value NUMERIC(24, 8),
  unrealized_pl NUMERIC(24, 8),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (connection_id, symbol)
);
