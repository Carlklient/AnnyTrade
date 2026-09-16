import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { marketDataService } from "@/features/annytrade/server/market/service";
import { mapMarketError } from "@/features/annytrade/server/market/http";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      try {
        const market = request.nextUrl.searchParams.get("market") ?? "US";
        const status = await marketDataService.status(market);
        return { body: { status } };
      } catch (error) {
        throw mapMarketError(error);
      }
    },
    {
      csrf: false,
      rateLimit: { scope: "markets-status", limit: 60, windowMs: 60_000 },
    },
  );
}
