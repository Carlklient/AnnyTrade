-- AnnyTrade Phase 1 core schema
CREATE SCHEMA IF NOT EXISTS annytrade;

CREATE TABLE IF NOT EXISTS annytrade.schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS annytrade.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS annytrade.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES annytrade.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON annytrade.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON annytrade.sessions(expires_at);

CREATE TABLE IF NOT EXISTS annytrade.profiles (
  user_id UUID PRIMARY KEY REFERENCES annytrade.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  preferred_currency TEXT NOT NULL DEFAULT 'USD',
  theme_preference TEXT NOT NULL DEFAULT 'dark'
    CHECK (theme_preference IN ('dark', 'light', 'system')),
  default_market TEXT NOT NULL DEFAULT 'forex',
  notify_orders BOOLEAN NOT NULL DEFAULT TRUE,
  notify_signals BOOLEAN NOT NULL DEFAULT TRUE,
  notify_security BOOLEAN NOT NULL DEFAULT TRUE,
  notify_marketing BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS annytrade.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES annytrade.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS watchlists_user_id_idx ON annytrade.watchlists(user_id);

CREATE TABLE IF NOT EXISTS annytrade.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES annytrade.watchlists(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (watchlist_id, symbol)
);

CREATE INDEX IF NOT EXISTS watchlist_items_watchlist_id_idx ON annytrade.watchlist_items(watchlist_id);

CREATE TABLE IF NOT EXISTS annytrade.trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES annytrade.users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL DEFAULT 'PAPER'
    CHECK (account_type IN ('PAPER')),
  base_currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  label TEXT NOT NULL DEFAULT 'Paper account',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trading_accounts_user_id_idx ON annytrade.trading_accounts(user_id);

CREATE TABLE IF NOT EXISTS annytrade.account_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES annytrade.trading_accounts(id) ON DELETE CASCADE,
  category TEXT NOT NULL
    CHECK (category IN ('INITIAL_BALANCE', 'TRADE_DEBIT', 'TRADE_CREDIT', 'FEE', 'ADJUSTMENT')),
  amount NUMERIC(20, 8) NOT NULL,
  currency TEXT NOT NULL,
  memo TEXT,
  related_order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ledger_account_id_idx ON annytrade.account_ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS ledger_created_at_idx ON annytrade.account_ledger_entries(created_at);

CREATE TABLE IF NOT EXISTS annytrade.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES annytrade.trading_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES annytrade.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  order_type TEXT NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT')),
  quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
  limit_price NUMERIC(20, 8),
  stop_price NUMERIC(20, 8),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED')),
  filled_quantity NUMERIC(20, 8) NOT NULL DEFAULT 0,
  average_fill_price NUMERIC(20, 8),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON annytrade.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_account_id_idx ON annytrade.orders(account_id);

CREATE TABLE IF NOT EXISTS annytrade.executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES annytrade.orders(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES annytrade.trading_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES annytrade.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
  price NUMERIC(20, 8) NOT NULL,
  fee NUMERIC(20, 8) NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  external_execution_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS executions_order_id_idx ON annytrade.executions(order_id);
CREATE INDEX IF NOT EXISTS executions_user_id_idx ON annytrade.executions(user_id);

CREATE TABLE IF NOT EXISTS annytrade.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES annytrade.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON annytrade.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON annytrade.notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS annytrade.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES annytrade.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_user_id_idx ON annytrade.audit_events(user_id);
CREATE INDEX IF NOT EXISTS audit_events_type_idx ON annytrade.audit_events(event_type);
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON annytrade.audit_events(created_at DESC);

CREATE TABLE IF NOT EXISTS annytrade.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES annytrade.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS annytrade.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES annytrade.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
