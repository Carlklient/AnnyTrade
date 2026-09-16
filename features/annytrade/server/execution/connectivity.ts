/**
 * Broker connectivity checks (Phase 8). Never treats frontend as authoritative.
 */

import type { BrokerProvider } from "../broker/provider";
import type { BrokerCredentials } from "../broker/types";
import { raiseOpsAlert } from "./ops-alerts";

export type ConnectivityResult = {
  ok: boolean;
  checkedAt: string;
  latencyMs: number | null;
  externalAccountId: string | null;
  error: string | null;
  liveMoney: false;
};

export async function checkBrokerConnectivity(input: {
  provider: BrokerProvider;
  credentials: BrokerCredentials;
  userId?: string | null;
  connectionId?: string | null;
}): Promise<ConnectivityResult> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  try {
    const account = await input.provider.getAccount(input.credentials);
    if (account.liveMoney !== false || account.environment !== "SANDBOX") {
      await raiseOpsAlert({
        alertType: "connectivity_failed",
        severity: "CRITICAL",
        message: "Broker account reported non-sandbox / liveMoney — blocked",
        userId: input.userId,
        connectionId: input.connectionId,
      });
      return {
        ok: false,
        checkedAt,
        latencyMs: Date.now() - started,
        externalAccountId: null,
        error: "Non-sandbox broker account rejected",
        liveMoney: false,
      };
    }
    return {
      ok: true,
      checkedAt,
      latencyMs: Date.now() - started,
      externalAccountId: account.externalAccountId,
      error: null,
      liveMoney: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connectivity failed";
    await raiseOpsAlert({
      alertType: "broker_outage",
      severity: "CRITICAL",
      message: `Broker connectivity check failed: ${message.slice(0, 200)}`,
      userId: input.userId,
      connectionId: input.connectionId,
    });
    return {
      ok: false,
      checkedAt,
      latencyMs: Date.now() - started,
      externalAccountId: null,
      error: message.slice(0, 300),
      liveMoney: false,
    };
  }
}
