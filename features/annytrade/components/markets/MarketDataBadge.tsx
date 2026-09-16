"use client";

import { useMarketMeta } from "../../hooks/useMarketMeta";
import { freshnessLabel } from "../../services/market-client";

/** Unobtrusive data-source indicator for desk shell. */
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
  const freshness = freshnessLabel(meta.freshnessDefault);
  const label =
    meta.mode === "demo"
      ? "DEMO"
      : meta.mode === "test"
        ? "TEST"
        : `${freshness}, ${meta.providerLabel}`;

  return (
    <div
      className="hidden items-center gap-2 rounded-[8px] border px-2.5 py-1 text-[0.7rem] sm:flex"
      style={{
        borderColor: "var(--at-border)",
        background: "var(--at-surface)",
      }}
      title={
        credentials.credentialRequired
          ? "REAL PROVIDER CREDENTIAL REQUIRED. Set ANNYTRADE_MARKET_DATA_API_KEY"
          : meta.notes
      }
    >
      <span
        className="size-1.5 rounded-full"
        style={{
          background:
            meta.mode === "live" ? "var(--at-buy)" : "var(--at-text-muted)",
          boxShadow:
            meta.mode === "live"
              ? "0 0 0 3px var(--at-buy-muted)"
              : "0 0 0 3px color-mix(in srgb, var(--at-text-muted) 25%, transparent)",
        }}
      />
      <span className="font-bold text-[#020617]">Market Data</span>
      <span className="font-semibold">{label}</span>
    </div>
  );
}
