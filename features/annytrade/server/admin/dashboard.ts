import { getSql } from "../db/client";
import {
  getMarketCredentialStatus,
  getMarketDataProvider,
} from "../market/factory";
import {
  getBrokerCredentialStatus,
  tryGetBrokerProvider,
} from "../broker/factory";
import { brokerOrdersEnabled } from "../broker/kill-switch";
import {
  emergencyKillSwitchActive,
  getLiveFlagSnapshot,
  PHASE8_LIVE_SUBMISSION_HARD_BLOCK,
} from "../execution/live-guard";
import { rateLimitBackendStatus } from "../security/rate-limit";
import { errorTrackingConfigured } from "../observability/error-tracking";
import { getMetricsSnapshot, setGauge } from "../observability/metrics";
import { listRecentOpsAlerts } from "../execution/ops-alerts";

export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  latencyMs: number | null;
  error: string | null;
}> {
  const started = Date.now();
  try {
    const sql = getSql();
    await sql`SELECT 1 AS ok`;
    const latencyMs = Date.now() - started;
    setGauge("db_ok", 1);
    return { ok: true, latencyMs, error: null };
  } catch (err) {
    setGauge("db_ok", 0);
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message.slice(0, 200) : "db_error",
    };
  }
}

export async function getProviderHealth() {
  const db = await checkDatabaseHealth();
  const marketCreds = getMarketCredentialStatus();
  const market = getMarketDataProvider();
  const brokerCreds = getBrokerCredentialStatus();
  const broker = tryGetBrokerProvider();
  const live = getLiveFlagSnapshot();

  let marketStatus: string | null = null;
  try {
    const st = await market.getMarketStatus("US");
    marketStatus = st.status;
    setGauge("market_feed_ok", 1);
  } catch {
    setGauge("market_feed_ok", 0);
    marketStatus = "error";
  }

  setGauge(
    "broker_connected",
    broker && !brokerCreds.credentialRequired ? 1 : 0,
  );

  return {
    asOf: new Date().toISOString(),
    database: db,
    market: {
      providerId: market?.meta.providerId ?? null,
      mode: market?.meta.mode ?? null,
      credentialRequired: marketCreds.credentialRequired,
      sessionPhase: marketStatus,
    },
    broker: {
      providerId: broker?.meta.providerId ?? null,
      credentialRequired: brokerCreds.credentialRequired,
      sandboxOrdersEnabled: brokerOrdersEnabled(),
      emergencyKill: emergencyKillSwitchActive(),
      liveHardBlock: PHASE8_LIVE_SUBMISSION_HARD_BLOCK,
      liveSubmissionAllowed: live.liveSubmissionAllowed,
    },
    rateLimit: rateLimitBackendStatus(),
    errorTrackingConfigured: errorTrackingConfigured(),
    metrics: getMetricsSnapshot(),
  };
}

export async function getAdminDashboardSnapshot() {
  const sql = getSql();
  const health = await getProviderHealth();

  const [userCounts] = await sql<
    { total: string; active: string; suspended: string; closed: string }[]
  >`
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active,
      COUNT(*) FILTER (WHERE status = 'SUSPENDED')::text AS suspended,
      COUNT(*) FILTER (WHERE status = 'CLOSED')::text AS closed
    FROM annytrade.users
  `;

  const [orderHealth] = await sql<
    { open: string; rejected_24h: string; filled_24h: string }[]
  >`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('PENDING','OPEN','PARTIALLY_FILLED'))::text AS open,
      COUNT(*) FILTER (
        WHERE status = 'REJECTED' AND created_at > NOW() - INTERVAL '24 hours'
      )::text AS rejected_24h,
      COUNT(*) FILTER (
        WHERE status = 'FILLED' AND updated_at > NOW() - INTERVAL '24 hours'
      )::text AS filled_24h
    FROM annytrade.orders
  `;

  const [recon] = await sql<{ connections: string; stale: string }[]>`
    SELECT
      COUNT(*)::text AS connections,
      COUNT(*) FILTER (
        WHERE last_synced_at IS NULL
           OR last_synced_at < NOW() - INTERVAL '30 minutes'
      )::text AS stale
    FROM annytrade.broker_connections
    WHERE status = 'CONNECTED'
  `;

  const [jobs] = await sql<{ failed_24h: string; running: string }[]>`
    SELECT
      COUNT(*) FILTER (
        WHERE status = 'FAILED' AND started_at > NOW() - INTERVAL '24 hours'
      )::text AS failed_24h,
      COUNT(*) FILTER (WHERE status = 'RUNNING')::text AS running
    FROM annytrade.job_runs
  `;

  const [rl] = await sql<{ count_24h: string }[]>`
    SELECT COUNT(*)::text AS count_24h
    FROM annytrade.rate_limit_events
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `;

  const [notifFail] = await sql<{ count_24h: string }[]>`
    SELECT COUNT(*)::text AS count_24h
    FROM annytrade.notification_failures
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `;

  const [sec] = await sql<{ count_24h: string }[]>`
    SELECT COUNT(*)::text AS count_24h
    FROM annytrade.audit_events
    WHERE created_at > NOW() - INTERVAL '24 hours'
      AND (
        event_type LIKE 'auth.login_failed%'
        OR event_type LIKE 'auth.login_blocked%'
        OR event_type LIKE 'admin.%'
        OR event_type LIKE 'broker.live.%'
        OR event_type LIKE 'ops.alert.%'
      )
  `;

  const opsAlerts = await listRecentOpsAlerts(20);

  return {
    users: {
      total: Number(userCounts?.total ?? 0),
      active: Number(userCounts?.active ?? 0),
      suspended: Number(userCounts?.suspended ?? 0),
      closed: Number(userCounts?.closed ?? 0),
    },
    orderProcessing: {
      open: Number(orderHealth?.open ?? 0),
      rejected24h: Number(orderHealth?.rejected_24h ?? 0),
      filled24h: Number(orderHealth?.filled_24h ?? 0),
    },
    reconciliation: {
      connectedBrokers: Number(recon?.connections ?? 0),
      staleConnections: Number(recon?.stale ?? 0),
    },
    jobs: {
      failed24h: Number(jobs?.failed_24h ?? 0),
      running: Number(jobs?.running ?? 0),
    },
    rateLimitEvents24h: Number(rl?.count_24h ?? 0),
    notificationFailures24h: Number(notifFail?.count_24h ?? 0),
    securityEvents24h: Number(sec?.count_24h ?? 0),
    recentOpsAlerts: opsAlerts,
    health,
    liveTradingDisabled: true as const,
  };
}
