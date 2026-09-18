import type { NextRequest } from "next/server";

import { ApiError } from "../http/errors";
import {
  createPaperAccount,
  getLedgerBalance,
  listAccountsForUser,
} from "../repos/accounts";
import { recordAuditEvent } from "../repos/audit";
import { createNotification } from "../repos/notifications";
import { createProfile, getProfile } from "../repos/profiles";
import {
  createSession,
  findValidSessionByToken,
  revokeAllUserSessions,
  revokeSessionByToken,
} from "../repos/sessions";
import {
  createUser,
  findUserById,
  findUserByNormalizedEmail,
  setEmailVerified,
  updatePasswordHash,
} from "../repos/users";
import { createWatchlist, addWatchlistItem } from "../repos/watchlists";
import { hashPassword, verifyPassword } from "../security/password";
import { createOpaqueToken, hashToken } from "../security/crypto";
import { getSql } from "../db/client";
import {
  toPublicProfile,
  toPublicUser,
  type PublicAccount,
  type PublicProfile,
  type PublicUser,
} from "../domain/types";
import { normalizeEmail } from "../validation/schemas";
import {
  appPublicUrl,
  mailFallbackExposeEnabled,
  sendTransactionalEmail,
} from "../mail/send";

function clientMeta(request?: NextRequest) {
  if (!request) return { ip: null as string | null, ua: null as string | null };
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  return { ip, ua: request.headers.get("user-agent") };
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
  request?: NextRequest;
}): Promise<{
  user: PublicUser;
  token: string;
  emailDelivery: {
    sent: boolean;
    reason?: string;
    verifyUrl?: string;
    verifyToken?: string;
  };
}> {
  const emailNormalized = normalizeEmail(input.email);
  const existing = await findUserByNormalizedEmail(emailNormalized);
  if (existing) {
    throw new ApiError(409, "EMAIL_IN_USE", "Unable to create account");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    email: input.email.trim(),
    emailNormalized,
    passwordHash,
    displayName: input.displayName.trim(),
  });

  await createProfile({ userId: user.id, displayName: user.display_name });
  await createPaperAccount({
    userId: user.id,
    initialBalance: 100_000,
  });
  const watchlist = await createWatchlist(user.id, "Favorites");
  for (const symbol of ["EURUSD", "GBPUSD", "AAPL", "SPY", "XAUUSD", "BTCUSD"]) {
    await addWatchlistItem(user.id, watchlist.id, symbol);
  }
  await createNotification({
    userId: user.id,
    type: "security",
    title: "Welcome to AnnyTrade",
    message:
      "Your PAPER trading account is ready. Quotes may be DEMO or a live vendor feed — never real brokerage money.",
  });

  const verifyToken = createOpaqueToken(24);
  const sql = getSql();
  await sql`
    INSERT INTO annytrade.email_verification_tokens (user_id, token_hash, expires_at)
    VALUES (
      ${user.id},
      ${hashToken(verifyToken)},
      ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
    )
  `;

  const verifyUrl = `${appPublicUrl()}/annytrade/auth/verify?token=${encodeURIComponent(verifyToken)}`;
  const mail = await sendTransactionalEmail({
    to: user.email,
    subject: "Verify your AnnyTrade email",
    text: `Welcome to AnnyTrade.\n\nVerify your email:\n${verifyUrl}\n\nOr paste this token on the verify page:\n${verifyToken}\n\nPAPER trading only — no live money.`,
  });

  await createNotification({
    userId: user.id,
    type: "security",
    title: mail.sent ? "Verify your email" : "Verify your email (mail offline)",
    message: mail.sent
      ? "We sent a verification link to your inbox."
      : `Email provider offline. Open this link to verify: ${verifyUrl}`,
  });

  const meta = clientMeta(input.request);
  await recordAuditEvent({
    userId: user.id,
    eventType: "auth.register",
    metadata: { email: emailNormalized, emailSent: mail.sent },
    ipAddress: meta.ip,
    userAgent: meta.ua,
  });

  const { token } = await createSession({
    userId: user.id,
    ipAddress: meta.ip,
    userAgent: meta.ua,
  });

  const emailDelivery: {
    sent: boolean;
    reason?: string;
    verifyUrl?: string;
    verifyToken?: string;
  } = {
    sent: mail.sent,
    reason: mail.reason,
  };
  if (!mail.sent && mailFallbackExposeEnabled()) {
    emailDelivery.verifyUrl = verifyUrl;
    emailDelivery.verifyToken = verifyToken;
  }

  return { user: toPublicUser(user), token, emailDelivery };
}

export async function loginUser(input: {
  email: string;
  password: string;
  request?: NextRequest;
}): Promise<{ user: PublicUser; token: string }> {
  const emailNormalized = normalizeEmail(input.email);
  const user = await findUserByNormalizedEmail(emailNormalized);
  const meta = clientMeta(input.request);

  const fail = async () => {
    await recordAuditEvent({
      userId: user?.id ?? null,
      eventType: "auth.login_failed",
      metadata: { email: emailNormalized },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  };

  if (!user) await fail();
  if (user!.status === "SUSPENDED" || user!.status === "CLOSED") {
    await recordAuditEvent({
      userId: user!.id,
      eventType: "auth.login_blocked",
      metadata: { status: user!.status },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    throw new ApiError(403, "ACCOUNT_INACTIVE", "Account is not active");
  }

  const valid = await verifyPassword(input.password, user!.password_hash);
  if (!valid) await fail();

  const { token } = await createSession({
    userId: user!.id,
    ipAddress: meta.ip,
    userAgent: meta.ua,
  });

  await recordAuditEvent({
    userId: user!.id,
    eventType: "auth.login",
    metadata: {},
    ipAddress: meta.ip,
    userAgent: meta.ua,
  });

  return { user: toPublicUser(user!), token };
}

export async function logoutUser(input: {
  token: string | null;
  request?: NextRequest;
}): Promise<void> {
  if (!input.token) return;
  const session = await findValidSessionByToken(input.token);
  await revokeSessionByToken(input.token);
  const meta = clientMeta(input.request);
  await recordAuditEvent({
    userId: session?.user_id ?? null,
    eventType: "auth.logout",
    metadata: {},
    ipAddress: meta.ip,
    userAgent: meta.ua,
  });
}

export async function getSessionUser(
  token: string | null,
): Promise<{ user: PublicUser; profile: PublicProfile } | null> {
  if (!token) return null;
  const session = await findValidSessionByToken(token);
  if (!session) return null;
  const user = await findUserById(session.user_id);
  if (!user) return null;
  if (user.status !== "ACTIVE") return null;
  const profile = await getProfile(user.id);
  if (!profile) return null;
  return { user: toPublicUser(user), profile: toPublicProfile(profile) };
}

export async function requireSessionUser(token: string | null) {
  const session = await getSessionUser(token);
  if (!session) {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required");
  }
  return session;
}

export async function requestPasswordReset(
  email: string,
): Promise<{
  emailed: boolean;
  reason?: string;
  resetUrl?: string;
  resetToken?: string;
}> {
  const emailNormalized = normalizeEmail(email);
  const user = await findUserByNormalizedEmail(emailNormalized);
  // Always succeed to avoid account enumeration
  if (!user) return { emailed: true };

  const token = createOpaqueToken(24);
  const sql = getSql();
  await sql`
    INSERT INTO annytrade.password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (
      ${user.id},
      ${hashToken(token)},
      ${new Date(Date.now() + 60 * 60 * 1000)}
    )
  `;
  await recordAuditEvent({
    userId: user.id,
    eventType: "auth.password_reset_requested",
    metadata: {},
  });
  const resetUrl = `${appPublicUrl()}/annytrade/auth/reset-password?token=${encodeURIComponent(token)}`;
  const mail = await sendTransactionalEmail({
    to: user.email,
    subject: "Reset your AnnyTrade password",
    text: `Reset your AnnyTrade password:\n${resetUrl}\n\nOr paste this token on the reset page:\n${token}\n\nThis link expires in 1 hour. If you did not request it, ignore this email.`,
  });
  if (!mail.sent) {
    await createNotification({
      userId: user.id,
      type: "security",
      title: "Password reset (mail offline)",
      message: `Email provider offline. Use this reset link if you requested it: ${resetUrl}`,
    });
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(
      "[annytrade] password reset token created (dev only; value not logged)",
      { length: token.length },
    );
  }
  if (!mail.sent && mailFallbackExposeEnabled()) {
    return {
      emailed: false,
      reason: mail.reason,
      resetUrl,
      resetToken: token,
    };
  }
  return { emailed: mail.sent, reason: mail.reason };
}

export async function confirmPasswordReset(input: {
  token: string;
  password: string;
}): Promise<void> {
  const sql = getSql();
  const tokenHash = hashToken(input.token);
  const rows = await sql<{ id: string; user_id: string }[]>`
    SELECT id, user_id FROM annytrade.password_reset_tokens
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    throw new ApiError(
      400,
      "INVALID_TOKEN",
      "Reset link is invalid or expired",
    );
  }

  const passwordHash = await hashPassword(input.password);
  await updatePasswordHash(row.user_id, passwordHash);
  await sql`
    UPDATE annytrade.password_reset_tokens
    SET used_at = NOW()
    WHERE id = ${row.id}
  `;
  await revokeAllUserSessions(row.user_id);
  await recordAuditEvent({
    userId: row.user_id,
    eventType: "auth.password_reset_completed",
    metadata: { sessionsRevoked: true },
  });
}

export async function verifyEmailToken(token: string): Promise<void> {
  const sql = getSql();
  const tokenHash = hashToken(token);
  const rows = await sql<{ id: string; user_id: string }[]>`
    SELECT id, user_id FROM annytrade.email_verification_tokens
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    throw new ApiError(
      400,
      "INVALID_TOKEN",
      "Verification link is invalid or expired",
    );
  }
  await setEmailVerified(row.user_id);
  await sql`
    UPDATE annytrade.email_verification_tokens
    SET used_at = NOW()
    WHERE id = ${row.id}
  `;
  await recordAuditEvent({
    userId: row.user_id,
    eventType: "auth.email_verified",
    metadata: {},
  });
}

export async function listPublicAccounts(
  userId: string,
): Promise<PublicAccount[]> {
  const accounts = await listAccountsForUser(userId);
  const out: PublicAccount[] = [];
  for (const account of accounts) {
    const ledgerBalance = await getLedgerBalance(account.id);
    out.push({
      id: account.id,
      accountType: account.account_type,
      baseCurrency: account.base_currency,
      status: account.status,
      label: account.label,
      ledgerBalance,
      createdAt: account.created_at.toISOString(),
    });
  }
  return out;
}
