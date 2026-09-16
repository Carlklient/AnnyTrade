"use client";

import { useEffect, useState } from "react";

import { annytradeFetch } from "@/features/annytrade/services/client";

type Dashboard = {
  users: { total: number; active: number; suspended: number; closed: number };
  orderProcessing: { open: number; rejected24h: number; filled24h: number };
  reconciliation: { connectedBrokers: number; staleConnections: number };
  jobs: { failed24h: number; running: number };
  rateLimitEvents24h: number;
  notificationFailures24h: number;
  securityEvents24h: number;
  liveTradingDisabled: true;
  health: {
    database: { ok: boolean; latencyMs: number | null };
    market: { providerId: string | null; sessionPhase: string | null };
    broker: {
      providerId: string | null;
      liveHardBlock: boolean;
      sandboxOrdersEnabled: boolean;
    };
  };
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void annytradeFetch<Dashboard>("/admin/dashboard", { method: "GET" })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  if (error) return <p className="text-[var(--at-sell)]">{error}</p>;
  if (!data) return <p className="text-[var(--at-text-muted)]">Loading…</p>;

  const cards = [
    ["Users", `${data.users.active} active / ${data.users.total}`],
    ["Suspended", String(data.users.suspended)],
    ["Open orders", String(data.orderProcessing.open)],
    ["Filled 24h", String(data.orderProcessing.filled24h)],
    ["Rejected 24h", String(data.orderProcessing.rejected24h)],
    ["Broker stale", String(data.reconciliation.staleConnections)],
    ["Jobs failed 24h", String(data.jobs.failed24h)],
    ["Rate limits 24h", String(data.rateLimitEvents24h)],
    ["Notif failures 24h", String(data.notificationFailures24h)],
    ["Security events 24h", String(data.securityEvents24h)],
  ] as const;

  return (
    <div className="space-y-4">
      <p className="text-[0.8125rem] text-[var(--at-text-secondary)]">
        Operational snapshot. Financial history cannot be casually rewritten
        from this console. Live trading:{" "}
        <strong>{data.liveTradingDisabled ? "DISABLED" : "CHECK"}</strong>
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-[8px] border p-3"
            style={{ borderColor: "var(--at-border)" }}
          >
            <p className="text-[0.65rem] text-[var(--at-text-muted)] uppercase">
              {label}
            </p>
            <p className="at-mono mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div
        className="rounded-[8px] border p-3 text-[0.75rem]"
        style={{ borderColor: "var(--at-border)" }}
      >
        <p>
          DB: {data.health.database.ok ? "ok" : "DOWN"},{" "}
          {data.health.database.latencyMs ?? "n/a"}ms
        </p>
        <p>
          Market: {data.health.market.providerId ?? "n/a"},{" "}
          {data.health.market.sessionPhase ?? "n/a"}
        </p>
        <p>
          Broker: {data.health.broker.providerId ?? "n/a"}, live hard block{" "}
          {String(data.health.broker.liveHardBlock)}, sandbox orders{" "}
          {data.health.broker.sandboxOrdersEnabled ? "on" : "off"}
        </p>
      </div>
    </div>
  );
}
