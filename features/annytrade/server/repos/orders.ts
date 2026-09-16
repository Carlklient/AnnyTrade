import { getSql } from "../db/client";
import type {
  DbOrder,
  OrderSide,
  OrderStatus,
  OrderType,
} from "../domain/types";

export type InsertOrderInput = {
  accountId: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  status: OrderStatus;
  rejectReason?: string | null;
  idempotencyKey?: string | null;
};

export async function findOrderByIdempotency(
  userId: string,
  idempotencyKey: string,
): Promise<DbOrder | null> {
  const sql = getSql();
  const rows = await sql<DbOrder[]>`
    SELECT * FROM annytrade.orders
    WHERE user_id = ${userId} AND idempotency_key = ${idempotencyKey}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function insertOrder(input: InsertOrderInput): Promise<DbOrder> {
  const sql = getSql();
  const rows = await sql<DbOrder[]>`
    INSERT INTO annytrade.orders (
      account_id, user_id, symbol, side, order_type, quantity,
      limit_price, stop_price, status, reject_reason, idempotency_key
    ) VALUES (
      ${input.accountId},
      ${input.userId},
      ${input.symbol},
      ${input.side},
      ${input.orderType},
      ${input.quantity},
      ${input.limitPrice ?? null},
      ${input.stopPrice ?? null},
      ${input.status},
      ${input.rejectReason ?? null},
      ${input.idempotencyKey ?? null}
    )
    RETURNING *
  `;
  const order = rows[0];
  if (!order) throw new Error("Failed to insert order");
  return order;
}

export async function getOrderForUser(
  orderId: string,
  userId: string,
): Promise<DbOrder | null> {
  const sql = getSql();
  const rows = await sql<DbOrder[]>`
    SELECT * FROM annytrade.orders
    WHERE id = ${orderId} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listOrdersForUser(
  userId: string,
  options?: {
    accountId?: string;
    status?: OrderStatus | OrderStatus[];
    limit?: number;
  },
): Promise<DbOrder[]> {
  const sql = getSql();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 200);
  const statuses = options?.status
    ? Array.isArray(options.status)
      ? options.status
      : [options.status]
    : null;

  if (options?.accountId && statuses) {
    return sql<DbOrder[]>`
      SELECT * FROM annytrade.orders
      WHERE user_id = ${userId}
        AND account_id = ${options.accountId}
        AND status = ANY(${statuses})
      ORDER BY submitted_at DESC
      LIMIT ${limit}
    `;
  }
  if (options?.accountId) {
    return sql<DbOrder[]>`
      SELECT * FROM annytrade.orders
      WHERE user_id = ${userId} AND account_id = ${options.accountId}
      ORDER BY submitted_at DESC
      LIMIT ${limit}
    `;
  }
  if (statuses) {
    return sql<DbOrder[]>`
      SELECT * FROM annytrade.orders
      WHERE user_id = ${userId} AND status = ANY(${statuses})
      ORDER BY submitted_at DESC
      LIMIT ${limit}
    `;
  }
  return sql<DbOrder[]>`
    SELECT * FROM annytrade.orders
    WHERE user_id = ${userId}
    ORDER BY submitted_at DESC
    LIMIT ${limit}
  `;
}

export async function listOpenOrdersForAccount(
  accountId: string,
): Promise<DbOrder[]> {
  const sql = getSql();
  return sql<DbOrder[]>`
    SELECT * FROM annytrade.orders
    WHERE account_id = ${accountId}
      AND status IN ('PENDING', 'OPEN', 'PARTIALLY_FILLED')
    ORDER BY submitted_at ASC
  `;
}
