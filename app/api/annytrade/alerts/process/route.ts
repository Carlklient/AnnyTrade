import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { evaluateAlertsForUser } from "@/features/annytrade/server/alerts/engine";
import {
  finishJobRun,
  startJobRun,
} from "@/features/annytrade/server/admin/jobs";
import { incrMetric } from "@/features/annytrade/server/observability/metrics";

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const jobId = await startJobRun({
        jobName: "alerts.process",
        userId: user.id,
      });
      try {
        const result = await evaluateAlertsForUser(user.id);
        await finishJobRun(jobId, {
          ok: true,
          metadata: {
            checked: result.checked,
            triggered: result.triggered,
            errors: result.errors?.length ?? 0,
          },
        });
        incrMetric("annytrade.jobs.alerts_process", 1);
        return { body: { ...result, paper: true, jobId } };
      } catch (err) {
        await finishJobRun(jobId, {
          ok: false,
          error: err instanceof Error ? err.message : "failed",
        });
        throw err;
      }
    },
    {
      rateLimit: { scope: "alerts-process", limit: 20, windowMs: 60_000 },
    },
  );
}
