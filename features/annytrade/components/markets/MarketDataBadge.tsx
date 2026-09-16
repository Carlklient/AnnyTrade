"use client";

import { useMarketMeta } from "../../hooks/useMarketMeta";
import { freshnessLabel } from "../../services/market-client";

/** Desk shell indicator for DEMO vs live vendor feed. */
export function MarketDataBadge() {
  const { data, loading } = useMarketMeta();

  if (loading || !data) {
    return (
      <div
        className="hidden items-center gap-2 rounded-[8px] border px-2.5 py-1 text-[0.7rem] sm:flex"
        style={{
          borderColor: "var(--at-border)",
          background: "var(--at-surface)",
        }}
      >
        <span className="font-bold text-[#020617]">Market Data</span>
        <span className="font-semibold">…</span>
      </div>
    );
  }

  const { meta, credentials } = data;
  const isDemo = meta.mode === "demo";
  const isTest = meta.mode === "test";
  const freshness = freshnessLabel(meta.freshnessDefault);
  const label = isDemo
    ? "DEMO"
    : isTest
      ? "TEST"
      : "LIVE FEED";
  const detail = isDemo
    ? "Practice quotes · not delayed exchange feed"
    : isTest
      ? `${meta.providerLabel} test mode`
      : `${freshness} · ${meta.providerLabel}`;

  return (
    <div
      className="hidden max-w-[14rem] items-center gap-2 rounded-[8px] border px-2.5 py-1 text-[0.7rem] sm:flex"
      style={{
        borderColor: isDemo
          ? "color-mix(in srgb, var(--at-demo) 40%, var(--at-border))"
          : "color-mix(in srgb, var(--at-buy) 35%, var(--at-border))",
        background: isDemo
          ? "color-mix(in srgb, var(--at-demo) 10%, var(--at-surface))"
          : "color-mix(in srgb, var(--at-buy) 8%, var(--at-surface))",
      }}
      title={
        credentials.credentialRequired
          ? "REAL PROVIDER CREDENTIAL REQUIRED. Set ANNYTRADE_MARKET_DATA_API_KEY"
          : meta.notes
      }
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{
          background: isDemo ? "var(--at-demo)" : "var(--at-buy)",
          boxShadow: isDemo
            ? "0 0 0 3px color-mix(in srgb, var(--at-demo) 25%, transparent)"
            : "0 0 0 3px var(--at-buy-muted)",
        }}
      />
      <span className="min-w-0">
        <span className="block font-bold text-[#020617]">{label}</span>
        <span className="block truncate text-[0.6rem] font-semibold text-[#0f172a]">
          {detail}
        </span>
      </span>
    </div>
  );
}
