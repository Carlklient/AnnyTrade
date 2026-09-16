import { getSql } from "../db/client";
import type { DbTradingAccount } from "../domain/types";

export async function createPaperAccount(input: {
  userId: string;
  baseCurrency?: string;
  label?: string;
  initialBalance?: number;
}): Promise<DbTradingAccount> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const rows = await tx<DbTradingAccount[]>`
      INSERT INTO annytrade.trading_accounts (
        user_id, account_type, base_currency, label
      ) VALUES (
        ${input.userId},
        'PAPER',
        ${input.baseCurrency ?? "USD"},
        ${input.label ?? "Paper account"}
      )
      RETURNING *
    `;
    const account = rows[0];
    if (!account) throw new Error("Failed to create paper account");

    const amount = input.initialBalance ?? 100_000;
    await tx`
      INSERT INTO annytrade.account_ledger_entries (
        account_id, category, amount, currency, memo
      ) VALUES (
        ${account.id},
        'INITIAL_BALANCE',
        ${amount},
        ${account.base_currency},
        'Synthetic paper starting balance'
      )
    `;
    return account;
  });
}

export async function listAccountsForUser(
  userId: string,
): Promise<DbTradingAccount[]> {
  const sql = getSql();
  return sql<DbTradingAccount[]>`
    SELECT * FROM annytrade.trading_accounts
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `;
}

export async function getAccountForUser(
  accountId: string,
  userId: string,
): Promise<DbTradingAccount | null> {
  const sql = getSql();
  const rows = await sql<DbTradingAccount[]>`
    SELECT * FROM annytrade.trading_accounts
    WHERE id = ${accountId} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getLedgerBalance(accountId: string): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ balance: string }[]>`
    SELECT COALESCE(SUM(amount), 0)::text AS balance
    FROM annytrade.account_ledger_entries
    WHERE account_id = ${accountId}
  `;
  return Number(rows[0]?.balance ?? 0);
}

/** Sum of open BUY order remaining notional estimates (limit/stop/market pending). */
export async function getReservedBuyNotional(
  accountId: string,
): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ reserved: string }[]>`
    SELECT COALESCE(SUM(
      (quantity - filled_quantity) *
      COALESCE(limit_price, stop_price, average_fill_price, 0)
    ), 0)::text AS reserved
    FROM annytrade.orders
    WHERE account_id = ${accountId}
      AND side = 'BUY'
      AND status IN ('PENDING', 'OPEN', 'PARTIALLY_FILLED')
  `;
  return Number(rows[0]?.reserved ?? 0);
}

export async function getAvailableCash(accountId: string): Promise<{
  balance: number;
  reserved: number;
  available: number;
}> {
  const balance = await getLedgerBalance(accountId);
  const reserved = await getReservedBuyNotional(accountId);
  return {
    balance,
    reserved,
    available: Math.max(0, balance - reserved),
  };
}
