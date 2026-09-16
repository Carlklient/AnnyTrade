import { getSql } from "../db/client";
import { ApiError } from "../http/errors";
import {
  getAvailableCash,
  getAccountForUser,
  listAccountsForUser,
} from "../repos/accounts";
import { getInitialBalance } from "../repos/ledger";

const TOP_UP_AMOUNTS = [1_000, 5_000, 10_000, 25_000] as const;
const MAX_PAPER_BALANCE = 500_000;

export async function resolvePaperAccountId(
  userId: string,
  accountId?: string,
) {
  const accounts = await listAccountsForUser(userId);
  const account =
    (accountId ? accounts.find((a) => a.id === accountId) : accounts[0]) ?? null;
  if (!account) throw new ApiError(404, "NOT_FOUND", "Paper account not found");
  if (account.account_type !== "PAPER") {
    throw new ApiError(403, "FORBIDDEN", "Only PAPER accounts supported");
  }
  return account;
}

export async function listPaperLedgerForUser(
  userId: string,
  options?: { accountId?: string; limit?: number },
) {
  const account = await resolvePaperAccountId(userId, options?.accountId);
  const cash = await getAvailableCash(account.id);
  const sql = getSql();
  const limit = Math.min(Math.max(options?.limit ?? 40, 1), 200);
  const entries = await sql<
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
    WHERE account_id = ${account.id}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return {
    accountId: account.id,
    currency: account.base_currency,
    cashBalance: cash.balance,
    reserved: cash.reserved,
    availableCash: cash.available,
    initialBalance: await getInitialBalance(account.id),
    entries: entries.map((e) => ({
      id: e.id,
      category: e.category,
      amount: Number(e.amount),
      currency: e.currency,
      memo: e.memo,
      relatedOrderId: e.related_order_id,
      createdAt: e.created_at.toISOString(),
    })),
  };
}

/**
 * Self-service practice top-up or reset toward starting paper balance.
 * Append-only ADJUSTMENT entries — never rewrites history.
 */
export async function practicePaperAdjust(
  userId: string,
  input: {
    accountId?: string;
    action: "top_up" | "reset";
    amount?: number;
  },
) {
  const account = await resolvePaperAccountId(userId, input.accountId);
  if (input.accountId) {
    const owned = await getAccountForUser(account.id, userId);
    if (!owned) throw new ApiError(404, "NOT_FOUND", "Account not found");
  }

  const cash = await getAvailableCash(account.id);
  let delta = 0;
  let memo = "";

  if (input.action === "top_up") {
    const amount = input.amount ?? 5_000;
    if (!(TOP_UP_AMOUNTS as readonly number[]).includes(amount)) {
      throw new ApiError(
        400,
        "VALIDATION",
        `Top-up must be one of: ${TOP_UP_AMOUNTS.join(", ")}`,
      );
    }
    if (cash.balance + amount > MAX_PAPER_BALANCE) {
      throw new ApiError(
        400,
        "VALIDATION",
        `Paper balance cannot exceed ${MAX_PAPER_BALANCE.toLocaleString()}`,
      );
    }
    delta = amount;
    memo = `PRACTICE_TOP_UP: +${amount}`;
  } else {
    const initial = (await getInitialBalance(account.id)) || 100_000;
    delta = Number((initial - cash.balance).toFixed(2));
    if (delta === 0) {
      return {
        accountId: account.id,
        amount: 0,
        cashBalance: cash.balance,
        message: "Paper cash already at starting balance",
      };
    }
    memo = `PRACTICE_RESET: target ${initial}`;
  }

  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    INSERT INTO annytrade.account_ledger_entries (
      account_id, category, amount, currency, memo
    ) VALUES (
      ${account.id},
      'ADJUSTMENT',
      ${delta},
      ${account.base_currency},
      ${memo.slice(0, 400)}
    )
    RETURNING id
  `;

  const next = await getAvailableCash(account.id);
  return {
    accountId: account.id,
    ledgerEntryId: rows[0]?.id ?? null,
    amount: delta,
    cashBalance: next.balance,
    availableCash: next.available,
    message:
      input.action === "reset"
        ? "Paper cash reset toward starting balance"
        : `Practice top-up of ${delta} applied`,
  };
}

export const PRACTICE_TOP_UP_AMOUNTS = TOP_UP_AMOUNTS;
