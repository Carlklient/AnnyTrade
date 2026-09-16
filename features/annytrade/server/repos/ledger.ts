import { getSql } from "../db/client";

export async function sumFeesPaid(accountId: string): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ fees: string }[]>`
    SELECT COALESCE(SUM(ABS(amount)), 0)::text AS fees
    FROM annytrade.account_ledger_entries
    WHERE account_id = ${accountId} AND category = 'FEE'
  `;
  return Number(rows[0]?.fees ?? 0);
}

export async function getInitialBalance(accountId: string): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ amount: string }[]>`
    SELECT COALESCE(SUM(amount), 0)::text AS amount
    FROM annytrade.account_ledger_entries
    WHERE account_id = ${accountId} AND category = 'INITIAL_BALANCE'
  `;
  return Number(rows[0]?.amount ?? 0);
}

export async function listLedgerEntries(
  accountId: string,
  options?: { from?: Date; to?: Date; limit?: number },
) {
  const sql = getSql();
  const limit = Math.min(Math.max(options?.limit ?? 500, 1), 2000);
  if (options?.from && options?.to) {
    return sql<
      {
        id: string;
        category: string;
        amount: string;
        currency: string;
        memo: string | null;
        related_order_id: string | null;
        created_at: Date;
      }[]
    >`
      SELECT id, category, amount::text AS amount, currency, memo, related_order_id, created_at
      FROM annytrade.account_ledger_entries
      WHERE account_id = ${accountId}
        AND created_at >= ${options.from}
        AND created_at <= ${options.to}
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;
  }
  return sql<
    {
      id: string;
      category: string;
      amount: string;
      currency: string;
      memo: string | null;
      related_order_id: string | null;
      created_at: Date;
    }[]
  >`
    SELECT id, category, amount::text AS amount, currency, memo, related_order_id, created_at
    FROM annytrade.account_ledger_entries
    WHERE account_id = ${accountId}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `;
}
