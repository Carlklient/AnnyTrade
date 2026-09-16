import { describe, expect, it } from "vitest";

import { inCooldown, isAlertConditionMet } from "./engine";
import type { DbPriceAlert } from "../repos/alerts";

function alert(
  partial: Partial<DbPriceAlert> &
    Pick<DbPriceAlert, "condition" | "target_value">,
): Pick<
  DbPriceAlert,
  | "condition"
  | "target_value"
  | "baseline_price"
  | "last_triggered_at"
  | "cooldown_seconds"
> {
  return {
    baseline_price: partial.baseline_price ?? null,
    last_triggered_at: partial.last_triggered_at ?? null,
    cooldown_seconds: partial.cooldown_seconds ?? 3600,
    condition: partial.condition,
    target_value: partial.target_value,
  };
}

describe("alert conditions", () => {
  it("price above / below", () => {
    expect(
      isAlertConditionMet(
        alert({ condition: "PRICE_ABOVE", target_value: "100" }),
        100,
      ),
    ).toBe(true);
    expect(
      isAlertConditionMet(
        alert({ condition: "PRICE_ABOVE", target_value: "100" }),
        99.9,
      ),
    ).toBe(false);
    expect(
      isAlertConditionMet(
        alert({ condition: "PRICE_BELOW", target_value: "50" }),
        50,
      ),
    ).toBe(true);
    expect(
      isAlertConditionMet(
        alert({ condition: "PRICE_BELOW", target_value: "50" }),
        50.1,
      ),
    ).toBe(false);
  });

  it("percent move uses baseline", () => {
    expect(
      isAlertConditionMet(
        alert({
          condition: "PCT_MOVE",
          target_value: "5",
          baseline_price: "100",
        }),
        106,
      ),
    ).toBe(true);
    expect(
      isAlertConditionMet(
        alert({
          condition: "PCT_MOVE",
          target_value: "5",
          baseline_price: "100",
        }),
        104,
      ),
    ).toBe(false);
    expect(
      isAlertConditionMet(
        alert({
          condition: "PCT_MOVE",
          target_value: "5",
          baseline_price: null,
        }),
        200,
      ),
    ).toBe(false);
  });
});

describe("cooldown / anti-spam", () => {
  it("blocks within cooldown window", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const recent = new Date("2026-01-01T11:30:00.000Z");
    expect(
      inCooldown(
        alert({
          condition: "PRICE_ABOVE",
          target_value: "1",
          last_triggered_at: recent,
          cooldown_seconds: 3600,
        }),
        now,
      ),
    ).toBe(true);
    expect(
      inCooldown(
        alert({
          condition: "PRICE_ABOVE",
          target_value: "1",
          last_triggered_at: new Date("2026-01-01T10:00:00.000Z"),
          cooldown_seconds: 3600,
        }),
        now,
      ),
    ).toBe(false);
  });
});
