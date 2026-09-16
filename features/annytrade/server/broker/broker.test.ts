import { describe, expect, it, beforeEach } from "vitest";

import { resetBrokerProviderCache } from "./factory";
import { createTestBrokerProvider } from "./providers/test";
import { createAlpacaPaperBrokerProvider } from "./providers/alpaca-paper";
import { assertSandboxBaseUrl, brokerOrdersEnabled } from "./kill-switch";
import {
  encryptSecret,
  decryptSecret,
  hintKeyId,
} from "../security/secret-box";

describe("broker kill switch + sandbox guard", () => {
  it("defaults orders disabled", () => {
    delete process.env.ANNYTRADE_BROKER_ORDERS_ENABLED;
    expect(brokerOrdersEnabled()).toBe(false);
  });

  it("rejects live alpaca trading URL", () => {
    expect(() => assertSandboxBaseUrl("https://api.alpaca.markets")).toThrow(
      /forbidden/i,
    );
    expect(() =>
      assertSandboxBaseUrl("https://paper-api.alpaca.markets"),
    ).not.toThrow();
  });
});

describe("test broker provider fixtures", () => {
  const creds = { apiKeyId: "test-key", apiSecretKey: "test-secret" };

  beforeEach(() => {
    resetBrokerProviderCache();
  });

  it("fills market buy and supports idempotent client order id", async () => {
    const p = createTestBrokerProvider();
    const a = await p.connect(creds);
    expect(a.liveMoney).toBe(false);
    expect(a.environment).toBe("SANDBOX");
    expect(a.label.toLowerCase()).toContain("sandbox");

    const o1 = await p.submitOrder(creds, {
      clientOrderId: "idem-1",
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 2,
      limitPrice: 50,
    });
    expect(o1.status).toBe("FILLED");
    const o2 = await p.submitOrder(creds, {
      clientOrderId: "idem-1",
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 2,
      limitPrice: 50,
    });
    expect(o2.brokerOrderId).toBe(o1.brokerOrderId);

    const cancelled = await p.cancelOrder(creds, o1.brokerOrderId);
    expect(cancelled.status).toBe("FILLED"); // already filled
  });

  it("rejects fixture symbol and insufficient buying power", async () => {
    const p = createTestBrokerProvider();
    const rejected = await p.submitOrder(creds, {
      clientOrderId: "rej-1",
      symbol: "REJECT",
      side: "BUY",
      orderType: "MARKET",
      quantity: 1,
    });
    expect(rejected.status).toBe("REJECTED");

    const broke = await p.submitOrder(creds, {
      clientOrderId: "broke-1",
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 1_000_000,
      limitPrice: 1000,
    });
    expect(broke.status).toBe("REJECTED");
  });
});

describe("alpaca paper provider meta", () => {
  it("is sandbox-only with official docs", () => {
    const p = createAlpacaPaperBrokerProvider();
    expect(p.meta.environment).toBe("SANDBOX");
    expect(p.meta.providerId).toBe("alpaca_paper");
    expect(p.meta.officialDocsUrl).toContain("alpaca");
    expect(p.meta.supportedOrderTypes).toContain("MARKET");
  });
});

describe("secret box", () => {
  it("round-trips secrets when encryption key set", () => {
    process.env.ANNYTRADE_BROKER_ENCRYPTION_KEY = "a".repeat(64);
    const ct = encryptSecret("super-secret-key");
    expect(ct.startsWith("v1:")).toBe(true);
    expect(decryptSecret(ct)).toBe("super-secret-key");
    expect(hintKeyId("PK12345678")).toBe("…5678");
  });
});
