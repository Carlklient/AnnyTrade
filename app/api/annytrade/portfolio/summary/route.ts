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
      const accountId =
        request.nextUrl.searchParams.get("accountId") ?? undefined;
      const analytics = await computePaperPortfolio(user.id, {
        accountId,
        recordSnapshot: true,
      });
      return {
        body: {
          paper: true as const,
          accountId: analytics.accountId,
          currency: analytics.currency,
          cashBalance: analytics.cash,
          reserved: analytics.reserved,
          availableCash: analytics.availableCash,
          costBasis: analytics.costBasis,
          marketValue: analytics.marketValue,
          unrealizedPnl: analytics.unrealizedPnl,
          realizedPnl: analytics.realizedPnl,
          totalPnl: analytics.totalPnl,
          feesPaid: analytics.feesPaid,
          equity: analytics.equity,
          dailyPnl: analytics.dailyPnl,
          marksComplete: analytics.marksComplete,
          unmarkedSymbols: analytics.unmarkedSymbols,
          positions: analytics.positions,
        },
      };
    },
    {
      csrf: false,
      rateLimit: { scope: "portfolio-summary", limit: 60, windowMs: 60_000 },
    },
  );
}
