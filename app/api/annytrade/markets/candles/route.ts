import type { NextRequest } from "next/server";

import { handleApi } from "@/features/annytrade/server/http/handler";
import { ApiError } from "@/features/annytrade/server/http/errors";
import {
  marketDataService,
  SUPPORTED_INTERVALS,
} from "@/features/annytrade/server/market/service";
import { mapMarketError } from "@/features/annytrade/server/market/http";
import type { CandleInterval } from "@/features/annytrade/server/market/types";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      try {
        const sp = request.nextUrl.searchParams;
        const symbol = sp.get("symbol") ?? "";
        const interval = (sp.get("interval") ?? "1h") as CandleInterval;
        if (!symbol.trim()) {
          throw new ApiError(400, "VALIDATION", "symbol is required");
        }
        if (!SUPPORTED_INTERVALS.includes(interval)) {
          throw new ApiError(
            400,
            "VALIDATION",
            `Unsupported interval. Allowed: ${SUPPORTED_INTERVALS.join(", ")}`,
          );
        }
        const limitRaw = sp.get("limit");
        const limit = limitRaw ? Number(limitRaw) : 120;
        const fromRaw = sp.get("from");
        const toRaw = sp.get("to");
        const from = fromRaw ? new Date(fromRaw) : undefined;
        const to = toRaw ? new Date(toRaw) : undefined;
        if (from && Number.isNaN(from.getTime())) {
          throw new ApiError(400, "VALIDATION", "Invalid from timestamp");
        }
        if (to && Number.isNaN(to.getTime())) {
          throw new ApiError(400, "VALIDATION", "Invalid to timestamp");
        }
        if (
          from &&
          to &&
          to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000
        ) {
          throw new ApiError(
            400,
            "VALIDATION",
            "Range too large (max ~1 year)",
          );
        }

        const candles = await marketDataService.candles({
          symbol,
          interval,
          from,
          to,
          limit: Number.isFinite(limit) ? limit : 120,
        });
        return { body: { candles, interval, symbol: symbol.toUpperCase() } };
      } catch (error) {
        throw mapMarketError(error);
      }
    },
    {
      csrf: false,
      rateLimit: { scope: "markets-candles", limit: 40, windowMs: 60_000 },
    },
  );
}
