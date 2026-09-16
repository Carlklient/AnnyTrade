import { getSql } from "../db/client";

export type DbPriceAlert = {
  id: string;
  user_id: string;
  symbol: string;
  condition: "PRICE_ABOVE" | "PRICE_BELOW" | "PCT_MOVE";
  target_value: string;
  baseline_price: string | null;
  status: "ACTIVE" | "TRIGGERED" | "DISABLED" | "CANCELLED";
  cooldown_seconds: number;
  last_triggered_at: Date | null;
  trigger_count: number;
  armed: boolean;
  notify_in_app: boolean;
  notify_email: boolean;
  note: string | null;
  created_at: Date;
  updated_at: Date;
};

export type PublicPriceAlert = {
  id: string;
  symbol: string;
  condition: DbPriceAlert["condition"];
  targetValue: number;
  baselinePrice: number | null;
  status: DbPriceAlert["status"];
  cooldownSeconds: number;
  lastTriggeredAt: string | null;
  triggerCount: number;
  armed: boolean;
  notifyInApp: boolean;
  notifyEmail: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toPublicPriceAlert(row: DbPriceAlert): PublicPriceAlert {
  return {
    id: row.id,
    symbol: row.symbol,
    condition: row.condition,
    targetValue: Number(row.target_value),
    baselinePrice:
      row.baseline_price != null ? Number(row.baseline_price) : null,
    status: row.status,
    cooldownSeconds: row.cooldown_seconds,
    lastTriggeredAt: row.last_triggered_at?.toISOString() ?? null,
    triggerCount: row.trigger_count,
    armed: row.armed,
    notifyInApp: row.notify_in_app,
    notifyEmail: row.notify_email,
    note: row.note,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listPriceAlertsForUser(
  userId: string,
): Promise<DbPriceAlert[]> {
  const sql = getSql();
  return sql<DbPriceAlert[]>`
    SELECT * FROM annytrade.price_alerts
    WHERE user_id = ${userId}
      AND status <> 'CANCELLED'
    ORDER BY created_at DESC
  `;
}

export async function listActivePriceAlerts(): Promise<DbPriceAlert[]> {
  const sql = getSql();
  return sql<DbPriceAlert[]>`
    SELECT * FROM annytrade.price_alerts
    WHERE status = 'ACTIVE'
    ORDER BY symbol ASC
  `;
}

export async function listActivePriceAlertsForUser(
  userId: string,
): Promise<DbPriceAlert[]> {
  const sql = getSql();
  return sql<DbPriceAlert[]>`
    SELECT * FROM annytrade.price_alerts
    WHERE user_id = ${userId} AND status = 'ACTIVE'
  `;
}

export async function createPriceAlert(input: {
  userId: string;
  symbol: string;
  condition: DbPriceAlert["condition"];
  targetValue: number;
  baselinePrice?: number | null;
  cooldownSeconds?: number;
  notifyInApp?: boolean;
  notifyEmail?: boolean;
  note?: string | null;
}): Promise<DbPriceAlert> {
  const sql = getSql();
  const rows = await sql<DbPriceAlert[]>`
    INSERT INTO annytrade.price_alerts (
      user_id, symbol, condition, target_value, baseline_price,
      cooldown_seconds, notify_in_app, notify_email, note
    ) VALUES (
      ${input.userId},
      ${input.symbol.toUpperCase()},
      ${input.condition},
      ${input.targetValue},
      ${input.baselinePrice ?? null},
      ${input.cooldownSeconds ?? 3600},
      ${input.notifyInApp ?? true},
      ${input.notifyEmail ?? false},
      ${input.note ?? null}
    )
    RETURNING *
  `;
  return rows[0]!;
}

export async function getPriceAlertForUser(
  userId: string,
  alertId: string,
): Promise<DbPriceAlert | null> {
  const sql = getSql();
  const rows = await sql<DbPriceAlert[]>`
    SELECT * FROM annytrade.price_alerts
    WHERE id = ${alertId} AND user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function cancelPriceAlert(
  userId: string,
  alertId: string,
): Promise<DbPriceAlert | null> {
  const sql = getSql();
  const rows = await sql<DbPriceAlert[]>`
    UPDATE annytrade.price_alerts
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE id = ${alertId} AND user_id = ${userId} AND status <> 'CANCELLED'
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function updateAlertTriggerState(input: {
  id: string;
  armed: boolean;
  triggered?: boolean;
}): Promise<void> {
  const sql = getSql();
  if (input.triggered) {
    await sql`
      UPDATE annytrade.price_alerts
      SET
        armed = ${input.armed},
        last_triggered_at = NOW(),
        trigger_count = trigger_count + 1,
        updated_at = NOW()
      WHERE id = ${input.id}
    `;
  } else {
    await sql`
      UPDATE annytrade.price_alerts
      SET armed = ${input.armed}, updated_at = NOW()
      WHERE id = ${input.id}
    `;
  }
}
