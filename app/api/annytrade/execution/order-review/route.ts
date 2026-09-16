import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { createOrderReview } from "@/features/annytrade/server/execution/order-review-service";
import { newIdempotencyKey } from "@/features/annytrade/server/execution/duplicate-order";
import { marketDataService } from "@/features/annytrade/server/market/service";
import { z } from "zod";

const schema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((s) => s.toUpperCase()),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().finite().positive(),
  orderType: z.enum(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]),
  limitPrice: z.number().finite().positive().nullable().optional(),
  stopPrice: z.number().finite().positive().nullable().optional(),
  accountId: z.string().uuid(),
  accountLabel: z.string().min(1).max(128),
  environment: z.enum(["INTERNAL_PAPER", "BROKER_SANDBOX", "BROKER_LIVE"]),
  clientOrderId: z.string().trim().min(8).max(128).optional(),
});

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const json = await request.json().catch(() => null);
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION",
          parsed.error.issues[0]?.message ?? "Invalid",
        );
      }
      const d = parsed.data;
      let marketState = "unknown";
      let quoteTimestamp: string | null = null;
      let estimatedValue: number | null = null;
      try {
        const status = await marketDataService.status("US");
        marketState = status.status;
        const quote = await marketDataService.quote(d.symbol);
        quoteTimestamp = quote.timestamp;
        const px =
          d.limitPrice ??
          (quote.last != null ? Number(quote.last) : null) ??
          (quote.bid != null ? Number(quote.bid) : null);
        if (px != null && Number.isFinite(px)) {
          estimatedValue = px * d.quantity;
        }
      } catch {
        marketState = "unavailable";
      }

      const review = await createOrderReview(user.id, {
        symbol: d.symbol,
        side: d.side,
        quantity: d.quantity,
        orderType: d.orderType,
        limitPrice: d.limitPrice ?? null,
        stopPrice: d.stopPrice ?? null,
        estimatedValue,
        marketState,
        accountId: d.accountId,
        accountLabel: d.accountLabel,
        environment: d.environment,
        quoteTimestamp,
        clientOrderId: d.clientOrderId ?? newIdempotencyKey("review"),
      });

      return {
        status: 201,
        body: {
          review,
          liveMoney: review.liveMoney,
          frontendAuthoritative: false,
        },
      };
    },
    {
      rateLimit: { scope: "order-review", limit: 20, windowMs: 60_000 },
    },
  );
}
