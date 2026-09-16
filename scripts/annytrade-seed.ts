import { closeSql } from "../features/annytrade/server/db/client";
import { runMigrations } from "../features/annytrade/server/db/migrate";
import { registerUser } from "../features/annytrade/server/services/auth";
import { findUserByNormalizedEmail } from "../features/annytrade/server/repos/users";

async function main() {
  await runMigrations();

  const email = "demo@annytrade.local";
  const existing = await findUserByNormalizedEmail(email);
  if (existing) {
    console.log("[annytrade] seed user already exists:", email);
    return;
  }

  await registerUser({
    email,
    password: "DemoPass1234",
    displayName: "AnnyTrade Demo",
  });
  console.log("[annytrade] seeded synthetic user:", email);
  console.log("[annytrade] password: DemoPass1234 (local/dev only)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await closeSql();
  });
