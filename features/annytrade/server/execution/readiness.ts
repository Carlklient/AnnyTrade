import { brokerOrdersEnabled } from "../broker/kill-switch";
import {
  getBrokerCredentialStatus,
  tryGetBrokerProvider,
} from "../broker/factory";
import { emergencyKillSwitchActive, getLiveFlagSnapshot } from "./live-guard";
import { getRiskLimitConfig } from "./risk-limits";
import { complianceSummary } from "./compliance";
import { stampEnvironment } from "./environments";
import { getBrokerLiveStatus } from "./live-execution";

/**
 * Aggregate Phase 8 readiness status — server authoritative.
 */
export function getExecutionReadinessStatus() {
  const live = getLiveFlagSnapshot();
  const creds = getBrokerCredentialStatus();
  const provider = tryGetBrokerProvider();
  const risk = getRiskLimitConfig();
  const compliance = complianceSummary();

  return {
    environments: {
      INTERNAL_PAPER: {
        ...stampEnvironment("INTERNAL_PAPER"),
        active: true,
        ordersPath: "/api/annytrade/orders",
      },
      BROKER_SANDBOX: {
        ...stampEnvironment("BROKER_SANDBOX"),
        active: true,
        ordersEnabled: brokerOrdersEnabled() && !emergencyKillSwitchActive(),
        ordersPath: "/api/annytrade/broker/orders",
        credentialsRequired: creds.credentialRequired,
        providerId: provider?.meta.providerId ?? null,
      },
      BROKER_LIVE: {
        ...getBrokerLiveStatus(),
        ordersPath: "/api/annytrade/broker/live/orders",
      },
    },
    emergencyKillSwitchActive: emergencyKillSwitchActive(),
    sandboxOrdersKillSwitchActive: !brokerOrdersEnabled(),
    liveFlags: live,
    riskLimits: risk,
    compliance,
    frontendAuthoritative: false as const,
    custody: {
      customerFundCustody: false as const,
      cryptoCustody: false as const,
    },
    liveExecutionEnabled: false as const,
    phase: 8,
    message:
      "Phase 8 live execution readiness — BROKER_LIVE DISABLED (hard block + feature flags)",
  };
}
