import { getSql } from "../db/client";
import { log } from "../observability/log";

export async function startJobRun(input: {
  jobName: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const sql = getSql();
  const rows = await sql<{ id: string }[]>`
    INSERT INTO annytrade.job_runs (job_name, status, user_id, metadata)
    VALUES (
      ${input.jobName},
      'RUNNING',
      ${input.userId ?? null},
      ${sql.json((input.metadata ?? {}) as never)}
    )
    RETURNING id
  `;
  return rows[0]!.id;
}

export async function finishJobRun(
  jobId: string,
  result: { ok: boolean; error?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE annytrade.job_runs SET
      status = ${result.ok ? "SUCCEEDED" : "FAILED"},
      finished_at = NOW(),
      error_message = ${result.error ?? null},
      metadata = COALESCE(metadata, '{}'::jsonb) || ${sql.json((result.metadata ?? {}) as never)}
    WHERE id = ${jobId}
  `;
  if (!result.ok) {
    log.warn("job_failed", { jobId, error: result.error });
  }
}

export async function listJobRuns(input?: {
  jobName?: string | null;
  limit?: number;
}) {
  const sql = getSql();
  const limit = Math.min(input?.limit ?? 50, 100);
  const jobName = input?.jobName ?? null;
  return sql`
    SELECT id, job_name, status, user_id, started_at, finished_at, error_message, metadata
    FROM annytrade.job_runs
    WHERE (${jobName}::text IS NULL OR job_name = ${jobName})
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;
}

export async function recordRateLimitEvent(scope: string, clientKey: string) {
  const sql = getSql();
  await sql`
    INSERT INTO annytrade.rate_limit_events (scope, client_key)
    VALUES (${scope}, ${clientKey.slice(0, 200)})
  `.catch(() => undefined);
}

export async function recordNotificationFailure(input: {
  userId?: string | null;
  channel?: string;
  reason: string;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO annytrade.notification_failures (user_id, channel, reason)
    VALUES (
      ${input.userId ?? null},
      ${input.channel ?? "email"},
      ${input.reason.slice(0, 500)}
    )
  `.catch(() => undefined);
}
