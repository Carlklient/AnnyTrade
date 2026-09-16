/**
 * Phase 8 — BROKER_LIVE execution guard.
 *
 * Live real-money order submission is HARD-BLOCKED in this phase.
 * Multiple env flags must all be affirmative for ANY future unlock attempt,
 * and PHASE8_LIVE_SUBMISSION_HARD_BLOCK remains true until a later phase
 * deliberately removes it in code review.
 *
 * Accidental deploy: defaults keep live OFF. Missing any flag → blocked.
 */

export const LIVE_OPERATOR_CONFIRMATION_PHRASE =
  "ENABLE_LIVE_TRADING_I_UNDERSTAND_THE_RISKS" as const;

/**
 * Code-level hard block for Phase 8. Must be flipped in a dedicated Phase N
 * change with human review — not via env alone.
 */
export const PHASE8_LIVE_SUBMISSION_HARD_BLOCK = true as const;

export class LiveExecutionDisabledError extends Error {
  readonly code = "LIVE_EXECUTION_DISABLED";
  readonly environment = "BROKER_LIVE" as const;
  constructor(message = "BROKER_LIVE execution is disabled") {
    super(message);
    this.name = "LiveExecutionDisabledError";
  }
}

export type LiveFlagSnapshot = {
  brokerLiveEnabled: boolean;
  brokerLiveOrdersEnabled: boolean;
  allowLiveTrading: boolean;
  operatorConfirmationOk: boolean;
  emergencyKillActive: boolean;
  /** Combined env flags (ignores hard block). */
  allEnvFlagsAffirmative: boolean;
  /** Would live submit be allowed? Always false while hard block is on. */
  liveSubmissionAllowed: boolean;
  hardBlockActive: boolean;
  reason: string;
};

function envTrue(name: string): boolean {
  return process.env[name] === "true";
}

export function emergencyKillSwitchActive(): boolean {
  // Explicit emergency: ANNYTRADE_EMERGENCY_KILL_SWITCH=true disables ALL broker orders.
  return process.env.ANNYTRADE_EMERGENCY_KILL_SWITCH === "true";
}

export function getLiveFlagSnapshot(): LiveFlagSnapshot {
  const brokerLiveEnabled = envTrue("ANNYTRADE_BROKER_LIVE_ENABLED");
  const brokerLiveOrdersEnabled = envTrue(
    "ANNYTRADE_BROKER_LIVE_ORDERS_ENABLED",
  );
  const allowLiveTrading = envTrue("ANNYTRADE_ALLOW_LIVE_TRADING");
  const operatorConfirmationOk =
    process.env.ANNYTRADE_LIVE_OPERATOR_CONFIRMATION ===
    LIVE_OPERATOR_CONFIRMATION_PHRASE;
  const emergencyKillActive = emergencyKillSwitchActive();
  const hardBlockActive = PHASE8_LIVE_SUBMISSION_HARD_BLOCK === true;

  const allEnvFlagsAffirmative =
    brokerLiveEnabled &&
    brokerLiveOrdersEnabled &&
    allowLiveTrading &&
    operatorConfirmationOk &&
    !emergencyKillActive;

  let reason = "LIVE_EXECUTION_DISABLED";
  if (hardBlockActive) {
    reason =
      "PHASE8_LIVE_SUBMISSION_HARD_BLOCK — live order submission cannot be enabled via env alone";
  } else if (emergencyKillActive) {
    reason = "ANNYTRADE_EMERGENCY_KILL_SWITCH active";
  } else if (!allEnvFlagsAffirmative) {
    reason =
      "One or more live feature flags are OFF or operator confirmation phrase missing";
  } else {
    reason = "Live flags affirmative (provider still required)";
  }

  return {
    brokerLiveEnabled,
    brokerLiveOrdersEnabled,
    allowLiveTrading,
    operatorConfirmationOk,
    emergencyKillActive,
    allEnvFlagsAffirmative,
    hardBlockActive,
    liveSubmissionAllowed: false, // Phase 8: never true
    reason,
  };
}

/** True only if live submission could ever proceed — Phase 8: always false. */
export function isBrokerLiveExecutionEnabled(): boolean {
  return getLiveFlagSnapshot().liveSubmissionAllowed;
}

/**
 * Refuse live order submission. Throws even if every env flag is set —
 * Phase 8 hard block + no live money path.
 */
export function assertLiveExecutionAllowed(): never {
  const snap = getLiveFlagSnapshot();
  throw new LiveExecutionDisabledError(
    `BROKER_LIVE order submission refused: ${snap.reason}`,
  );
}

/** Refuse any attempt to use live broker base URLs. */
export function assertNotLiveBrokerUrl(url: string): void {
  const u = url.toLowerCase();
  if (u.includes("api.alpaca.markets") && !u.includes("paper-api")) {
    throw new LiveExecutionDisabledError(
      "Live Alpaca trading URL is forbidden while LIVE execution is disabled",
    );
  }
}
