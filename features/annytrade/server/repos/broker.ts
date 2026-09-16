import { getSql } from "../db/client";

export type DbBrokerConnection = {
  id: string;
  user_id: string;
  provider: string;
  environment: "SANDBOX";
  status: string;
  api_key_ciphertext: string | null;
  api_secret_ciphertext: string | null;
  key_id_hint: string | null;
  external_account_id: string | null;
  trading_account_id: string | null;
  last_error: string | null;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export async function upsertBrokerConnection(input: {
  userId: string;
  provider: string;
  status: string;
  apiKeyCiphertext?: string | null;
  apiSecretCiphertext?: string | null;
  keyIdHint?: string | null;
  externalAccountId?: string | null;
  tradingAccountId?: string | null;
  lastError?: string | null;
}): Promise<DbBrokerConnection> {
  const sql = getSql();
  const rows = await sql<DbBrokerConnection[]>`
    INSERT INTO annytrade.broker_connections (
      user_id, provider, environment, status,
      api_key_ciphertext, api_secret_ciphertext, key_id_hint,
      external_account_id, trading_account_id, last_error, updated_at
    ) VALUES (
      ${input.userId},
      ${input.provider},
      'SANDBOX',
      ${input.status},
      ${input.apiKeyCiphertext ?? null},
      ${input.apiSecretCiphertext ?? null},
      ${input.keyIdHint ?? null},
      ${input.externalAccountId ?? null},
      ${input.tradingAccountId ?? null},
      ${input.lastError ?? null},
      NOW()
    )
    ON CONFLICT (user_id, provider) DO UPDATE SET
      status = EXCLUDED.status,
      api_key_ciphertext = COALESCE(EXCLUDED.api_key_ciphertext, annytrade.broker_connections.api_key_ciphertext),
      api_secret_ciphertext = COALESCE(EXCLUDED.api_secret_ciphertext, annytrade.broker_connections.api_secret_ciphertext),
      key_id_hint = COALESCE(EXCLUDED.key_id_hint, annytrade.broker_connections.key_id_hint),
      external_account_id = COALESCE(EXCLUDED.external_account_id, annytrade.broker_connections.external_account_id),
      trading_account_id = COALESCE(EXCLUDED.trading_account_id, annytrade.broker_connections.trading_account_id),
      last_error = EXCLUDED.last_error,
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0]!;
}

export async function getBrokerConnectionForUser(
  userId: string,
  provider = "alpaca_paper",
): Promise<DbBrokerConnection | null> {
  const sql = getSql();
  const rows = await sql<DbBrokerConnection[]>`
    SELECT * FROM annytrade.broker_connections
    WHERE user_id = ${userId} AND provider = ${provider}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function touchBrokerSync(
  connectionId: string,
  status?: string,
  lastError?: string | null,
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE annytrade.broker_connections SET
      last_synced_at = NOW(),
      status = COALESCE(${status ?? null}, status),
      last_error = ${lastError ?? null},
      updated_at = NOW()
    WHERE id = ${connectionId}
  `;
}

export type DbBrokerOrder = {
  id: string;
  connection_id: string;
  user_id: string;
  client_order_id: string;
  broker_order_id: string | null;
  symbol: string;
  side: string;
  order_type: string;
  quantity: string;
  limit_price: string | null;
  stop_price: string | null;
  time_in_force: string;
  status: string;
  filled_quantity: string;
  average_fill_price: string | null;
  broker_raw_status: string | null;
  reject_reason: string | null;
  created_at: Date;
  updated_at: Date;
};

export async function insertBrokerOrder(input: {
  connectionId: string;
  userId: string;
  clientOrderId: string;
  symbol: string;
  side: string;
  orderType: string;
  quantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  timeInForce?: string;
}): Promise<DbBrokerOrder> {
  const sql = getSql();
  const rows = await sql<DbBrokerOrder[]>`
    INSERT INTO annytrade.broker_orders (
      connection_id, user_id, client_order_id, symbol, side, order_type,
      quantity, limit_price, stop_price, time_in_force, status
    ) VALUES (
      ${input.connectionId},
      ${input.userId},
      ${input.clientOrderId},
      ${input.symbol.toUpperCase()},
      ${input.side},
      ${input.orderType},
      ${input.quantity},
      ${input.limitPrice ?? null},
      ${input.stopPrice ?? null},
      ${input.timeInForce ?? "day"},
      'PENDING'
    )
    ON CONFLICT (connection_id, client_order_id) DO UPDATE SET
      updated_at = annytrade.broker_orders.updated_at
    RETURNING *
  `;
  return rows[0]!;
}

export async function getBrokerOrderByClientId(
  connectionId: string,
  clientOrderId: string,
): Promise<DbBrokerOrder | null> {
  const sql = getSql();
  const rows = await sql<DbBrokerOrder[]>`
    SELECT * FROM annytrade.broker_orders
    WHERE connection_id = ${connectionId} AND client_order_id = ${clientOrderId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getBrokerOrderForUser(
  userId: string,
  orderId: string,
): Promise<DbBrokerOrder | null> {
  const sql = getSql();
  const rows = await sql<DbBrokerOrder[]>`
    SELECT * FROM annytrade.broker_orders
    WHERE id = ${orderId} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listBrokerOrdersForUser(
  userId: string,
  limit = 50,
): Promise<DbBrokerOrder[]> {
  const sql = getSql();
  return sql<DbBrokerOrder[]>`
    SELECT * FROM annytrade.broker_orders
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function updateBrokerOrderFromRemote(input: {
  id: string;
  brokerOrderId: string;
  status: string;
  filledQuantity: number;
  averageFillPrice: number | null;
  brokerRawStatus: string;
  rejectReason?: string | null;
}): Promise<DbBrokerOrder> {
  const sql = getSql();
  const rows = await sql<DbBrokerOrder[]>`
    UPDATE annytrade.broker_orders SET
      broker_order_id = ${input.brokerOrderId},
      status = ${input.status},
      filled_quantity = ${input.filledQuantity},
      average_fill_price = ${input.averageFillPrice},
      broker_raw_status = ${input.brokerRawStatus},
      reject_reason = ${input.rejectReason ?? null},
      updated_at = NOW()
    WHERE id = ${input.id}
    RETURNING *
  `;
  return rows[0]!;
}

export async function tryInsertBrokerExecution(input: {
  brokerOrderId: string;
  connectionId: string;
  userId: string;
  externalExecutionId: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  executedAt: Date;
}): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO annytrade.broker_executions (
      broker_order_id, connection_id, user_id, external_execution_id,
      symbol, side, quantity, price, executed_at
    ) VALUES (
      ${input.brokerOrderId},
      ${input.connectionId},
      ${input.userId},
      ${input.externalExecutionId},
      ${input.symbol},
      ${input.side},
      ${input.quantity},
      ${input.price},
      ${input.executedAt}
    )
    ON CONFLICT (connection_id, external_execution_id) DO NOTHING
    RETURNING id
  `;
  return rows.length > 0;
}

export async function tryClaimBrokerEvent(
  connectionId: string,
  eventKey: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO annytrade.broker_event_dedupe (connection_id, event_key)
    VALUES (${connectionId}, ${eventKey})
    ON CONFLICT (connection_id, event_key) DO NOTHING
    RETURNING id
  `;
  return rows.length > 0;
}

export async function upsertBrokerPositionCache(input: {
  connectionId: string;
  userId: string;
  symbol: string;
  quantity: number;
  averageEntry: number;
  marketValue: number | null;
  unrealizedPl: number | null;
}): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO annytrade.broker_positions_cache (
      connection_id, user_id, symbol, quantity, average_entry,
      market_value, unrealized_pl, synced_at
    ) VALUES (
      ${input.connectionId},
      ${input.userId},
      ${input.symbol},
      ${input.quantity},
      ${input.averageEntry},
      ${input.marketValue},
      ${input.unrealizedPl},
      NOW()
    )
    ON CONFLICT (connection_id, symbol) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      average_entry = EXCLUDED.average_entry,
      market_value = EXCLUDED.market_value,
      unrealized_pl = EXCLUDED.unrealized_pl,
      synced_at = NOW()
  `;
}

export async function listBrokerPositionCache(connectionId: string) {
  const sql = getSql();
  return sql<
    {
      symbol: string;
      quantity: string;
      average_entry: string;
      market_value: string | null;
      unrealized_pl: string | null;
      synced_at: Date;
    }[]
  >`
    SELECT symbol, quantity::text, average_entry::text,
      market_value::text, unrealized_pl::text, synced_at
    FROM annytrade.broker_positions_cache
    WHERE connection_id = ${connectionId}
  `;
}

export async function ensureBrokerSandboxAccount(
  userId: string,
): Promise<string> {
  const sql = getSql();
  const existing = await sql<{ id: string }[]>`
    SELECT id FROM annytrade.trading_accounts
    WHERE user_id = ${userId} AND account_type = 'BROKER_SANDBOX'
    LIMIT 1
  `;
  if (existing[0]) return existing[0].id;
  const rows = await sql<{ id: string }[]>`
    INSERT INTO annytrade.trading_accounts (
      user_id, account_type, base_currency, status, label
    ) VALUES (
      ${userId}, 'BROKER_SANDBOX', 'USD', 'ACTIVE', 'Broker Paper / Sandbox'
    )
    RETURNING id
  `;
  return rows[0]!.id;
}
