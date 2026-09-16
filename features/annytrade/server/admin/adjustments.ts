import { getSql } from "../db/client";
import { ApiError } from "../http/errors";
import {
  recordAdminAction,
  assertAdminMinRole,
  type AdminContext,
} from "./auth";
import { recordExecutionAudit } from "../repos/execution-audit";

/**
 * Authorized paper cash adjustment via immutable ledger ADJUSTMENT entry.
 * Does NOT edit past executions or rewrite order history.
 */
export async function createLedgerAdjustment(
  admin: AdminContext,
  input: {
    accountId: string;
    amount: number;
    reason: string;
  },
) {
  assertAdminMinRole(admin, "ADMIN");
  if (!Number.isFinite(input.amount) || input.amount === 0) {
    throw new ApiError(400, "VALIDATION", "Non-zero amount required");
  }
  if (!input.reason.trim() || input.reason.trim().length < 8) {
    throw new ApiError(400, "VALIDATION", "Reason required (min 8 chars)");
  }

  const sql = getSql();
  const accounts = await sql<
    {
      id: string;
      user_id: string;
      base_currency: string;
      account_type: string;
    }[]
  >`
    SELECT id, user_id, base_currency, account_type
    FROM annytrade.trading_accounts
    WHERE id = ${input.accountId}
    LIMIT 1
  `;
  const account = accounts[0];
  if (!account) throw new ApiError(404, "NOT_FOUND", "Account not found");
  if (account.account_type !== "PAPER") {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Adjustments only allowed on INTERNAL_PAPER accounts",
    );
  }

  const result = await sql.begin(async (tx) => {
    const entries = await tx<{ id: string }[]>`
      INSERT INTO annytrade.account_ledger_entries (
        account_id, category, amount, currency, memo
      ) VALUES (
        ${account.id},
        'ADJUSTMENT',
        ${input.amount},
        ${account.base_currency},
        ${`ADMIN_ADJUSTMENT: ${input.reason.trim().slice(0, 400)}`}
      )
      RETURNING id
    `;
    const ledgerEntryId = entries[0]!.id;
    const adj = await tx<{ id: string }[]>`
      INSERT INTO annytrade.ledger_adjustments (
        account_id, ledger_entry_id, operator_user_id, amount, currency, reason
      ) VALUES (
        ${account.id},
        ${ledgerEntryId},
        ${admin.userId},
        ${input.amount},
        ${account.base_currency},
        ${input.reason.trim().slice(0, 500)}
      )
      RETURNING id
    `;
    return { adjustmentId: adj[0]!.id, ledgerEntryId };
  });

  await recordAdminAction({
    actorUserId: admin.userId,
    action: "ledger.adjustment",
    targetUserId: account.user_id,
    targetAccountId: account.id,
    metadata: {
      amount: input.amount,
      reason: input.reason.trim().slice(0, 200),
      adjustmentId: result.adjustmentId,
      ledgerEntryId: result.ledgerEntryId,
    },
  });
  await recordExecutionAudit({
    userId: admin.userId,
    eventType: "admin.ledger.adjustment",
    environment: "INTERNAL_PAPER",
    metadata: {
      accountId: account.id,
      amount: input.amount,
      adjustmentId: result.adjustmentId,
    },
  });

  return {
    ...result,
    accountId: account.id,
    amount: input.amount,
    immutable: true as const,
  };
}
