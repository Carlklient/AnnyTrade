/**
 * Phase 11 gate runner — unit/integration/security/load + live hard-block proof.
 * Exit 0 = validation complete for automated suite.
 * E2E/staging are separate optional steps.
 */
import { spawnSync } from "node:child_process";

function run(cmd: string, args: string[]) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

run("npx", [
  "vitest",
  "run",
  "features/annytrade/server/testing",
  "features/annytrade/server/execution/live-readiness.test.ts",
  "features/annytrade/server/security",
  "features/annytrade/server/broker/broker.test.ts",
  "features/annytrade/server/admin/admin.integration.test.ts",
]);

// Integration suites must execute when DB URL is configured (Phase 11).
run("npx", [
  "vitest",
  "run",
  "features/annytrade/server/testing/concurrency.integration.test.ts",
  "features/annytrade/server/testing/db-failure.integration.test.ts",
  "features/annytrade/server/admin/admin.integration.test.ts",
  "features/annytrade/server/security/idor.integration.test.ts",
]);

run("npx", [
  "vitest",
  "run",
  "features/annytrade/server/execution/live-readiness.test.ts",
  "-t",
  "hard block constant",
]);

run("npx", [
  "vitest",
  "run",
  "features/annytrade/server/admin/admin.integration.test.ts",
  "-t",
  "keeps live trading hard-blocked",
]);

console.log(
  JSON.stringify({
    ok: true,
    phase: 11,
    liveExecution: "DISABLED",
    next: [
      "npm test (full suite)",
      "npm run annytrade:test:e2e (with build+start or staging URL)",
      "npm run annytrade:migrate:staging + backup-restore",
    ],
  }),
);
