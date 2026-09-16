import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook signature verification + replay protection (Phase 9).
 * Brokers/providers that support HMAC signatures should call verifyWebhookSignature.
 * Replay nonces are tracked in-memory with optional Redis-backed durable store later.
 */

export class WebhookSecurityError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "WebhookSecurityError";
    this.code = code;
  }
}

const replaySeen = new Map<string, number>();

export function verifyHmacSha256Signature(input: {
  payload: string | Buffer;
  signatureHeader: string | null | undefined;
  secret: string;
  /** Prefixes like "sha256=" or "v1=" */
  prefix?: string;
}): void {
  if (!input.secret) {
    throw new WebhookSecurityError(
      "WEBHOOK_SECRET_MISSING",
      "Webhook signing secret not configured",
    );
  }
  if (!input.signatureHeader) {
    throw new WebhookSecurityError(
      "WEBHOOK_SIGNATURE_MISSING",
      "Missing webhook signature header",
    );
  }
  let provided = input.signatureHeader.trim();
  const prefix = input.prefix ?? "sha256=";
  if (provided.startsWith(prefix)) {
    provided = provided.slice(prefix.length);
  }
  const expected = createHmac("sha256", input.secret)
    .update(input.payload)
    .digest("hex");

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new WebhookSecurityError(
      "WEBHOOK_SIGNATURE_INVALID",
      "Webhook signature verification failed",
    );
  }
}

/**
 * Reject replayed webhook/event IDs within TTL.
 * Returns true if this is the first observation (claim success).
 */
export function claimWebhookEventId(
  eventId: string,
  ttlMs = 24 * 60 * 60 * 1000,
): boolean {
  const now = Date.now();
  // prune occasionally
  if (replaySeen.size > 10_000) {
    for (const [k, exp] of replaySeen) {
      if (exp <= now) replaySeen.delete(k);
    }
  }
  const existing = replaySeen.get(eventId);
  if (existing != null && existing > now) {
    return false;
  }
  replaySeen.set(eventId, now + ttlMs);
  return true;
}

export function assertFreshTimestamp(
  timestampSec: number | string | null | undefined,
  maxSkewSec = 300,
): void {
  if (timestampSec == null || timestampSec === "") {
    throw new WebhookSecurityError(
      "WEBHOOK_TIMESTAMP_MISSING",
      "Missing webhook timestamp",
    );
  }
  const ts =
    typeof timestampSec === "string" ? Number(timestampSec) : timestampSec;
  if (!Number.isFinite(ts)) {
    throw new WebhookSecurityError(
      "WEBHOOK_TIMESTAMP_INVALID",
      "Invalid webhook timestamp",
    );
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > maxSkewSec) {
    throw new WebhookSecurityError(
      "WEBHOOK_REPLAY",
      "Webhook timestamp outside allowed skew — possible replay",
    );
  }
}

export function resetWebhookReplayForTests() {
  replaySeen.clear();
}
