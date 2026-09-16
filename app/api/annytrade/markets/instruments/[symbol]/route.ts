import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { marketDataService } from "@/features/annytrade/server/market/service";
import { mapMarketError } from "@/features/annytrade/server/market/http";

type Params = { params: Promise<{ symbol: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return handleApi(
    request,
    async () => {
      try {
        const { symbol } = await params;
        const instrument = await marketDataService.instrument(symbol);
        return { body: { instrument } };
      } catch (error) {
        throw mapMarketError(error);
      }
    },
    {
      csrf: false,
      rateLimit: { scope: "markets-instrument", limit: 60, windowMs: 60_000 },
    },
  );
}
