import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { getExecutionReadinessStatus } from "@/features/annytrade/server/execution/readiness";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      await requireSessionUser(sessionToken(request));
      return { body: getExecutionReadinessStatus() };
    },
    {
      csrf: false,
      rateLimit: { scope: "execution-readiness", limit: 30, windowMs: 60_000 },
    },
  );
}
