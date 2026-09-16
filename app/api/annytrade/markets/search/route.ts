import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { marketDataService } from "@/features/annytrade/server/market/service";
import { mapMarketError } from "@/features/annytrade/server/market/http";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      try {
        const q = request.nextUrl.searchParams.get("q") ?? "";
        const limitRaw = request.nextUrl.searchParams.get("limit");
        const limit = limitRaw ? Number(limitRaw) : 12;
        if (q.trim().length > 0 && q.trim().length < 1) {
          return { body: { instruments: [] } };
        }
        const instruments = await marketDataService.search({
          query: q,
          limit: Number.isFinite(limit) ? limit : 12,
        });
        return { body: { instruments } };
      } catch (error) {
        throw mapMarketError(error);
      }
    },
    {
      csrf: false,
      rateLimit: { scope: "markets-search", limit: 40, windowMs: 60_000 },
    },
  );
}
