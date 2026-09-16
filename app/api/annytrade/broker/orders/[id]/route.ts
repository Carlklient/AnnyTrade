import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { cancelBrokerSandboxOrder } from "@/features/annytrade/server/broker/service";
import { BrokerCredentialsRequiredError } from "@/features/annytrade/server/broker/factory";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: Ctx) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const { id } = await context.params;
      try {
        const order = await cancelBrokerSandboxOrder(user.id, id);
        return {
          body: { order, venue: "BROKER_SANDBOX", liveMoney: false },
        };
      } catch (err) {
        if (err instanceof BrokerCredentialsRequiredError) {
          throw new ApiError(503, err.code, err.message);
        }
        throw err;
      }
    },
    {
      rateLimit: { scope: "broker-orders-cancel", limit: 40, windowMs: 60_000 },
    },
  );
}
