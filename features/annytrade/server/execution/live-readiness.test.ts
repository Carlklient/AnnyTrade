import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  PHASE8_LIVE_SUBMISSION_HARD_BLOCK,
  LIVE_OPERATOR_CONFIRMATION_PHRASE,
  assertLiveExecutionAllowed,
  getLiveFlagSnapshot,
  isBrokerLiveExecutionEnabled,
  LiveExecutionDisabledError,
} from "./live-guard";
import { getBrokerLiveStatus, submitBrokerLiveOrder } from "./live-execution";
import { getExecutionReadinessStatus } from "./readiness";
import { assertQuoteFresh, StalePriceError } from "./stale-price";
import { assertOrderWithinRiskLimits, RiskLimitError } from "./risk-limits";
import {
  assertNotDuplicateRecent,
  resetDuplicateOrderWindow,
  DuplicateOrderError,
} from "./duplicate-order";
import { buildOrderReview } from "./order-review";
import { complianceSummary } from "./compliance";
import { stampEnvironment } from "./environments";
import { ApiError } from "../http/errors";

const LIVE_FLAGS = [
  "ANNYTRADE_BROKER_LIVE_ENABLED",
  "ANNYTRADE_BROKER_LIVE_ORDERS_ENABLED",
  "ANNYTRADE_ALLOW_LIVE_TRADING",
  "ANNYTRADE_LIVE_OPERATOR_CONFIRMATION",
  "ANNYTRADE_EMERGENCY_KILL_SWITCH",
] as const;

describe("Phase 8 BROKER_LIVE remains blocked", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of LIVE_FLAGS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of LIVE_FLAGS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("hard block constant is true", () => {
    expect(PHASE8_LIVE_SUBMISSION_HARD_BLOCK).toBe(true);
  });

  it("defaults: live submission disabled", () => {
    expect(isBrokerLiveExecutionEnabled()).toBe(false);
    const snap = getLiveFlagSnapshot();
    expect(snap.liveSubmissionAllowed).toBe(false);
    expect(snap.hardBlockActive).toBe(true);
  });

  it("stays blocked even when ALL env flags are affirmative", () => {
    process.env.ANNYTRADE_BROKER_LIVE_ENABLED = "true";
    process.env.ANNYTRADE_BROKER_LIVE_ORDERS_ENABLED = "true";
    process.env.ANNYTRADE_ALLOW_LIVE_TRADING = "true";
    process.env.ANNYTRADE_LIVE_OPERATOR_CONFIRMATION =
      LIVE_OPERATOR_CONFIRMATION_PHRASE;
    delete process.env.ANNYTRADE_EMERGENCY_KILL_SWITCH;

    const snap = getLiveFlagSnapshot();
    expect(snap.allEnvFlagsAffirmative).toBe(true);
    expect(snap.liveSubmissionAllowed).toBe(false);
    expect(isBrokerLiveExecutionEnabled()).toBe(false);
    expect(() => assertLiveExecutionAllowed()).toThrow(
      LiveExecutionDisabledError,
    );
  });

  it("live status API payload never reports enabled", () => {
    const status = getBrokerLiveStatus();
    expect(status.enabled).toBe(false);
    expect(status.submissionAllowed).toBe(false);
    expect(status.liveMoney).toBe(true); // label truth for the venue
    expect(status.environment).toBe("BROKER_LIVE");
    expect(status.custody.customerFundCustody).toBe(false);
  });

  it("submitBrokerLiveOrder refuses with LIVE_EXECUTION_DISABLED", async () => {
    process.env.ANNYTRADE_BROKER_LIVE_ENABLED = "true";
    process.env.ANNYTRADE_BROKER_LIVE_ORDERS_ENABLED = "true";
    process.env.ANNYTRADE_ALLOW_LIVE_TRADING = "true";
    process.env.ANNYTRADE_LIVE_OPERATOR_CONFIRMATION =
      LIVE_OPERATOR_CONFIRMATION_PHRASE;

    await expect(
      submitBrokerLiveOrder("00000000-0000-0000-0000-000000000001", {
        clientOrderId: "test-live-block-1",
        symbol: "AAPL",
        side: "BUY",
        orderType: "MARKET",
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ApiError);

    try {
      await submitBrokerLiveOrder("00000000-0000-0000-0000-000000000001", {
        clientOrderId: "test-live-block-2",
        symbol: "AAPL",
        side: "BUY",
        orderType: "MARKET",
        quantity: 1,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("LIVE_EXECUTION_DISABLED");
    }
  });

  it("readiness reports liveExecutionEnabled false", () => {
    const r = getExecutionReadinessStatus();
    expect(r.liveExecutionEnabled).toBe(false);
    expect(r.environments.BROKER_LIVE.enabled).toBe(false);
    expect(r.frontendAuthoritative).toBe(false);
    expect(r.compliance.approvedForLive).toBe(false);
  });
});

describe("safety controls", () => {
  beforeEach(() => {
    resetDuplicateOrderWindow();
  });

  it("stale quote protection", () => {
    expect(() =>
      assertQuoteFresh({
        quoteTimestamp: new Date(Date.now() - 60_000).toISOString(),
        maxAgeMs: 15_000,
      }),
    ).toThrow(StalePriceError);
    expect(
      assertQuoteFresh({
        quoteTimestamp: new Date().toISOString(),
        maxAgeMs: 15_000,
      }).fresh,
    ).toBe(true);
  });

  it("risk limits", () => {
    expect(() =>
      assertOrderWithinRiskLimits({
        quantity: 1,
        estimatedNotionalUsd: 1_000_000,
      }),
    ).toThrow(RiskLimitError);
  });

  it("duplicate order window", () => {
    const fp = {
      accountId: "acc",
      symbol: "AAPL",
      side: "BUY",
      orderType: "MARKET",
      quantity: 1,
      limitPrice: null,
      stopPrice: null,
    };
    assertNotDuplicateRecent(fp);
    expect(() => assertNotDuplicateRecent(fp)).toThrow(DuplicateOrderError);
  });

  it("BROKER_LIVE order review is BLOCKED", () => {
    const review = buildOrderReview(
      {
        symbol: "AAPL",
        side: "BUY",
        quantity: 1,
        orderType: "MARKET",
        limitPrice: null,
        stopPrice: null,
        estimatedValue: 100,
        marketState: "open",
        accountId: "00000000-0000-0000-0000-000000000099",
        accountLabel: "Live",
        environment: "BROKER_LIVE",
        quoteTimestamp: new Date().toISOString(),
        clientOrderId: "review-1",
      },
      "rev-1",
    );
    expect(review.status).toBe("BLOCKED");
    expect(review.liveMoney).toBe(true);
  });

  it("environment stamps", () => {
    expect(stampEnvironment("INTERNAL_PAPER").liveMoney).toBe(false);
    expect(stampEnvironment("BROKER_SANDBOX").liveMoney).toBe(false);
    expect(stampEnvironment("BROKER_LIVE").liveMoney).toBe(true);
  });

  it("compliance checklist is not fabricated as approved", () => {
    const c = complianceSummary();
    expect(c.approvedForLive).toBe(false);
    expect(c.fabricatedApproval).toBe(false);
    expect(c.items.every((i) => i.status === "not_assessed")).toBe(true);
  });
});
