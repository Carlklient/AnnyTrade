import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { newsService } from "@/features/annytrade/server/news/service";
import { MarketDataError } from "@/features/annytrade/server/market/types";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const sp = request.nextUrl.searchParams;
      const symbol = sp.get("symbol") ?? undefined;
      const category = sp.get("category") ?? undefined;
      const fromRaw = sp.get("from");
      const toRaw = sp.get("to");
      const limit = Number(sp.get("limit") ?? 40);
      try {
        const articles = await newsService.list({
          symbol,
          category,
          from: fromRaw ? new Date(fromRaw) : undefined,
          to: toRaw ? new Date(toRaw) : undefined,
          limit: Number.isFinite(limit) ? limit : 40,
        });
        return {
          body: {
            articles,
            meta: newsService.meta(),
            disclosure:
              "Headlines link to original sources. AnnyTrade does not republish full copyrighted articles.",
          },
        };
      } catch (err) {
        if (err instanceof MarketDataError) {
          throw new ApiError(err.status, err.code, err.message);
        }
        throw err;
      }
    },
    {
      csrf: false,
      rateLimit: { scope: "news", limit: 40, windowMs: 60_000 },
    },
  );
}
