import type { NextRequest } from "next/server";

import { env } from "@/lib/env";

/**
 * Cookie-session APIs: require same-origin for state-changing requests.
 * SameSite=Lax mitigates classic CSRF; Origin check is defense in depth.
 * Production: Origin (or matching Host) is required for mutating methods.
 *
 * Allowed origins: NEXT_PUBLIC_APP_URL host, plus optional ANNYTRADE_CSRF_EXTRA_ORIGINS
 * (comma-separated) for local E2E (localhost vs 127.0.0.1).
 */
export function assertSameOrigin(request: NextRequest): void {
  if (request.method === "GET" || request.method === "HEAD") return;

  const origin = request.headers.get("origin");
  const requestHost = request.headers.get("host");
  const isProd = process.env.NODE_ENV === "production";

  if (!origin) {
    if (isProd) {
      throw new CsrfError();
    }
    if (!requestHost) throw new CsrfError();
    return;
  }

  let incoming: URL;
  try {
    incoming = new URL(origin);
  } catch {
    throw new CsrfError();
  }

  const allowedHosts = new Set<string>();
  try {
    allowedHosts.add(new URL(env.app.url).host);
  } catch {
    throw new CsrfError();
  }
  // Always accept the request Host (same-origin API calls behind reverse proxies / E2E).
  if (requestHost) allowedHosts.add(requestHost);
  const extras = process.env.ANNYTRADE_CSRF_EXTRA_ORIGINS ?? "";
  for (const part of extras.split(",")) {
    const t = part.trim();
    if (!t) continue;
    try {
      allowedHosts.add(new URL(t).host);
    } catch {
      /* ignore malformed */
    }
  }
  // Local loopback equivalence for E2E (localhost ↔ 127.0.0.1)
  if (allowedHosts.has("localhost:3000")) allowedHosts.add("127.0.0.1:3000");
  if (allowedHosts.has("127.0.0.1:3000")) allowedHosts.add("localhost:3000");

  if (!allowedHosts.has(incoming.host)) {
    if (!isProd && requestHost && incoming.host === requestHost) return;
    throw new CsrfError();
  }
}

export class CsrfError extends Error {
  constructor() {
    super("Invalid request origin");
    this.name = "CsrfError";
  }
}
