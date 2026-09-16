/**
 * Production migrate — requires explicit ANNYTRADE_PRODUCTION_MIGRATE=1
 * and ANNYTRADE_DATABASE_URL (or ANNYTRADE_PRODUCTION_DATABASE_URL).
 * Never runs against staging URLs accidentally.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

loadEnvFile(".env.production.local");

if (process.env.ANNYTRADE_PRODUCTION_MIGRATE !== "1") {
  console.error(
    "Refusing production migrate. Set ANNYTRADE_PRODUCTION_MIGRATE=1 explicitly.",
  );
  process.exit(1);
}

const url =
  process.env.ANNYTRADE_PRODUCTION_DATABASE_URL ||
  process.env.ANNYTRADE_DATABASE_URL;
if (!url) {
  console.error(
    "ANNYTRADE_PRODUCTION_DATABASE_URL or ANNYTRADE_DATABASE_URL required",
  );
  process.exit(1);
}

if (/staging|localhost|127\.0\.0\.1|5433/i.test(url)) {
  console.error(
    "Refusing: URL looks like staging/local. Use a dedicated production database URL.",
  );
  process.exit(1);
}

process.env.ANNYTRADE_DATABASE_URL = url;

import { migrateAndClose } from "../features/annytrade/server/db/migrate";

migrateAndClose()
  .then(() => {
    console.log(
      JSON.stringify({ ok: true, target: "production", migrated: true }),
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
