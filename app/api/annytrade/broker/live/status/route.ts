import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { getBrokerLiveStatus } from "@/features/annytrade/server/execution/live-execution";

/** BROKER_LIVE status — always reports disabled in Phase 8. */
export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      await requireSessionUser(sessionToken(request));
      return { body: getBrokerLiveStatus() };
    },
    {
      csrf: false,
      rateLimit: { scope: "broker-live-status", limit: 20, windowMs: 60_000 },
    },
  );
}
