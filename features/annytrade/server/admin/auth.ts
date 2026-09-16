import { getSql } from "../db/client";
import { ApiError } from "../http/errors";
import { requireSessionUser } from "../services/auth";
import { recordAuditEvent } from "../repos/audit";
import { log } from "../observability/log";
import { redactEmail } from "./redaction";

export type AdminRole = "ADMIN" | "OPERATOR" | "READONLY";

export type AdminContext = {
  userId: string;
  email: string;
  role: AdminRole;
  displayName: string;
};

function bootstrapEmails(): Set<string> {
  const raw = process.env.ANNYTRADE_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  const sql = getSql();
  const rows = await sql<{ role: AdminRole }[]>`
    SELECT role FROM annytrade.admin_roles WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0]?.role ?? null;
}

/** Explicit assignment — also used by env bootstrap. */
export async function grantAdminRole(input: {
  userId: string;
  role: AdminRole;
  grantedBy: string | null;
  grantSource: "explicit" | "env_bootstrap";
  reason?: string | null;
}): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO annytrade.admin_roles (
      user_id, role, granted_by, grant_source, reason, updated_at
    ) VALUES (
      ${input.userId},
      ${input.role},
      ${input.grantedBy},
      ${input.grantSource},
      ${input.reason ?? null},
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      role = EXCLUDED.role,
      granted_by = EXCLUDED.granted_by,
      grant_source = EXCLUDED.grant_source,
      reason = EXCLUDED.reason,
      updated_at = NOW()
  `;
}

async function maybeBootstrapAdmin(
  userId: string,
  email: string,
): Promise<AdminRole | null> {
  const emails = bootstrapEmails();
  if (!emails.has(email.toLowerCase())) return null;
  const existing = await getAdminRole(userId);
  if (existing) return existing;
  await grantAdminRole({
    userId,
    role: "ADMIN",
    grantedBy: null,
    grantSource: "env_bootstrap",
    reason: "ANNYTRADE_ADMIN_EMAILS",
  });
  await recordAuditEvent({
    userId,
    eventType: "admin.role.bootstrap",
    metadata: { email: redactEmail(email), source: "env" },
  });
  log.info("admin_bootstrap", { userId, email: redactEmail(email) });
  return "ADMIN";
}

/**
 * Server-side admin gate. Frontend route hiding is NOT security.
 * Requires ACTIVE session user + explicit admin_roles row (or env bootstrap).
 */
export async function requireAdmin(
  token: string | null,
  options?: { minRole?: AdminRole },
): Promise<AdminContext> {
  const { user, profile } = await requireSessionUser(token);
  let role = await getAdminRole(user.id);
  if (!role) {
    role = await maybeBootstrapAdmin(user.id, user.email);
  }
  if (!role) {
    throw new ApiError(403, "FORBIDDEN", "Admin access required");
  }

  const min = options?.minRole ?? "READONLY";
  const rank: Record<AdminRole, number> = {
    READONLY: 1,
    OPERATOR: 2,
    ADMIN: 3,
  };
  if (rank[role] < rank[min]) {
    throw new ApiError(403, "FORBIDDEN", `Requires ${min} admin role`);
  }

  return {
    userId: user.id,
    email: user.email,
    role,
    displayName: profile.displayName,
  };
}

export function assertAdminMinRole(
  admin: AdminContext,
  minRole: AdminRole,
): void {
  const rank: Record<AdminRole, number> = {
    READONLY: 1,
    OPERATOR: 2,
    ADMIN: 3,
  };
  if (rank[admin.role] < rank[minRole]) {
    throw new ApiError(403, "FORBIDDEN", `Requires ${minRole} admin role`);
  }
}

export async function recordAdminAction(input: {
  actorUserId: string;
  action: string;
  targetUserId?: string | null;
  targetAccountId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO annytrade.admin_action_audit (
      actor_user_id, action, target_user_id, target_account_id, metadata
    ) VALUES (
      ${input.actorUserId},
      ${input.action},
      ${input.targetUserId ?? null},
      ${input.targetAccountId ?? null},
      ${sql.json((input.metadata ?? {}) as never)}
    )
  `;
  await recordAuditEvent({
    userId: input.actorUserId,
    eventType: `admin.action.${input.action}`,
    metadata: {
      targetUserId: input.targetUserId ?? null,
      targetAccountId: input.targetAccountId ?? null,
      ...(input.metadata ?? {}),
    },
  });
}
