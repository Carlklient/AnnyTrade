import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { ApiError } from "@/features/annytrade/server/http/errors";
import {
  assertFreshTimestamp,
  claimWebhookEventId,
  verifyHmacSha256Signature,
  WebhookSecurityError,
} from "@/features/annytrade/server/security/webhook";
import { getSql } from "@/features/annytrade/server/db/client";
import { recordAuditEvent } from "@/features/annytrade/server/repos/audit";
import { PHASE8_LIVE_SUBMISSION_HARD_BLOCK } from "@/features/annytrade/server/execution/live-guard";

/**
 * Provider webhook ingress scaffold.
 * Verifies HMAC + timestamp skew + replay. Does NOT place live orders.
 * Configure ANNYTRADE_WEBHOOK_HMAC_SECRET when a provider is wired.
 */
export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const secret = process.env.ANNYTRADE_WEBHOOK_HMAC_SECRET;
      const raw = await request.text();
      const signature =
        request.headers.get("x-annytrade-signature") ||
        request.headers.get("x-signature") ||
        request.headers.get("x-hub-signature-256");
      const timestamp =
        request.headers.get("x-annytrade-timestamp") ||
        request.headers.get("x-timestamp");
      const eventId =
        request.headers.get("x-annytrade-event-id") ||
        request.headers.get("x-event-id") ||
        request.headers.get("x-request-id");

      try {
        if (!secret) {
          throw new ApiError(
            503,
            "WEBHOOK_NOT_CONFIGURED",
            "Webhook HMAC secret not configured",
          );
        }
        verifyHmacSha256Signature({
          payload: raw,
          signatureHeader: signature,
          secret,
        });
        assertFreshTimestamp(timestamp, 300);
        if (!eventId) {
          throw new ApiError(
            400,
            "WEBHOOK_EVENT_ID_MISSING",
            "Missing event id",
          );
        }
        if (!claimWebhookEventId(eventId)) {
          throw new ApiError(409, "WEBHOOK_REPLAY", "Duplicate webhook event");
        }

        const sql = getSql();
        await sql`
          INSERT INTO annytrade.webhook_replay_guard (event_id, source, expires_at)
          VALUES (
            ${eventId},
            'provider',
            NOW() + INTERVAL '24 hours'
          )
          ON CONFLICT (event_id) DO NOTHING
        `.catch(() => undefined);

        await recordAuditEvent({
          eventType: "webhook.received",
          metadata: {
            eventId,
            liveHardBlock: PHASE8_LIVE_SUBMISSION_HARD_BLOCK,
            action: "accepted_for_processing",
            note: "No live order submission from webhooks in Phase 9",
          },
        });

        return {
          body: {
            ok: true,
            accepted: true,
            liveExecution: false,
            message: "Webhook accepted; live execution remains disabled",
          },
        };
      } catch (err) {
        if (err instanceof WebhookSecurityError) {
          throw new ApiError(401, err.code, err.message);
        }
        throw err;
      }
    },
    {
      csrf: false, // external providers are not browser same-origin
      rateLimit: { scope: "webhooks", limit: 120, windowMs: 60_000 },
    },
  );
}
