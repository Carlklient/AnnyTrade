import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { setAccountTradingEnabled } from "@/features/annytrade/server/repos/trading-controls";
import { getSql } from "@/features/annytrade/server/db/client";
import { z } from "zod";

const schema = z.object({
  enabled: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const { id: accountId } = await ctx.params;
      const json = await request.json().catch(() => null);
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(400, "VALIDATION", "enabled boolean required");
      }

      const sql = getSql();
      const rows = await sql<{ id: string }[]>`
        SELECT id FROM annytrade.trading_accounts
        WHERE id = ${accountId} AND user_id = ${user.id}
        LIMIT 1
      `;
      if (!rows[0]) {
        throw new ApiError(404, "NOT_FOUND", "Account not found");
      }

      const control = await setAccountTradingEnabled({
        accountId,
        userId: user.id,
        enabled: parsed.data.enabled,
        reason: parsed.data.reason,
      });

      return {
        body: {
          accountId: control.account_id,
          tradingEnabled: control.trading_enabled,
          disabledReason: control.disabled_reason,
          updatedAt: control.updated_at.toISOString(),
        },
      };
    },
    {
      rateLimit: { scope: "trading-controls", limit: 10, windowMs: 60_000 },
    },
  );
}
