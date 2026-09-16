import { getSql } from "../db/client";

export type DbEquitySnapshot = {
  id: string;
  account_id: string;
  user_id: string;
  as_of: string; // date
  cash_balance: string;
  market_value: string;
  cost_basis: string;
  unrealized_pnl: string;
  realized_pnl: string;
  fees_paid: string;
  equity: string;
  currency: string;
  marks_complete: boolean;
  created_at: Date;
};

export async function upsertEquitySnapshot(input: {
  accountId: string;
  userId: string;
  asOf: string; // YYYY-MM-DD
  cashBalance: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  realizedPnl: number;
  feesPaid: number;
  equity: number;
  currency: string;
  marksComplete: boolean;
}): Promise<DbEquitySnapshot> {
  const sql = getSql();
  const rows = await sql<DbEquitySnapshot[]>`
    INSERT INTO annytrade.equity_snapshots (
      account_id, user_id, as_of,
      cash_balance, market_value, cost_basis,
      unrealized_pnl, realized_pnl, fees_paid,
      equity, currency, marks_complete
    ) VALUES (
      ${input.accountId},
      ${input.userId},
      ${input.asOf}::date,
      ${input.cashBalance},
      ${input.marketValue},
      ${input.costBasis},
      ${input.unrealizedPnl},
      ${input.realizedPnl},
      ${input.feesPaid},
      ${input.equity},
      ${input.currency},
      ${input.marksComplete}
    )
    ON CONFLICT (account_id, as_of) DO UPDATE SET
      cash_balance = EXCLUDED.cash_balance,
      market_value = EXCLUDED.market_value,
      cost_basis = EXCLUDED.cost_basis,
      unrealized_pnl = EXCLUDED.unrealized_pnl,
      realized_pnl = EXCLUDED.realized_pnl,
      fees_paid = EXCLUDED.fees_paid,
      equity = EXCLUDED.equity,
      currency = EXCLUDED.currency,
      marks_complete = EXCLUDED.marks_complete,
      created_at = NOW()
    RETURNING *
  `;
  return rows[0]!;
}

export async function listEquitySnapshots(
  accountId: string,
  options?: { from?: string; to?: string; limit?: number },
): Promise<DbEquitySnapshot[]> {
  const sql = getSql();
  const limit = Math.min(Math.max(options?.limit ?? 365, 1), 2000);
  if (options?.from && options?.to) {
    return sql<DbEquitySnapshot[]>`
      SELECT id, account_id, user_id, as_of::text AS as_of,
        cash_balance::text AS cash_balance, market_value::text AS market_value,
        cost_basis::text AS cost_basis, unrealized_pnl::text AS unrealized_pnl,
        realized_pnl::text AS realized_pnl, fees_paid::text AS fees_paid,
        equity::text AS equity, currency, marks_complete, created_at
      FROM annytrade.equity_snapshots
      WHERE account_id = ${accountId}
        AND as_of >= ${options.from}::date
        AND as_of <= ${options.to}::date
      ORDER BY as_of ASC
      LIMIT ${limit}
    `;
  }
  return sql<DbEquitySnapshot[]>`
    SELECT id, account_id, user_id, as_of::text AS as_of,
      cash_balance::text AS cash_balance, market_value::text AS market_value,
      cost_basis::text AS cost_basis, unrealized_pnl::text AS unrealized_pnl,
      realized_pnl::text AS realized_pnl, fees_paid::text AS fees_paid,
      equity::text AS equity, currency, marks_complete, created_at
    FROM annytrade.equity_snapshots
    WHERE account_id = ${accountId}
    ORDER BY as_of ASC
    LIMIT ${limit}
  `;
}

export async function getLatestEquitySnapshot(
  accountId: string,
): Promise<DbEquitySnapshot | null> {
  const sql = getSql();
  const rows = await sql<DbEquitySnapshot[]>`
    SELECT id, account_id, user_id, as_of::text AS as_of,
      cash_balance::text AS cash_balance, market_value::text AS market_value,
      cost_basis::text AS cost_basis, unrealized_pnl::text AS unrealized_pnl,
      realized_pnl::text AS realized_pnl, fees_paid::text AS fees_paid,
      equity::text AS equity, currency, marks_complete, created_at
    FROM annytrade.equity_snapshots
    WHERE account_id = ${accountId}
    ORDER BY as_of DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getEquitySnapshotOnOrBefore(
  accountId: string,
  asOf: string,
): Promise<DbEquitySnapshot | null> {
  const sql = getSql();
  const rows = await sql<DbEquitySnapshot[]>`
    SELECT id, account_id, user_id, as_of::text AS as_of,
      cash_balance::text AS cash_balance, market_value::text AS market_value,
      cost_basis::text AS cost_basis, unrealized_pnl::text AS unrealized_pnl,
      realized_pnl::text AS realized_pnl, fees_paid::text AS fees_paid,
      equity::text AS equity, currency, marks_complete, created_at
    FROM annytrade.equity_snapshots
    WHERE account_id = ${accountId}
      AND as_of <= ${asOf}::date
    ORDER BY as_of DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}
