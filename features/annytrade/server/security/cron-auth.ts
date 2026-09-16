import { timingSafeEqual } from "node:crypto";

import { ApiError } from "../http/errors";

/**
 * Shared secret for Vercel Cron / external schedulers hitting process jobs.
 * Never expose this value to the browser.
 */
export function assertCronJobAuthorized(request: Request): void {
  const expected =
    process.env.ANNYTRADE_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  if (!expected || expected.length < 16) {
    throw new ApiError(
      503,
      "CRON_NOT_CONFIGURED",
      "Background job secret is not configured",
    );
  }

  const header =
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() ||
    request.headers.get("x-annytrade-cron-secret")?.trim() ||
    "";

  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid job credentials");
  }
}

export function cronJobsEnabled(): boolean {
  const secret =
    process.env.ANNYTRADE_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  return Boolean(secret && secret.length >= 16);
}
