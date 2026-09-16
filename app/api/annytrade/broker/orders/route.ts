import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { ApiError } from "@/features/annytrade/server/http/errors";
import {
  listBrokerSandboxOrders,
  submitBrokerSandboxOrder,
} from "@/features/annytrade/server/broker/service";
import { BrokerCredentialsRequiredError } from "@/features/annytrade/server/broker/factory";
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

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const orders = await listBrokerSandboxOrders(user.id);
      return {
        body: {
          orders,
          venue: "BROKER_SANDBOX",
          liveMoney: false,
        },
      };
    },
    {
      csrf: false,
      rateLimit: { scope: "broker-orders-list", limit: 60, windowMs: 60_000 },
    },
  );
}

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
      try {
        const result = await submitBrokerSandboxOrder(user.id, parsed.data);
        return {
          status: 201,
          body: {
            order: result.order,
            replayed: result.replayed,
            venue: "BROKER_SANDBOX",
            liveMoney: false,
          },
        };
      } catch (err) {
        if (err instanceof BrokerCredentialsRequiredError) {
          throw new ApiError(503, err.code, err.message);
        }
        throw err;
      }
    },
    {
      rateLimit: { scope: "broker-orders-create", limit: 15, windowMs: 60_000 },
    },
  );
}
