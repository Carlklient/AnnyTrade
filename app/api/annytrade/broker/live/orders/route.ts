import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { submitBrokerLiveOrder } from "@/features/annytrade/server/execution/live-execution";
import { z } from "zod";

const orderSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((s) => s.toUpperCase()),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]),
  quantity: z.number().finite().positive().max(1_000_000),
  limitPrice: z.number().finite().positive().nullable().optional(),
  stopPrice: z.number().finite().positive().nullable().optional(),
  timeInForce: z.enum(["day", "gtc", "ioc"]).optional(),
  clientOrderId: z.string().trim().min(8).max(128).optional(),
});

/**
 * Production live-order endpoint — MUST refuse while live is disabled.
 * Stronger rate limits than sandbox. Never submits real-money orders in Phase 8.
 */
export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const json = await request.json().catch(() => null);
      const parsed = orderSchema.safeParse(json);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION",
          parsed.error.issues[0]?.message ?? "Invalid order",
        );
      }
      const clientOrderId =
        parsed.data.clientOrderId ?? `live-blocked-${crypto.randomUUID()}`;
      await submitBrokerLiveOrder(user.id, {
        ...parsed.data,
        clientOrderId,
      });
      // Unreachable — submitBrokerLiveOrder never resolves
      return { body: { ok: false } };
    },
    {
      rateLimit: { scope: "broker-live-orders", limit: 5, windowMs: 60_000 },
    },
  );
}

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      await requireSessionUser(sessionToken(request));
      return {
        body: {
          orders: [],
          venue: "BROKER_LIVE",
          liveMoney: true,
          enabled: false,
          message:
            "BROKER_LIVE order list unavailable — live execution disabled",
        },
      };
    },
    {
      csrf: false,
      rateLimit: {
        scope: "broker-live-orders-list",
        limit: 10,
        windowMs: 60_000,
      },
    },
  );
}
