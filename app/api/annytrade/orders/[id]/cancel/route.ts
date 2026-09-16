import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { cancelPaperOrder } from "@/features/annytrade/server/trading/engine";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  return handleApi(
    request,
    async () => {
      const { id } = await ctx.params;
      const { user } = await requireSessionUser(sessionToken(request));
      const order = await cancelPaperOrder({
        userId: user.id,
        orderId: id,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });
      return { body: { order, paper: true } };
    },
    {
      rateLimit: { scope: "orders-cancel", limit: 40, windowMs: 60_000 },
    },
  );
}
