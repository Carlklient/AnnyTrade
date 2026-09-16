import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { requireSessionUser } from "@/features/annytrade/server/services/auth";
import { computePaperPortfolio } from "@/features/annytrade/server/portfolio/service";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const { user } = await requireSessionUser(sessionToken(request));
      const sp = request.nextUrl.searchParams;
      const accountId = sp.get("accountId") ?? undefined;
      const from = sp.get("from") ?? undefined;
      const to = sp.get("to") ?? undefined;
      const analytics = await computePaperPortfolio(user.id, {
        accountId,
        from,
        to,
        recordSnapshot: true,
      });
      return { body: analytics };
    },
    {
      csrf: false,
      rateLimit: { scope: "portfolio-analytics", limit: 40, windowMs: 60_000 },
    },
  );
}
