import { getSql } from "../db/client";
import { ApiError } from "../http/errors";
import { updateUserStatus } from "../repos/users";
import { revokeAllUserSessions } from "../repos/sessions";
import { setAccountTradingEnabled } from "../repos/trading-controls";
import { listAccountsForUser } from "../repos/accounts";
import {
  recordAdminAction,
  assertAdminMinRole,
  type AdminContext,
} from "./auth";
import { redactUserForAdmin } from "./redaction";

export async function listUsersForAdmin(input: {
  status?: string | null;
  query?: string | null;
  limit?: number;
  offset?: number;
}) {
  const sql = getSql();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const status = input.status?.toUpperCase() || null;
  const q = input.query?.trim().toLowerCase() || null;
  const like = q ? `%${q}%` : null;

  const rows = (await sql.unsafe(
    `SELECT u.id, u.email, u.display_name, u.status, u.email_verified, u.created_at,
            ar.role AS admin_role
     FROM annytrade.users u
     LEFT JOIN annytrade.admin_roles ar ON ar.user_id = u.id
     WHERE ($1::text IS NULL OR u.status = $1)
       AND (
         $2::text IS NULL
         OR u.email_normalized LIKE $2
         OR LOWER(u.display_name) LIKE $2
       )
     ORDER BY u.created_at DESC
     LIMIT $3 OFFSET $4`,
    [status, like, limit, offset],
  )) as {
    id: string;
    email: string;
    display_name: string;
    status: string;
    email_verified: boolean;
    created_at: Date;
    admin_role: string | null;
  }[];

  const countRows = (await sql.unsafe(
    `SELECT COUNT(*)::text AS count
     FROM annytrade.users u
     WHERE ($1::text IS NULL OR u.status = $1)
       AND (
         $2::text IS NULL
         OR u.email_normalized LIKE $2
         OR LOWER(u.display_name) LIKE $2
       )`,
    [status, like],
  )) as { count: string }[];

  return {
    total: Number(countRows[0]?.count ?? 0),
    limit,
    offset,
    users: rows.map((r) => ({
      ...redactUserForAdmin(r),
      adminRole: r.admin_role,
    })),
  };
}

export async function suspendUserAsAdmin(
  admin: AdminContext,
  targetUserId: string,
  reason: string,
) {
  assertAdminMinRole(admin, "OPERATOR");
  if (targetUserId === admin.userId) {
    throw new ApiError(
      400,
      "VALIDATION",
      "Cannot suspend your own admin account",
    );
  }
  const sql = getSql();
  const rows = await sql<{ id: string; status: string }[]>`
    SELECT id, status FROM annytrade.users WHERE id = ${targetUserId} LIMIT 1
  `;
  if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "User not found");

  await updateUserStatus(targetUserId, "SUSPENDED");
  await revokeAllUserSessions(targetUserId);
  const accounts = await listAccountsForUser(targetUserId);
  for (const a of accounts) {
    await setAccountTradingEnabled({
      accountId: a.id,
      userId: targetUserId,
      enabled: false,
      reason: reason || "admin_suspend",
    });
  }

  await recordAdminAction({
    actorUserId: admin.userId,
    action: "user.suspend",
    targetUserId,
    metadata: { reason },
  });

  return { userId: targetUserId, status: "SUSPENDED" as const };
}

export async function unsuspendUserAsAdmin(
  admin: AdminContext,
  targetUserId: string,
  reason: string,
) {
  assertAdminMinRole(admin, "OPERATOR");
  const sql = getSql();
  const rows = await sql<{ id: string; status: string }[]>`
    SELECT id, status FROM annytrade.users WHERE id = ${targetUserId} LIMIT 1
  `;
  if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "User not found");
  if (rows[0].status === "CLOSED") {
    throw new ApiError(
      409,
      "ACCOUNT_CLOSED",
      "Closed accounts cannot be unsuspended here",
    );
  }

  await updateUserStatus(targetUserId, "ACTIVE");
  await recordAdminAction({
    actorUserId: admin.userId,
    action: "user.unsuspend",
    targetUserId,
    metadata: { reason },
  });
  return { userId: targetUserId, status: "ACTIVE" as const };
}
