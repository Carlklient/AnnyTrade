import type { NextRequest } from "next/server";

import { ApiError, jsonError, jsonOk, securityHeaders } from "./errors";
import { assertSameOrigin } from "../security/csrf";
import {
  attachSessionCookie,
  clearSessionCookie,
  readSessionTokenFromRequest,
} from "../security/session-cookie";
import { clientKey, rateLimitAsync } from "../security/rate-limit";
import { incrMetric, observeLatencyMs } from "../observability/metrics";
import { captureException } from "../observability/error-tracking";
import { recordRateLimitEvent } from "../admin/jobs";

type HandlerResult = {
  body: unknown;
  status?: number;
  setSession?: string | null;
};

export async function handleApi(
  request: NextRequest,
  handler: () => Promise<HandlerResult>,
  options?: {
    csrf?: boolean;
    rateLimit?: { scope: string; limit: number; windowMs: number };
  },
) {
  const started = Date.now();
  const route = request.nextUrl.pathname;
  try {
    if (options?.csrf !== false) {
      assertSameOrigin(request);
    }
    if (options?.rateLimit) {
      const key = clientKey(request, options.rateLimit.scope);
      const limited = await rateLimitAsync({
        key,
        limit: options.rateLimit.limit,
        windowMs: options.rateLimit.windowMs,
      });
      if (!limited.ok) {
        incrMetric("annytrade.api.rate_limited", 1, {
          scope: options.rateLimit.scope,
        });
        void recordRateLimitEvent(options.rateLimit.scope, key);
        throw new ApiError(
          429,
          "RATE_LIMITED",
          "Too many requests. Try again later.",
        );
      }
    }

    const result = await handler();
    observeLatencyMs("annytrade.api.latency_ms", Date.now() - started, {
      route,
      status: String(result.status ?? 200),
    });
    incrMetric("annytrade.api.requests", 1, {
      route,
      status: String(result.status ?? 200),
    });

    let response = securityHeaders(
      jsonOk(result.body, { status: result.status ?? 200 }),
    );
    if (result.setSession === null) {
      response = clearSessionCookie(response);
    } else if (typeof result.setSession === "string") {
      response = attachSessionCookie(response, result.setSession);
    }
    return response;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    observeLatencyMs("annytrade.api.latency_ms", Date.now() - started, {
      route,
      status: String(status),
    });
    incrMetric("annytrade.api.errors", 1, {
      route,
      status: String(status),
    });
    if (status >= 500) {
      void captureException(error, { route });
    }
    return securityHeaders(jsonError(error));
  }
}

export function sessionToken(request: NextRequest) {
  return readSessionTokenFromRequest(request);
}
