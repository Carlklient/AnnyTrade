import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { closeSql, getSql } from "./client";

export async function runMigrations(migrationsDir?: string) {
  const sql = getSql();
  await sql`CREATE SCHEMA IF NOT EXISTS annytrade`;
  await sql`
    CREATE TABLE IF NOT EXISTS annytrade.schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const dir =
    migrationsDir ??
    path.join(process.cwd(), "features/annytrade/server/db/migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const id = file.replace(/\.sql$/, "");
    const existing = await sql<
      { id: string }[]
    >`SELECT id FROM annytrade.schema_migrations WHERE id = ${id}`;
    if (existing.length > 0) continue;

    const full = path.join(dir, file);
    const body = await readFile(full, "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`
        INSERT INTO annytrade.schema_migrations (id) VALUES (${id})
      `;
    });
    console.log(`[annytrade] applied migration ${id}`);
  }
}

export async function migrateAndClose() {
  try {
    await runMigrations();
  } finally {
    await closeSql();
  }
}
