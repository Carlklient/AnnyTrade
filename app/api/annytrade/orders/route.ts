import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { orderCreateSchema } from "@/features/annytrade/server/validation/schemas";
import {
  listPaperOrders,
  submitPaperOrder,
} from "@/features/annytrade/server/trading/engine";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const openOnly =
        request.nextUrl.searchParams.get("open") === "1" ||
        request.nextUrl.searchParams.get("status") === "open";
      const accountId =
        request.nextUrl.searchParams.get("accountId") ?? undefined;
      const orders = await listPaperOrders(user.id, { accountId, openOnly });
      return { body: { orders, paper: true } };
    },
    {
      csrf: false,
      rateLimit: { scope: "orders-list", limit: 60, windowMs: 60_000 },
    },
  );
}

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const body = orderCreateSchema.parse(await request.json());
      const headerKey = request.headers.get("idempotency-key");
      const result = await submitPaperOrder({
        userId: user.id,
        accountId: body.accountId,
        symbol: body.symbol,
        side: body.side,
        orderType: body.orderType,
        quantity: body.quantity,
        limitPrice: body.limitPrice,
        stopPrice: body.stopPrice,
        idempotencyKey: body.idempotencyKey ?? headerKey,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });
      return {
        body: { order: result.order, replayed: result.replayed, paper: true },
        status: result.replayed ? 200 : 201,
      };
    },
    {
      rateLimit: { scope: "orders-create", limit: 30, windowMs: 60_000 },
    },
  );
}
