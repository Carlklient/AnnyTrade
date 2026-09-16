import { getSql } from "../db/client";
import { recordAuditEvent } from "../repos/audit";
import { ApiError } from "../http/errors";

export type TradingControlRow = {
  account_id: string;
  user_id: string;
  trading_enabled: boolean;
  disabled_reason: string | null;
  updated_at: Date;
};

export async function getTradingControl(
  accountId: string,
): Promise<TradingControlRow | null> {
  const sql = getSql();
  const rows = await sql<TradingControlRow[]>`
    SELECT account_id, user_id, trading_enabled, disabled_reason, updated_at
    FROM annytrade.trading_controls
    WHERE account_id = ${accountId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function isAccountTradingEnabled(
  accountId: string,
): Promise<boolean> {
  const row = await getTradingControl(accountId);
  // Default enabled when no row
  return row?.trading_enabled !== false;
}

export async function assertAccountTradingEnabled(
  accountId: string,
): Promise<void> {
  const enabled = await isAccountTradingEnabled(accountId);
  if (!enabled) {
    throw new ApiError(
      403,
      "ACCOUNT_TRADING_DISABLED",
      "Trading is disabled for this account",
    );
  }
}

export async function setAccountTradingEnabled(input: {
  accountId: string;
  userId: string;
  enabled: boolean;
  reason?: string | null;
}): Promise<TradingControlRow> {
  const sql = getSql();
  const rows = await sql<TradingControlRow[]>`
    INSERT INTO annytrade.trading_controls (
      account_id, user_id, trading_enabled, disabled_reason, updated_at
    ) VALUES (
      ${input.accountId},
      ${input.userId},
      ${input.enabled},
      ${input.enabled ? null : (input.reason ?? "operator_disable")},
      NOW()
    )
    ON CONFLICT (account_id) DO UPDATE SET
      trading_enabled = EXCLUDED.trading_enabled,
      disabled_reason = EXCLUDED.disabled_reason,
      updated_at = NOW()
    RETURNING account_id, user_id, trading_enabled, disabled_reason, updated_at
  `;
  const row = rows[0]!;
  await recordAuditEvent({
    userId: input.userId,
    eventType: input.enabled
      ? "trading.account.enabled"
      : "trading.account.disabled",
    metadata: {
      accountId: input.accountId,
      reason: input.reason ?? null,
      immutable: true,
    },
  });
  return row;
}
