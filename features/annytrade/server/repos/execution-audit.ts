import { getSql } from "../db/client";
import type { ExecutionEnvironment } from "../execution/environments";

/** Append-only execution-sensitive audit (Phase 8). Never log secrets. */
export async function recordExecutionAudit(input: {
  userId?: string | null;
  eventType: string;
  environment: ExecutionEnvironment;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const sql = getSql();
  const meta = { ...(input.metadata ?? {}) };
  for (const k of Object.keys(meta)) {
    if (/secret|password|token|ciphertext|apiKey|api_key/i.test(k)) {
      delete meta[k];
    }
  }
  await sql`
    INSERT INTO annytrade.execution_audit (
      user_id, event_type, environment, metadata
    ) VALUES (
      ${input.userId ?? null},
      ${input.eventType},
      ${input.environment},
      ${sql.json(meta as never)}
    )
  `;
}
