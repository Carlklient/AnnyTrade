import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { marketDataService } from "@/features/annytrade/server/market/service";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const meta = marketDataService.meta();
      const credentials = marketDataService.credentialStatus();
      return { body: { meta, credentials } };
    },
    {
      csrf: false,
      rateLimit: { scope: "markets-meta", limit: 30, windowMs: 60_000 },
    },
  );
}
