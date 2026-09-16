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
        const quote = await marketDataService.quote(symbol);
        return { body: { quote } };
      } catch (error) {
        throw mapMarketError(error);
      }
    },
    {
      csrf: false,
      rateLimit: { scope: "markets-quote", limit: 90, windowMs: 60_000 },
    },
  );
}
