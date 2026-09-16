import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { processOpenOrdersForAccount } from "@/features/annytrade/server/trading/engine";
import { listAccountsForUser } from "@/features/annytrade/server/repos/accounts";
import { ApiError } from "@/features/annytrade/server/http/errors";
import {
  finishJobRun,
  startJobRun,
} from "@/features/annytrade/server/admin/jobs";
import { incrMetric } from "@/features/annytrade/server/observability/metrics";
import { emitCriticalAlert } from "@/features/annytrade/server/observability/alerts";

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const body = (await request.json().catch(() => ({}))) as {
        accountId?: string;
      };
      const accounts = await listAccountsForUser(user.id);
      const account =
        (body.accountId
          ? accounts.find((a) => a.id === body.accountId)
          : accounts[0]) ?? null;
      if (!account)
        throw new ApiError(404, "NOT_FOUND", "Paper account not found");

      const jobId = await startJobRun({
        jobName: "orders.process",
        userId: user.id,
        metadata: { accountId: account.id },
      });
      try {
        const result = await processOpenOrdersForAccount(user.id, account.id);
        await finishJobRun(jobId, {
          ok: true,
          metadata: { processed: result.processed, filled: result.filled },
        });
        incrMetric("annytrade.jobs.orders_process", 1);
        return { body: { ...result, paper: true, jobId } };
      } catch (err) {
        await finishJobRun(jobId, {
          ok: false,
          error: err instanceof Error ? err.message : "failed",
        });
        await emitCriticalAlert({
          alertType: "job_failed",
          message: "orders.process failed",
          userId: user.id,
        });
        throw err;
      }
    },
    {
      rateLimit: { scope: "orders-process", limit: 30, windowMs: 60_000 },
    },
  );
}
