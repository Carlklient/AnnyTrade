import { getSql } from "../db/client";
import type { DbNotification } from "../domain/types";

export async function listNotifications(
  userId: string,
  limit = 50,
): Promise<DbNotification[]> {
  const sql = getSql();
  return sql<DbNotification[]>`
    SELECT * FROM annytrade.notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
}): Promise<DbNotification> {
  const sql = getSql();
  const rows = await sql<DbNotification[]>`
    INSERT INTO annytrade.notifications (user_id, type, title, message)
    VALUES (${input.userId}, ${input.type}, ${input.title}, ${input.message})
    RETURNING *
  `;
  const row = rows[0];
  if (!row) throw new Error("Failed to create notification");
  return row;
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE annytrade.notifications
    SET read_at = COALESCE(read_at, NOW())
    WHERE id = ${notificationId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function markAllNotificationsRead(
  userId: string,
): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    UPDATE annytrade.notifications
    SET read_at = NOW()
    WHERE user_id = ${userId} AND read_at IS NULL
    RETURNING id
  `;
  return rows.length;
}
