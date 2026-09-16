import { ApiError } from "../http/errors";
import { getSql } from "../db/client";
import { recordAuditEvent } from "../repos/audit";
import { recordExecutionAudit } from "../repos/execution-audit";
import { updateUserStatus } from "../repos/users";
import { revokeAllUserSessions } from "../repos/sessions";
import { setAccountTradingEnabled } from "../repos/trading-controls";
import { listAccountsForUser } from "../repos/accounts";

/**
 * Account closure workflow (Phase 9).
 * Soft-closes the user (status CLOSED), disables trading, revokes sessions.
 * Does not claim GDPR erasure completion — retention is a legal determination.
 * Hard deletion of PII is a separate operator process after legal hold checks.
 */
export async function closeUserAccount(input: {
  userId: string;
  reason?: string | null;
  /** User must type CLOSE to confirm */
  confirmation: string;
}): Promise<{
  status: "CLOSED";
  closedAt: string;
  retentionNotice: string;
  tradingDisabledAccountIds: string[];
}> {
  if (input.confirmation.trim().toUpperCase() !== "CLOSE") {
    throw new ApiError(
      400,
      "CONFIRMATION_REQUIRED",
      "Type CLOSE to confirm account closure",
    );
  }

  const sql = getSql();
  const accounts = await listAccountsForUser(input.userId);
  const disabledIds: string[] = [];
  for (const account of accounts) {
    await setAccountTradingEnabled({
      accountId: account.id,
      userId: input.userId,
      enabled: false,
      reason: input.reason ?? "account_closure",
    });
    disabledIds.push(account.id);
  }

  await updateUserStatus(input.userId, "CLOSED");
  await revokeAllUserSessions(input.userId);

  const closedAt = new Date().toISOString();
  await sql`
    INSERT INTO annytrade.account_closure_requests (
      user_id, reason, status, closed_at
    ) VALUES (
      ${input.userId},
      ${input.reason ?? null},
      'CLOSED',
      ${closedAt}
    )
  `;

  await recordAuditEvent({
    userId: input.userId,
    eventType: "privacy.account.closed",
    metadata: {
      reason: input.reason ?? null,
      tradingDisabledAccountIds: disabledIds,
    },
  });
  await recordExecutionAudit({
    userId: input.userId,
    eventType: "privacy.account.closed",
    environment: "INTERNAL_PAPER",
    metadata: { closedAt },
  });

  return {
    status: "CLOSED",
    closedAt,
    tradingDisabledAccountIds: disabledIds,
    retentionNotice:
      "Account is closed and sessions revoked. Data retention / erasure timelines require legal determination — software does not auto-erase regulated records.",
  };
}

export async function exportUserPrivacySummary(userId: string) {
  const sql = getSql();
  const users = await sql<
    {
      id: string;
      email: string;
      display_name: string;
      status: string;
      email_verified: boolean;
      created_at: Date;
    }[]
  >`
    SELECT id, email, display_name, status, email_verified, created_at
    FROM annytrade.users WHERE id = ${userId} LIMIT 1
  `;
  const user = users[0];
  if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");

  const profile = await sql`
    SELECT display_name, timezone, preferred_currency, theme_preference
    FROM annytrade.profiles WHERE user_id = ${userId} LIMIT 1
  `;

  return {
    subjectAccess: {
      userId: user.id,
      email: user.email,
      displayName: user.display_name,
      status: user.status,
      emailVerified: user.email_verified,
      createdAt: user.created_at.toISOString(),
      profile: profile[0] ?? null,
    },
    notice:
      "This is a technical data summary, not a formal GDPR/CCPA response package. Legal review required for regulated disclosures.",
    categories: [
      "account identifiers",
      "profile preferences",
      "trading/paper activity (retained per policy TBD)",
      "audit events (integrity/retention TBD)",
    ],
  };
}
