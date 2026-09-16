import { getSql } from "../db/client";
import { createOpaqueToken, hashToken } from "../security/crypto";

export type DbSession = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
};

const SESSION_DAYS = 14;

export async function createSession(input: {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<{ session: DbSession; token: string }> {
  const sql = getSql();
  const token = createOpaqueToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const rows = await sql<DbSession[]>`
    INSERT INTO annytrade.sessions (
      user_id, token_hash, expires_at, user_agent, ip_address
    ) VALUES (
      ${input.userId},
      ${tokenHash},
      ${expiresAt},
      ${input.userAgent ?? null},
      ${input.ipAddress ?? null}
    )
    RETURNING *
  `;
  const session = rows[0];
  if (!session) throw new Error("Failed to create session");
  return { session, token };
}

export async function findValidSessionByToken(
  token: string,
): Promise<DbSession | null> {
  const sql = getSql();
  const tokenHash = hashToken(token);
  const rows = await sql<DbSession[]>`
    SELECT * FROM annytrade.sessions
    WHERE token_hash = ${tokenHash}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function revokeSessionByToken(token: string): Promise<void> {
  const sql = getSql();
  const tokenHash = hashToken(token);
  await sql`
    UPDATE annytrade.sessions
    SET revoked_at = NOW()
    WHERE token_hash = ${tokenHash} AND revoked_at IS NULL
  `;
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE annytrade.sessions
    SET revoked_at = NOW()
    WHERE user_id = ${userId} AND revoked_at IS NULL
  `;
}

export { SESSION_DAYS };
