import type { NextRequest } from "next/server";

import {
  ApiError,
  jsonError,
  jsonOk,
  securityHeaders,
} from "@/features/annytrade/server/http/errors";
import { assertSameOrigin } from "@/features/annytrade/server/security/csrf";
import {
  clientKey,
  rateLimitAsync,
} from "@/features/annytrade/server/security/rate-limit";
import { MarketDataError } from "@/features/annytrade/server/market/types";

export function mapMarketError(error: unknown) {
  if (error instanceof ApiError) return error;
  if (error instanceof MarketDataError) {
    return new ApiError(error.status, error.code, error.message);
  }
  return error;
}

export async function handleMarketGet(
  request: NextRequest,
  run: () => Promise<unknown>,
  options?: { expensive?: boolean },
) {
  try {
    if (options?.expensive) {
      const limited = await rateLimitAsync({
        key: clientKey(request, "markets"),
        limit: 60,
        windowMs: 60_000,
      });
      if (!limited.ok) {
        throw new ApiError(
          429,
          "RATE_LIMITED",
          "Too many market-data requests",
        );
      }
    }
    const data = await run();
    return securityHeaders(jsonOk(data));
  } catch (error) {
    return securityHeaders(jsonError(mapMarketError(error)));
  }
}

export function guardMarketMutation(request: NextRequest) {
  assertSameOrigin(request);
}
