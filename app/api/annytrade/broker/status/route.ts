import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { getBrokerStatus } from "@/features/annytrade/server/broker/service";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const status = await getBrokerStatus(user.id);
      return { body: { ...status, paperEnginePreserved: true } };
    },
    {
      csrf: false,
      rateLimit: { scope: "broker-status", limit: 60, windowMs: 60_000 },
    },
  );
}
