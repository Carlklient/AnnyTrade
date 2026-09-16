import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { ApiError } from "@/features/annytrade/server/http/errors";
import {
  getBrokerAccountSnapshot,
  listBrokerSandboxOrders,
} from "@/features/annytrade/server/broker/service";
import { BrokerCredentialsRequiredError } from "@/features/annytrade/server/broker/factory";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      try {
        const snap = await getBrokerAccountSnapshot(user.id);
        const orders = await listBrokerSandboxOrders(user.id);
        return {
          body: {
            ...snap,
            orders,
            distinction: {
              annytradePaper: "Internal AnnyTrade PAPER ledger/engine",
              brokerSandbox:
                "Official broker paper/sandbox — separate balances",
            },
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
      csrf: false,
      rateLimit: { scope: "broker-account", limit: 40, windowMs: 60_000 },
    },
  );
}
