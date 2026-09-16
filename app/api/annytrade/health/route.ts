import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { checkDatabaseHealth } from "@/features/annytrade/server/admin/dashboard";
import { getDatabaseUrl } from "@/features/annytrade/server/db/client";
import {
  emergencyKillSwitchActive,
  getLiveFlagSnapshot,
  PHASE8_LIVE_SUBMISSION_HARD_BLOCK,
} from "@/features/annytrade/server/execution/live-guard";
import { securityHeaders } from "@/features/annytrade/server/http/errors";
import { rateLimitBackendStatus } from "@/features/annytrade/server/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Unauthenticated liveness/readiness probe for load balancers and uptime monitors.
 * Does not expose secrets, credentials, or privileged admin metrics.
 */
export async function GET(_request: NextRequest) {
  const started = Date.now();
  const dbConfigured = Boolean(getDatabaseUrl());
  const db = dbConfigured
    ? await checkDatabaseHealth()
    : { ok: false, latencyMs: null as number | null, error: "not_configured" };

  const live = getLiveFlagSnapshot();
  const ready = db.ok;

  const body = {
    ok: ready,
    service: "annytrade",
    asOf: new Date().toISOString(),
    latencyMs: Date.now() - started,
    checks: {
      database: {
        configured: dbConfigured,
        ok: db.ok,
        latencyMs: db.latencyMs,
      },
      liveTrading: {
        hardBlock: PHASE8_LIVE_SUBMISSION_HARD_BLOCK,
        submissionAllowed: live.liveSubmissionAllowed,
        emergencyKill: emergencyKillSwitchActive(),
      },
      rateLimit: rateLimitBackendStatus(),
    },
  };

  return securityHeaders(
    NextResponse.json(body, {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }),
  );
}
