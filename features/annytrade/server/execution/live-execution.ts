import { ApiError } from "../http/errors";
import { recordAuditEvent } from "../repos/audit";
import {
  assertLiveExecutionAllowed,
  getLiveFlagSnapshot,
  LiveExecutionDisabledError,
} from "./live-guard";
import { raiseOpsAlert } from "./ops-alerts";
import { stampEnvironment } from "./environments";
import type { BrokerOrderRequest } from "../broker/types";

/**
 * Attempt BROKER_LIVE order submission — always refused in Phase 8.
 * Architecture entry point for a future Phase; must not call any live broker API.
 */
export async function submitBrokerLiveOrder(
  userId: string,
  order: BrokerOrderRequest,
): Promise<never> {
  void order;
  const snap = getLiveFlagSnapshot();
  try {
    await recordAuditEvent({
      userId,
      eventType: "broker.live.order.blocked",
      metadata: {
        environment: "BROKER_LIVE",
        liveMoney: true,
        reason: snap.reason,
        hardBlockActive: snap.hardBlockActive,
        flags: {
          brokerLiveEnabled: snap.brokerLiveEnabled,
          brokerLiveOrdersEnabled: snap.brokerLiveOrdersEnabled,
          allowLiveTrading: snap.allowLiveTrading,
          operatorConfirmationOk: snap.operatorConfirmationOk,
          emergencyKillActive: snap.emergencyKillActive,
        },
      },
    });
    await raiseOpsAlert({
      alertType: "live_blocked_attempt",
      severity: "WARNING",
      message:
        "Attempted BROKER_LIVE order submission while live execution disabled",
      userId,
      metadata: { reason: snap.reason },
    });
  } catch {
    // Best-effort audit — refusal must not depend on DB availability.
  }

  try {
    assertLiveExecutionAllowed();
  } catch (err) {
    if (err instanceof LiveExecutionDisabledError) {
      throw new ApiError(403, err.code, err.message);
    }
    throw err;
  }
  throw new ApiError(403, "LIVE_EXECUTION_DISABLED", "Unreachable");
}

export async function cancelBrokerLiveOrder(
  userId: string,
  brokerOrderId: string,
): Promise<never> {
  void brokerOrderId;
  await recordAuditEvent({
    userId,
    eventType: "broker.live.cancel.blocked",
    metadata: {
      ...stampEnvironment("BROKER_LIVE"),
      brokerOrderId,
    },
  }).catch(() => undefined);
  assertLiveExecutionAllowed();
}

export function getBrokerLiveStatus() {
  const snap = getLiveFlagSnapshot();
  return {
    ...stampEnvironment("BROKER_LIVE"),
    enabled: false as const,
    submissionAllowed: false as const,
    flags: snap,
    message: "BROKER_LIVE remains DISABLED — Phase 8 readiness only",
    custody: {
      customerFundCustody: false as const,
      cryptoCustody: false as const,
      note: "AnnyTrade does not custody customer funds or arbitrary crypto.",
    },
  };
}
