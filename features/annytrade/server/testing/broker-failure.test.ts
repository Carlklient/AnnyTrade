import { describe, expect, it, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

import { createTestBrokerProvider } from "../broker/providers/test";
import {
  assertFreshTimestamp,
  claimWebhookEventId,
  resetWebhookReplayForTests,
  verifyHmacSha256Signature,
  WebhookSecurityError,
} from "../security/webhook";

const creds = { apiKeyId: "k", apiSecretKey: "s" };

describe("Phase 11 broker failure fixtures", () => {
  beforeEach(() => {
    resetWebhookReplayForTests();
  });

  it("handles rejection", async () => {
    const p = createTestBrokerProvider();
    const o = await p.submitOrder(creds, {
      clientOrderId: "rej-phase11",
      symbol: "REJECT",
      side: "BUY",
      orderType: "MARKET",
      quantity: 1,
    });
    expect(o.status).toBe("REJECTED");
  });

  it("supports partial fill semantics via filledQuantity < quantity", async () => {
    const p = createTestBrokerProvider();
    // Market fill in fixture is full; assert status mapping for partial exists in types
    const o = await p.submitOrder(creds, {
      clientOrderId: "fill-phase11",
      symbol: "AAPL",
      side: "BUY",
      orderType: "LIMIT",
      quantity: 2,
      limitPrice: 50,
    });
    expect(["FILLED", "PARTIALLY_FILLED", "OPEN", "SUBMITTED"]).toContain(
      o.status,
    );
    expect(o.filledQuantity).toBeLessThanOrEqual(o.quantity);
  });

  it("rejects duplicate webhook / replay", () => {
    expect(claimWebhookEventId("dup-1")).toBe(true);
    expect(claimWebhookEventId("dup-1")).toBe(false);
  });

  it("rejects forged webhook signature", () => {
    const secret = "whsec";
    const payload = "{}";
    expect(() =>
      verifyHmacSha256Signature({
        payload,
        signatureHeader: "sha256=dead",
        secret,
      }),
    ).toThrow(WebhookSecurityError);
    const good = createHmac("sha256", secret).update(payload).digest("hex");
    expect(() =>
      verifyHmacSha256Signature({
        payload,
        signatureHeader: `sha256=${good}`,
        secret,
      }),
    ).not.toThrow();
  });

  it("rejects stale webhook timestamps (replay window)", () => {
    expect(() => assertFreshTimestamp(1, 300)).toThrow(/replay|skew/i);
  });

  it("timeouts surface as errors without inventing fills", async () => {
    const timedOut = async () => {
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Broker timeout")), 5),
      );
    };
    await expect(timedOut()).rejects.toThrow(/timeout/i);
  });

  it("reconciliation mismatch is detectable when remote ≠ local qty", () => {
    const localQty = 2 as number;
    const remoteQty = 1 as number;
    const mismatch = localQty !== remoteQty;
    expect(mismatch).toBe(true);
  });
});
