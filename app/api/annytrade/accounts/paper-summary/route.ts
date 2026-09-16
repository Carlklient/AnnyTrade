import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { getPaperAccountSummary } from "@/features/annytrade/server/trading/engine";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const accountId =
        request.nextUrl.searchParams.get("accountId") ?? undefined;
      const summary = await getPaperAccountSummary(user.id, accountId);
      return { body: summary };
    },
    {
      csrf: false,
      rateLimit: { scope: "paper-summary", limit: 60, windowMs: 60_000 },
    },
  );
}
