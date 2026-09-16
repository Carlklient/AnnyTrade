import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { alertCreateSchema } from "@/features/annytrade/server/validation/schemas";
import { ApiError } from "@/features/annytrade/server/http/errors";
import {
  createPriceAlert,
  listPriceAlertsForUser,
  toPublicPriceAlert,
} from "@/features/annytrade/server/repos/alerts";
import { marketDataService } from "@/features/annytrade/server/market/service";
import { referenceLast } from "@/features/annytrade/server/trading/pricing";
import { evaluateAlertsForUser } from "@/features/annytrade/server/alerts/engine";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const rows = await listPriceAlertsForUser(user.id);
      return {
        body: {
          alerts: rows.map(toPublicPriceAlert),
          paper: true,
        },
      };
    },
    {
      csrf: false,
      rateLimit: { scope: "alerts-list", limit: 60, windowMs: 60_000 },
    },
  );
}

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const json = await request.json().catch(() => null);
      const parsed = alertCreateSchema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION",
          parsed.error.issues[0]?.message ?? "Invalid alert",
        );
      }
      const body = parsed.data;
      let baseline: number | null = null;
      if (body.condition === "PCT_MOVE") {
        try {
          const q = await marketDataService.quote(body.symbol);
          baseline = referenceLast(q);
        } catch {
          throw new ApiError(
            400,
            "VALIDATION",
            "Cannot set percent alert without a reliable mark price",
          );
        }
        if (baseline == null) {
          throw new ApiError(
            400,
            "VALIDATION",
            "Cannot set percent alert without a reliable mark price",
          );
        }
      }
      const existing = await listPriceAlertsForUser(user.id);
      if (existing.filter((a) => a.status === "ACTIVE").length >= 50) {
        throw new ApiError(400, "VALIDATION", "Maximum 50 active alerts");
      }
      const row = await createPriceAlert({
        userId: user.id,
        symbol: body.symbol,
        condition: body.condition,
        targetValue: body.targetValue,
        baselinePrice: baseline,
        cooldownSeconds: body.cooldownSeconds,
        notifyInApp: body.notifyInApp,
        notifyEmail: body.notifyEmail,
        note: body.note,
      });
      // Best-effort immediate evaluation
      void evaluateAlertsForUser(user.id);
      return {
        status: 201,
        body: { alert: toPublicPriceAlert(row), paper: true },
      };
    },
    {
      rateLimit: { scope: "alerts-create", limit: 30, windowMs: 60_000 },
    },
  );
}
