import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { marketDataService } from "@/features/annytrade/server/market/service";
import { mapMarketError } from "@/features/annytrade/server/market/http";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      try {
        const symbolsParam = request.nextUrl.searchParams.get("symbols") ?? "";
        const symbols = symbolsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (symbols.length === 0) {
          throw new ApiError(400, "VALIDATION", "symbols query required");
        }
        if (symbols.length > 25) {
          throw new ApiError(400, "VALIDATION", "Too many symbols (max 25)");
        }
        const quotes = await marketDataService.quotes(symbols);
        return { body: { quotes } };
      } catch (error) {
        throw mapMarketError(error);
      }
    },
    {
      csrf: false,
      rateLimit: { scope: "markets-quotes", limit: 60, windowMs: 60_000 },
    },
  );
}
