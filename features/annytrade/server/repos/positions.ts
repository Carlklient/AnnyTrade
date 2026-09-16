import { getSql } from "../db/client";
import type { DbPosition } from "../domain/types";

export async function listOpenPositionsForUser(
  userId: string,
  accountId?: string,
): Promise<DbPosition[]> {
  const sql = getSql();
  if (accountId) {
    return sql<DbPosition[]>`
      SELECT * FROM annytrade.positions
      WHERE user_id = ${userId}
        AND account_id = ${accountId}
        AND quantity > 0
        AND closed_at IS NULL
      ORDER BY symbol ASC
    `;
  }
  return sql<DbPosition[]>`
    SELECT * FROM annytrade.positions
    WHERE user_id = ${userId}
      AND quantity > 0
      AND closed_at IS NULL
    ORDER BY symbol ASC
  `;
}

export async function listClosedPositionsForUser(
  userId: string,
  accountId?: string,
  limit = 50,
): Promise<DbPosition[]> {
  const sql = getSql();
  const capped = Math.min(Math.max(limit, 1), 100);
  if (accountId) {
    return sql<DbPosition[]>`
      SELECT * FROM annytrade.positions
      WHERE user_id = ${userId}
        AND account_id = ${accountId}
        AND closed_at IS NOT NULL
      ORDER BY closed_at DESC
      LIMIT ${capped}
    `;
  }
  return sql<DbPosition[]>`
    SELECT * FROM annytrade.positions
    WHERE user_id = ${userId}
      AND closed_at IS NOT NULL
    ORDER BY closed_at DESC
    LIMIT ${capped}
  `;
}

export async function getPositionForAccountSymbol(
  accountId: string,
  symbol: string,
): Promise<DbPosition | null> {
  const sql = getSql();
  const rows = await sql<DbPosition[]>`
    SELECT * FROM annytrade.positions
    WHERE account_id = ${accountId} AND symbol = ${symbol}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
