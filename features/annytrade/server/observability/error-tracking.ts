/**
 * Optional error tracking — only activates when DSN is configured.
 * Does not invent credentials.
 */

import { log } from "./log";

export function errorTrackingConfigured(): boolean {
  return Boolean(process.env.ANNYTRADE_SENTRY_DSN || process.env.SENTRY_DSN);
}

export async function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  const dsn = process.env.ANNYTRADE_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) {
    log.error("exception", {
      message: error instanceof Error ? error.message : String(error),
      ...context,
    });
    return;
  }

  // Minimal Sentry envelope via store API — no SDK dependency required.
  // If DSN is malformed, fail soft and structured-log.
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    const ingest = `${url.protocol}//${url.host}/api/${projectId}/store/`;
    const payload = {
      message: error instanceof Error ? error.message : String(error),
      level: "error",
      platform: "node",
      tags: { service: "annytrade" },
      extra: context ?? {},
      timestamp: Date.now() / 1000,
    };
    await fetch(ingest, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=annytrade/1.0`,
      },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  } catch (err) {
    log.warn("error_tracking_failed", {
      reason: err instanceof Error ? err.message : "unknown",
    });
  }
}
