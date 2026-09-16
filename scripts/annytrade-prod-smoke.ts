/**
 * Phase 12 production smoke — safe, non-destructive checks only.
 * Never submits broker live orders.
 */
const base = (
  process.env.ANNYTRADE_SMOKE_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  ""
).replace(/\/$/, "");

if (!base) {
  console.error("Set ANNYTRADE_SMOKE_BASE_URL (e.g. https://omotundeaanu.com)");
  process.exit(1);
}

async function get(path: string) {
  const res = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json" },
    redirect: "follow",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html ok for pages */
  }
  return { status: res.status, json, text: text.slice(0, 200) };
}

async function main() {
  const health = await get("/api/annytrade/health");
  const markets = await get("/api/annytrade/markets/status");
  const landing = await get("/annytrade");
  const readiness = await get("/api/annytrade/execution/readiness");

  const healthBody = health.json as {
    ok?: boolean;
    checks?: {
      liveTrading?: { hardBlock?: boolean; submissionAllowed?: boolean };
    };
  } | null;

  const failures: string[] = [];
  if (health.status !== 200 || !healthBody?.ok) {
    failures.push(`health status=${health.status} ok=${healthBody?.ok}`);
  }
  if (healthBody?.checks?.liveTrading?.hardBlock !== true) {
    failures.push("live hard-block missing on health payload");
  }
  if (healthBody?.checks?.liveTrading?.submissionAllowed === true) {
    failures.push("live submission unexpectedly allowed");
  }
  if (!(
    markets.status === 200 ||
    markets.status === 401 ||
    markets.status === 429
  )) {
    failures.push(`markets/status unexpected ${markets.status}`);
  }
  if (!(
    landing.status === 200 ||
    landing.status === 307 ||
    landing.status === 308
  )) {
    failures.push(`landing unexpected ${landing.status}`);
  }

  const report = {
    ok: failures.length === 0,
    base,
    liveTrading: "DISABLED",
    checks: {
      health: health.status,
      marketsStatus: markets.status,
      landing: landing.status,
      readiness: readiness.status,
    },
    failures,
  };

  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
