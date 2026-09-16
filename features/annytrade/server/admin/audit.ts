import { getSql } from "../db/client";
import { redactEmail } from "./redaction";

export async function listAuditEventsForAdmin(input: {
  eventType?: string | null;
  userId?: string | null;
  limit?: number;
  offset?: number;
}) {
  const sql = getSql();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = Math.max(input.offset ?? 0, 0);
  const eventType = input.eventType?.trim() || null;
  const like = eventType ? `${eventType}%` : null;
  const userId = input.userId || null;

  const rows = (await sql.unsafe(
    `SELECT a.id, a.user_id, a.event_type, a.metadata, a.created_at, u.email
     FROM annytrade.audit_events a
     LEFT JOIN annytrade.users u ON u.id = a.user_id
     WHERE ($1::text IS NULL OR a.event_type LIKE $1)
       AND ($2::uuid IS NULL OR a.user_id = $2::uuid)
     ORDER BY a.created_at DESC
     LIMIT $3 OFFSET $4`,
    [like, userId, limit, offset],
  )) as {
    id: string;
    user_id: string | null;
    event_type: string;
    metadata: Record<string, unknown>;
    created_at: Date;
    email: string | null;
  }[];

  return {
    limit,
    offset,
    events: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      emailRedacted: r.email ? redactEmail(r.email) : null,
      eventType: r.event_type,
      metadata: r.metadata,
      createdAt: r.created_at.toISOString(),
    })),
  };
}

export async function listAdminActionAudit(limit = 50) {
  const sql = getSql();
  return sql`
    SELECT id, actor_user_id, action, target_user_id, target_account_id, metadata, created_at
    FROM annytrade.admin_action_audit
    ORDER BY created_at DESC
    LIMIT ${Math.min(limit, 100)}
  `;
}

export async function getReconciliationAdminView() {
  const sql = getSql();
  const connections = await sql`
    SELECT id, user_id, provider, status, external_account_id,
           last_synced_at, last_error, updated_at
    FROM annytrade.broker_connections
    ORDER BY updated_at DESC
    LIMIT 50
  `;
  const mismatches = await sql`
    SELECT id, alert_type, severity, message, user_id, created_at, metadata
    FROM annytrade.ops_alerts
    WHERE alert_type IN ('reconciliation_mismatch', 'broker_outage', 'duplicate_event', 'order_stuck')
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return {
    connections,
    mismatchAlerts: mismatches,
    note: "Broker balances are authoritative for BROKER_SANDBOX; local tables are mirrors.",
  };
}
