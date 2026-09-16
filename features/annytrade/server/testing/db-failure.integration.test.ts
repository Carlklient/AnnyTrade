import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeSql, getDatabaseUrl, getSql } from "../db/client";
import { runMigrations } from "../db/migrate";
import { checkDatabaseHealth } from "../admin/dashboard";

const hasDb = Boolean(getDatabaseUrl());

describe.skipIf(!hasDb)("Phase 11 database recoverable failure", () => {
  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await closeSql();
  });

  it("reports healthy connectivity", async () => {
    const health = await checkDatabaseHealth();
    expect(health.ok).toBe(true);
    expect(health.latencyMs).not.toBeNull();
  });

  it("recovers after a failed statement in a separate client attempt", async () => {
    const sql = getSql();
    await expect(
      sql.unsafe("SELECT * FROM annytrade.not_a_real_table_xyz"),
    ).rejects.toBeTruthy();
    // Subsequent valid query must still work (pool recovery)
    const rows = await sql`SELECT 1::int AS ok`;
    expect(rows[0]?.ok).toBe(1);
  });
});
