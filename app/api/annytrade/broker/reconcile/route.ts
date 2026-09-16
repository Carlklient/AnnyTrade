import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { reconcileBrokerSandbox } from "@/features/annytrade/server/broker/service";
import { BrokerCredentialsRequiredError } from "@/features/annytrade/server/broker/factory";

export async function POST(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      try {
        const result = await reconcileBrokerSandbox(user.id);
        return {
          body: {
            ...result,
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
      rateLimit: { scope: "broker-reconcile", limit: 20, windowMs: 60_000 },
    },
  );
}
