/**
 * Shared test helpers — probe DB reachability (URL alone is not enough).
 */
import { getDatabaseUrl, getSql, closeSql } from "../db/client";

let probed: boolean | null = null;

/** True only when ANNYTRADE_DATABASE_URL is set AND Postgres accepts a connection. */
export async function isDatabaseReachable(): Promise<boolean> {
  if (probed != null) return probed;
  if (!getDatabaseUrl()) {
    probed = false;
    return false;
  }
  try {
    const sql = getSql();
    await sql`SELECT 1 AS ok`;
    probed = true;
    return true;
  } catch {
    await closeSql().catch(() => undefined);
    probed = false;
    return false;
  }
}

export function resetDatabaseReachabilityProbe() {
  probed = null;
}

/** Sync check used by describe.skipIf — prefers prior async probe; else URL presence. */
export function hasDatabaseUrlConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}
