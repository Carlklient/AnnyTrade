/**
 * Global kill switches for broker order submission.
 * Sandbox orders: ANNYTRADE_BROKER_ORDERS_ENABLED=true required.
 * Emergency: ANNYTRADE_EMERGENCY_KILL_SWITCH=true disables ALL broker orders.
 * Never enables real-money LIVE trading.
 */

import { emergencyKillSwitchActive } from "../execution/live-guard";

export function brokerOrdersEnabled(): boolean {
  if (emergencyKillSwitchActive()) return false;
  return process.env.ANNYTRADE_BROKER_ORDERS_ENABLED === "true";
}

export function assertBrokerOrdersAllowed(): void {
  if (emergencyKillSwitchActive()) {
    throw new BrokerKillSwitchError(
      "Emergency kill switch active (ANNYTRADE_EMERGENCY_KILL_SWITCH=true)",
    );
  }
  if (!brokerOrdersEnabled()) {
    throw new BrokerKillSwitchError();
  }
}

export class BrokerKillSwitchError extends Error {
  readonly code = "BROKER_KILL_SWITCH";
  constructor(
    message = "Broker order submission is disabled (ANNYTRADE_BROKER_ORDERS_ENABLED≠true)",
  ) {
    super(message);
    this.name = "BrokerKillSwitchError";
  }
}

/** Refuse any non-sandbox base URL. */
export function assertSandboxBaseUrl(url: string): void {
  const u = url.toLowerCase();
  if (u.includes("api.alpaca.markets") && !u.includes("paper-api")) {
    throw new Error(
      "Live Alpaca trading URL is forbidden — use paper-api only",
    );
  }
}
