import { describe, expect, it, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

import { redactValue, redactMetadata } from "./redact";
import {
  assertFreshTimestamp,
  claimWebhookEventId,
  resetWebhookReplayForTests,
  verifyHmacSha256Signature,
  WebhookSecurityError,
} from "./webhook";
import {
  encryptSecret,
  decryptSecret,
  rewrapSecret,
  encryptionRotationStatus,
} from "./secret-box";
import {
  rateLimit,
  rateLimitBackendStatus,
  resetRateLimitForTests,
} from "./rate-limit";
import { PHASE8_LIVE_SUBMISSION_HARD_BLOCK } from "../execution/live-guard";
import { AUDIT_RETENTION_STRATEGY } from "../repos/audit";

describe("Phase 9 security controls", () => {
  beforeEach(() => {
    resetRateLimitForTests();
    resetWebhookReplayForTests();
  });

  it("keeps live execution hard-blocked", () => {
    expect(PHASE8_LIVE_SUBMISSION_HARD_BLOCK).toBe(true);
  });

  it("redacts sensitive keys and inline secrets", () => {
    const out = redactMetadata({
      password: "secret123",
      apiKey: "AKIA...",
      symbol: "AAPL",
      note: "bearer abc.def.ghi was used",
    }) as Record<string, unknown>;
    expect(out.password).toBe("[redacted]");
    expect(out.apiKey).toBe("[redacted]");
    expect(out.symbol).toBe("AAPL");
    expect(String(out.note)).not.toMatch(/abc\.def/);
    expect(redactValue("v1:deadbeef:tag:cipher")).toContain("[redacted]");
  });

  it("verifies webhook HMAC and rejects bad signatures", () => {
    const secret = "whsec_test";
    const payload = JSON.stringify({ hello: "world" });
    const sig = createHmac("sha256", secret).update(payload).digest("hex");
    expect(() =>
      verifyHmacSha256Signature({
        payload,
        signatureHeader: `sha256=${sig}`,
        secret,
      }),
    ).not.toThrow();
    expect(() =>
      verifyHmacSha256Signature({
        payload,
        signatureHeader: "sha256=deadbeef",
        secret,
      }),
    ).toThrow(WebhookSecurityError);
  });

  it("enforces webhook replay and timestamp skew", () => {
    expect(claimWebhookEventId("evt-1")).toBe(true);
    expect(claimWebhookEventId("evt-1")).toBe(false);
    expect(() =>
      assertFreshTimestamp(Math.floor(Date.now() / 1000)),
    ).not.toThrow();
    expect(() => assertFreshTimestamp(1)).toThrow(/replay|skew/i);
  });

  it("supports encryption key rotation via previous key", () => {
    process.env.ANNYTRADE_BROKER_ENCRYPTION_KEY = "a".repeat(64);
    delete process.env.ANNYTRADE_BROKER_ENCRYPTION_KEY_PREVIOUS;
    const ct = encryptSecret("broker-secret");
    process.env.ANNYTRADE_BROKER_ENCRYPTION_KEY_PREVIOUS = "a".repeat(64);
    process.env.ANNYTRADE_BROKER_ENCRYPTION_KEY = "b".repeat(64);
    expect(decryptSecret(ct)).toBe("broker-secret");
    const rewrapped = rewrapSecret(ct);
    delete process.env.ANNYTRADE_BROKER_ENCRYPTION_KEY_PREVIOUS;
    expect(decryptSecret(rewrapped)).toBe("broker-secret");
    expect(encryptionRotationStatus().hasPrimary).toBe(true);
  });

  it("rate limit memory backend works", () => {
    const status = rateLimitBackendStatus();
    expect(["memory", "redis"]).toContain(status.preferred);
    const a = rateLimit({ key: "t:1", limit: 2, windowMs: 60_000 });
    const b = rateLimit({ key: "t:1", limit: 2, windowMs: 60_000 });
    const c = rateLimit({ key: "t:1", limit: 2, windowMs: 60_000 });
    expect(a.ok && b.ok).toBe(true);
    expect(c.ok).toBe(false);
  });

  it("documents audit retention without fabricating compliance", () => {
    expect(AUDIT_RETENTION_STRATEGY.note).toMatch(/legal determination/i);
    expect(AUDIT_RETENTION_STRATEGY.integrity).not.toMatch(
      /certified WORM guaranteed/i,
    );
  });
});
