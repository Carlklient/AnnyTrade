import { getSql } from "../db/client";
import { recordAuditEvent } from "../repos/audit";

export type OpsAlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type OpsAlertType =
  | "broker_outage"
  | "reconciliation_mismatch"
  | "duplicate_event"
  | "order_stuck"
  | "repeated_rejection"
  | "live_blocked_attempt"
  | "emergency_kill"
  | "connectivity_failed"
  | "mark_disagreement";

/**
 * Persist an operational alert (immutable append). Never includes secrets.
 */
export async function raiseOpsAlert(input: {
  alertType: OpsAlertType;
  severity: OpsAlertSeverity;
  message: string;
  userId?: string | null;
  connectionId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const sql = getSql();
  const meta = sanitizeMeta(input.metadata ?? {});
  const rows = await sql<{ id: string }[]>`
    INSERT INTO annytrade.ops_alerts (
      alert_type, severity, message, user_id, connection_id, metadata
    ) VALUES (
      ${input.alertType},
      ${input.severity},
      ${input.message},
      ${input.userId ?? null},
      ${input.connectionId ?? null},
      ${sql.json(meta as never)}
    )
    RETURNING id
  `;
  const id = rows[0]!.id;
  await recordAuditEvent({
    userId: input.userId,
    eventType: `ops.alert.${input.alertType}`,
    metadata: {
      alertId: id,
      severity: input.severity,
      message: input.message,
      ...meta,
    },
  });
  return id;
}

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (/secret|password|token|ciphertext|apiKey|api_key/i.test(k)) continue;
    if (typeof v === "string" && v.length > 500) {
      out[k] = `${v.slice(0, 500)}…`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function listRecentOpsAlerts(limit = 50) {
  const sql = getSql();
  return sql`
    SELECT id, alert_type, severity, message, user_id, connection_id,
           metadata, created_at, acknowledged_at
    FROM annytrade.ops_alerts
    ORDER BY created_at DESC
    LIMIT ${Math.min(limit, 200)}
  `;
}
