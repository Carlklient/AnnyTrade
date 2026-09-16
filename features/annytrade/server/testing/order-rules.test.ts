/**
 * Paper order domain rules (unit) — no DB.
 * Complements paper.integration for Phase 11 matrix "order rules".
 */
import { describe, expect, it } from "vitest";

import { normalizeSymbol } from "../market/normalize";
import { PHASE8_LIVE_SUBMISSION_HARD_BLOCK } from "../execution/live-guard";
import {
  assertOrderWithinRiskLimits,
  RiskLimitError,
} from "../execution/risk-limits";
import {
  assertNotDuplicateRecent,
  DuplicateOrderError,
  resetDuplicateOrderWindow,
  newIdempotencyKey,
} from "../execution/duplicate-order";

describe("Phase 11 order rules (unit)", () => {
  it("normalizes symbols to canonical uppercase", () => {
    expect(normalizeSymbol(" aapl ")).toBe("AAPL");
    expect(normalizeSymbol("btcusd")).toBe("BTCUSD");
  });

  it("rejects oversized notional / quantity", () => {
    expect(() =>
      assertOrderWithinRiskLimits({
        quantity: 1,
        estimatedNotionalUsd: 1_000_000,
      }),
    ).toThrow(RiskLimitError);
    expect(() =>
      assertOrderWithinRiskLimits({
        quantity: 50_000,
        estimatedNotionalUsd: 100,
      }),
    ).toThrow(RiskLimitError);
  });

  it("enforces duplicate fingerprint window and unique idempotency keys", () => {
    resetDuplicateOrderWindow();
    const fp = {
      accountId: "acc",
      symbol: "AAPL",
      side: "BUY" as const,
      orderType: "MARKET" as const,
      quantity: 1,
      limitPrice: null,
      stopPrice: null,
    };
    assertNotDuplicateRecent(fp);
    expect(() => assertNotDuplicateRecent(fp)).toThrow(DuplicateOrderError);
    const a = newIdempotencyKey("ord");
    const b = newIdempotencyKey("ord");
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(12);
  });

  it("keeps live execution hard-blocked", () => {
    expect(PHASE8_LIVE_SUBMISSION_HARD_BLOCK).toBe(true);
  });
});
