import { getSql } from "../db/client";
import type { DbUser, UserStatus } from "../domain/types";

export async function findUserByNormalizedEmail(
  emailNormalized: string,
): Promise<DbUser | null> {
  const sql = getSql();
  const rows = await sql<DbUser[]>`
    SELECT * FROM annytrade.users WHERE email_normalized = ${emailNormalized} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const sql = getSql();
  const rows = await sql<DbUser[]>`
    SELECT * FROM annytrade.users WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  emailNormalized: string;
  passwordHash: string;
  displayName: string;
}): Promise<DbUser> {
  const sql = getSql();
  const rows = await sql<DbUser[]>`
    INSERT INTO annytrade.users (
      email, email_normalized, password_hash, display_name
    ) VALUES (
      ${input.email}, ${input.emailNormalized}, ${input.passwordHash}, ${input.displayName}
    )
    RETURNING *
  `;
  const user = rows[0];
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function updateUserStatus(
  userId: string,
  status: UserStatus,
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE annytrade.users
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function setEmailVerified(userId: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE annytrade.users
    SET email_verified = TRUE, updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function updatePasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE annytrade.users
    SET password_hash = ${passwordHash}, updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function updateUserDisplayName(
  userId: string,
  displayName: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE annytrade.users
    SET display_name = ${displayName}, updated_at = NOW()
    WHERE id = ${userId}
  `;
}
