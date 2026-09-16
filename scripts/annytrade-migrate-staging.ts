/**
 * Staging migrate — uses ANNYTRADE_DATABASE_URL from .env.staging if present,
 * otherwise requires explicit STAGING URL. Never silently uses production.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadStagingEnv() {
  const path = resolve(process.cwd(), ".env.staging");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadStagingEnv();

const url =
  process.env.ANNYTRADE_STAGING_DATABASE_URL ||
  process.env.ANNYTRADE_DATABASE_URL;
if (!url) {
  console.error(
    "Set ANNYTRADE_STAGING_DATABASE_URL or provide .env.staging with ANNYTRADE_DATABASE_URL",
  );
  process.exit(1);
}
if (
  /prod|production/i.test(url) &&
  !process.env.ANNYTRADE_STAGING_ALLOW_PROD_LIKE_NAME
) {
  console.error(
    "Refusing staging migrate: URL looks production-like. Set ANNYTRADE_STAGING_ALLOW_PROD_LIKE_NAME=1 to override.",
  );
  process.exit(1);
}

process.env.ANNYTRADE_DATABASE_URL = url;

import { migrateAndClose } from "../features/annytrade/server/db/migrate";

migrateAndClose()
  .then(() => {
    console.log(
      JSON.stringify({ ok: true, target: "staging", migrated: true }),
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
