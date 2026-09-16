/**
 * Production backup proof (schema_migrations round-trip) or pg_dump when available.
 * Requires ANNYTRADE_PRODUCTION_DATABASE_URL or ANNYTRADE_DATABASE_URL + ANNYTRADE_PRODUCTION_BACKUP=1.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function loadEnvFile(name: string) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function main() {
  loadEnvFile(".env.production.local");

  if (process.env.ANNYTRADE_PRODUCTION_BACKUP !== "1") {
    console.error(
      "Set ANNYTRADE_PRODUCTION_BACKUP=1 to run production backup drill",
    );
    process.exit(1);
  }

  const url =
    process.env.ANNYTRADE_PRODUCTION_DATABASE_URL ||
    process.env.ANNYTRADE_DATABASE_URL;
  if (!url) {
    console.error("Production database URL required");
    process.exit(1);
  }

  async function sqlProof() {
    process.env.ANNYTRADE_DATABASE_URL = url;
    const { getSql, closeSql } =
      await import("../features/annytrade/server/db/client");
    const sql = getSql();
    const rows = await sql`
      SELECT id, applied_at FROM annytrade.schema_migrations ORDER BY applied_at
    `;
    const dir = mkdtempSync(join(tmpdir(), "annytrade-prod-bak-"));
    const file = join(dir, "migrations.json");
    writeFileSync(file, JSON.stringify(rows, null, 2));
    const restored = JSON.parse(readFileSync(file, "utf8")) as unknown[];
    await closeSql();
    if (!Array.isArray(restored) || restored.length < 1) {
      throw new Error("Backup proof failed");
    }
    console.log(
      JSON.stringify({
        ok: true,
        mode: "sql-proof",
        migrations: restored.length,
        backupFile: file,
        note: "Prefer provider PITR / pg_dump for full restore drills",
      }),
    );
  }

  try {
    const dir = mkdtempSync(join(tmpdir(), "annytrade-prod-pgdump-"));
    const dump = join(dir, "production.dump.sql");
    execFileSync("pg_dump", [url, "-f", dump, "--schema=annytrade"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log(
      JSON.stringify({
        ok: true,
        mode: "pg_dump",
        dump,
        restoreHint:
          "psql $ANNYTRADE_PRODUCTION_DATABASE_URL -f dump (scratch DB only)",
      }),
    );
  } catch {
    await sqlProof();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
