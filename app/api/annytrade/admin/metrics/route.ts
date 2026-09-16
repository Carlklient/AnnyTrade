import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireAdmin } from "@/features/annytrade/server/admin/auth";
import { getMetricsSnapshot } from "@/features/annytrade/server/observability/metrics";
import { listJobRuns } from "@/features/annytrade/server/admin/jobs";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      await requireAdmin(sessionToken(request), { minRole: "READONLY" });
      const jobs = await listJobRuns({
        jobName: request.nextUrl.searchParams.get("job"),
        limit: 50,
      });
      return {
        body: {
          metrics: getMetricsSnapshot(),
          jobs,
          liveTradingDisabled: true,
        },
      };
    },
    {
      csrf: false,
      rateLimit: { scope: "admin-metrics", limit: 30, windowMs: 60_000 },
    },
  );
}
