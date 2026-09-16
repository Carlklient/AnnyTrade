import { createHash } from "node:crypto";

import { getSql } from "../db/client";
import { redactMetadata } from "../security/redact";

/**
 * Append-only audit with optional integrity hash chain.
 * This is a technical control — not a legal/regulatory seal or WORM guarantee.
 */
export async function recordAuditEvent(input: {
  userId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const sql = getSql();
  const metadata = redactMetadata(input.metadata ?? {});
  const prev = await sql<{ integrity_hash: string | null }[]>`
    SELECT integrity_hash FROM annytrade.audit_events
    ORDER BY created_at DESC
    LIMIT 1
  `.catch(() => [] as { integrity_hash: string | null }[]);

  const prevHash = prev[0]?.integrity_hash ?? "genesis";
  const integrityHash = createHash("sha256")
    .update(
      JSON.stringify({
        prevHash,
        eventType: input.eventType,
        userId: input.userId ?? null,
        metadata,
      }),
    )
    .digest("hex");

  await sql`
    INSERT INTO annytrade.audit_events (
      user_id, event_type, metadata, ip_address, user_agent, integrity_hash
    ) VALUES (
      ${input.userId ?? null},
      ${input.eventType},
      ${sql.json(metadata as never)},
      ${input.ipAddress ?? null},
      ${input.userAgent ?? null},
      ${integrityHash}
    )
  `;
}

export const AUDIT_RETENTION_STRATEGY = {
  technicalDefaultDays: 365,
  note: "Retention periods for financial/audit records require legal determination per jurisdiction. Software default is advisory only.",
  integrity:
    "Hash-chained integrity_hash on append; checkpoints table available. Not a certified WORM store.",
  deletion:
    "Do not purge audit rows without legal review — account closure does not auto-erase audits.",
} as const;
