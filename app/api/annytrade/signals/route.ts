import type { NextRequest } from "next/server";

import {
  handleApi,
  sessionToken,
} from "@/features/annytrade/server/http/handler";
import { ApiError } from "@/features/annytrade/server/http/errors";
import { getSessionUser } from "@/features/annytrade/server/services/auth";
import { SUPPORTED_INTERVALS } from "@/features/annytrade/server/market/service";
import type { CandleInterval } from "@/features/annytrade/server/market/types";
import {
  generateSignalsForSymbols,
  resolveScanSymbols,
} from "@/features/annytrade/server/analysis/service";

export async function GET(request: NextRequest) {
  return handleApi(
    request,
    async () => {
      const token = sessionToken(request);
      const session = token ? await getSessionUser(token) : null;
      const userId = session?.user?.id ?? null;
      const sp = request.nextUrl.searchParams;
      const interval = (sp.get("interval") ?? "1h") as CandleInterval;
      if (!SUPPORTED_INTERVALS.includes(interval)) {
        throw new ApiError(
          400,
          "VALIDATION",
          `Unsupported interval ${interval}`,
        );
      }
      const symbolsParam = sp.get("symbols");
      const requested = symbolsParam
        ? symbolsParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
      const symbols = await resolveScanSymbols(userId, requested);
      const result = await generateSignalsForSymbols({ symbols, interval });
      return {
        body: {
          ...result,
          disclosure:
            "Educational market analysis only, not financial advice. Labels are Bullish / Bearish / Neutral / Watch. Confidence is an indicator alignment score, not a success probability. No guaranteed buys or profits.",
          paper: true,
        },
      };
    },
    {
      csrf: false,
      rateLimit: { scope: "signals-list", limit: 30, windowMs: 60_000 },
    },
  );
}
