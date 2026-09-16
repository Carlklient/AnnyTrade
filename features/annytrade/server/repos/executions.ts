import { getSql } from "../db/client";
import type { DbExecution } from "../domain/types";

export async function listExecutionsForOrder(
  orderId: string,
  userId: string,
): Promise<DbExecution[]> {
  const sql = getSql();
  return sql<DbExecution[]>`
    SELECT * FROM annytrade.executions
    WHERE order_id = ${orderId} AND user_id = ${userId}
    ORDER BY executed_at ASC
  `;
}

export async function listRecentExecutionsForUser(
  userId: string,
  limit = 50,
): Promise<DbExecution[]> {
  const sql = getSql();
  const capped = Math.min(Math.max(limit, 1), 100);
  return sql<DbExecution[]>`
    SELECT * FROM annytrade.executions
    WHERE user_id = ${userId}
    ORDER BY executed_at DESC
    LIMIT ${capped}
  `;
}

export async function listExecutionsForAccount(
  accountId: string,
  options?: { from?: Date; to?: Date; limit?: number },
): Promise<DbExecution[]> {
  const sql = getSql();
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 2000);
  if (options?.from && options?.to) {
    return sql<DbExecution[]>`
      SELECT * FROM annytrade.executions
      WHERE account_id = ${accountId}
        AND executed_at >= ${options.from}
        AND executed_at <= ${options.to}
      ORDER BY executed_at ASC
      LIMIT ${limit}
    `;
  }
  if (options?.from) {
    return sql<DbExecution[]>`
      SELECT * FROM annytrade.executions
      WHERE account_id = ${accountId}
        AND executed_at >= ${options.from}
      ORDER BY executed_at ASC
      LIMIT ${limit}
    `;
  }
  return sql<DbExecution[]>`
    SELECT * FROM annytrade.executions
    WHERE account_id = ${accountId}
    ORDER BY executed_at ASC
    LIMIT ${limit}
  `;
}
