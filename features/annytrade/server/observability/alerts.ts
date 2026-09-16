/**
 * Alerting hooks for critical failures (Phase 10).
 * Webhook URL optional — never invents credentials.
 */

import {
  raiseOpsAlert,
  type OpsAlertSeverity,
  type OpsAlertType,
} from "../execution/ops-alerts";
import { log } from "./log";
import { incrMetric } from "./metrics";

export async function emitCriticalAlert(input: {
  alertType: OpsAlertType | "admin_security" | "job_failed" | "db_unhealthy";
  message: string;
  severity?: OpsAlertSeverity;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const severity = input.severity ?? "CRITICAL";
  incrMetric("annytrade.alerts.emitted", 1, { severity });

  const mappedType =
    input.alertType === "admin_security" ||
    input.alertType === "job_failed" ||
    input.alertType === "db_unhealthy"
      ? "broker_outage"
      : input.alertType;

  try {
    await raiseOpsAlert({
      alertType: mappedType,
      severity,
      message: `[${input.alertType}] ${input.message}`,
      userId: input.userId,
      metadata: { ...input.metadata, originalType: input.alertType },
    });
  } catch (err) {
    log.warn("ops_alert_persist_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
  }

  const hook = process.env.ANNYTRADE_ALERT_WEBHOOK_URL;
  if (!hook) {
    log.error("critical_alert", {
      alertType: input.alertType,
      message: input.message,
      severity,
    });
    return;
  }

  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "annytrade",
        alertType: input.alertType,
        severity,
        message: input.message,
        metadata: input.metadata ?? {},
        at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    log.warn("alert_webhook_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
  }
}
