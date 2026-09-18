import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { orderAmendSchema } from "@/features/annytrade/server/validation/schemas";
import {
  amendPaperOrder,
  getPaperOrderDetail,
} from "@/features/annytrade/server/trading/engine";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return handleApi(
    request,
    async () => {
      const { id } = await ctx.params;
      const { user } = await requireSessionUser(sessionToken(request));
      const detail = await getPaperOrderDetail(user.id, id);
      return { body: { ...detail, paper: true } };
    },
    { csrf: false },
  );
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return handleApi(
    request,
    async () => {
      const { id } = await ctx.params;
      const { user } = await requireSessionUser(sessionToken(request));
      const body = orderAmendSchema.parse(await request.json());
      const order = await amendPaperOrder({
        userId: user.id,
        orderId: id,
        limitPrice: body.limitPrice,
        stopPrice: body.stopPrice,
        quantity: body.quantity,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });
      return { body: { order, paper: true } };
    },
    {
      rateLimit: { scope: "orders-amend", limit: 40, windowMs: 60_000 },
    },
  );
}
