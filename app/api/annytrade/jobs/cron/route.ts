import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { assertCronJobAuthorized } from "@/features/annytrade/server/security/cron-auth";
import { getSql } from "@/features/annytrade/server/db/client";
import { processOpenOrdersForAccount } from "@/features/annytrade/server/trading/engine";
import { evaluateAlertsForUser } from "@/features/annytrade/server/alerts/engine";
import {
  finishJobRun,
  startJobRun,
} from "@/features/annytrade/server/admin/jobs";
import { incrMetric } from "@/features/annytrade/server/observability/metrics";
import { emitCriticalAlert } from "@/features/annytrade/server/observability/alerts";
import { PHASE8_LIVE_SUBMISSION_HARD_BLOCK } from "@/features/annytrade/server/execution/live-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Global background tick for paper order evaluation + alert evaluation.
 * Invoked by Vercel Cron (or external scheduler) with ANNYTRADE_CRON_SECRET.
 * Does NOT submit live-money broker orders.
 */
export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      assertCronJobAuthorized(request);

      const jobId = await startJobRun({
        jobName: "cron.tick",
        userId: null,
        metadata: { liveHardBlock: PHASE8_LIVE_SUBMISSION_HARD_BLOCK },
      });

      try {
        const sql = getSql();
        const accounts = await sql<{ id: string; user_id: string }[]>`
          SELECT a.id, a.user_id
          FROM annytrade.trading_accounts a
          LEFT JOIN annytrade.trading_controls c ON c.account_id = a.id
          WHERE a.status = 'ACTIVE'
            AND COALESCE(c.trading_enabled, true) = true
          ORDER BY a.updated_at DESC
          LIMIT 200
        `;

        let ordersProcessed = 0;
        let ordersFilled = 0;
        let alertsChecked = 0;
        let alertsTriggered = 0;
        const errors: string[] = [];

        for (const account of accounts) {
          try {
            const result = await processOpenOrdersForAccount(
              account.user_id,
              account.id,
            );
            ordersProcessed += result.processed;
            ordersFilled += result.filled;
          } catch (err) {
            errors.push(
              `orders:${account.id}:${err instanceof Error ? err.message : "err"}`,
            );
          }
        }

        const users = await sql<{ user_id: string }[]>`
          SELECT DISTINCT user_id
          FROM annytrade.price_alerts
          WHERE status = 'ACTIVE'
          LIMIT 200
        `;

        for (const row of users) {
          try {
            const result = await evaluateAlertsForUser(row.user_id);
            alertsChecked += result.checked;
            alertsTriggered += result.triggered;
          } catch (err) {
            errors.push(
              `alerts:${row.user_id}:${err instanceof Error ? err.message : "err"}`,
            );
          }
        }

        await finishJobRun(jobId, {
          ok: errors.length === 0,
          metadata: {
            accounts: accounts.length,
            ordersProcessed,
            ordersFilled,
            alertUsers: users.length,
            alertsChecked,
            alertsTriggered,
            errors: errors.slice(0, 20),
          },
          ...(errors.length ? { error: errors.slice(0, 5).join("; ") } : {}),
        });

        incrMetric("annytrade.jobs.cron_tick", 1);
        if (errors.length) {
          await emitCriticalAlert({
            alertType: "job_failed",
            message: `cron.tick partial failures (${errors.length})`,
          });
        }

        return {
          body: {
            paper: true,
            liveHardBlock: PHASE8_LIVE_SUBMISSION_HARD_BLOCK,
            accounts: accounts.length,
            ordersProcessed,
            ordersFilled,
            alertUsers: users.length,
            alertsChecked,
            alertsTriggered,
            errorCount: errors.length,
            jobId,
          },
        };
      } catch (err) {
        await finishJobRun(jobId, {
          ok: false,
          error: err instanceof Error ? err.message : "failed",
        });
        await emitCriticalAlert({
          alertType: "job_failed",
          message: "cron.tick failed",
        });
        throw err;
      }
    },
    {
      csrf: false,
      rateLimit: { scope: "cron-tick", limit: 30, windowMs: 60_000 },
    },
  );
}

export async function POST(request: NextRequest) {
  return GET(request);
}
