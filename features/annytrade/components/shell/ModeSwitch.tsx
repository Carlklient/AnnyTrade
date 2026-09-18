"use client";

import Link from "next/link";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { cnAt, formatMoney } from "../../lib/format";
import { annytradeRoutes } from "../../lib/routes";
import type { AccountMode } from "../../types";

const MODE_LABEL: Record<AccountMode, { full: string; short: string }> = {
  demo: { full: "Paper ledger", short: "Paper" },
  live: { full: "UI preview only", short: "Preview" },
};

export function ModeSwitch() {
  const { mode, setMode } = useAnnyTrade();

  return (
    <div
      className="inline-flex shrink-0 items-center rounded-[8px] border p-0.5"
      style={{
        borderColor: "var(--at-border)",
        background: "var(--at-bg-elevated)",
      }}
      role="group"
      aria-label="Desk display mode (does not change paper ledger)"
      title="Paper ledger is always used for orders. Preview only changes chrome."
    >
      {(["demo", "live"] as const).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cnAt(
              "rounded-[6px] px-2 py-1 text-[0.625rem] font-bold tracking-[0.04em] uppercase transition-colors sm:px-2.5 sm:text-[0.6875rem]",
              active ? "" : "font-bold text-[var(--at-text)] hover:font-bold",
            )}
            style={
              active
                ? m === "live"
                  ? {
                      background: "var(--at-sell-muted)",
                      color: "var(--at-live)",
                      boxShadow:
                        "inset 0 0 0 1px color-mix(in srgb, var(--at-live) 35%, transparent)",
                    }
                  : {
                      background:
                        "color-mix(in srgb, var(--at-demo) 14%, transparent)",
                      color: "var(--at-demo)",
                      boxShadow:
                        "inset 0 0 0 1px color-mix(in srgb, var(--at-demo) 35%, transparent)",
                    }
                : undefined
            }
          >
            <span className="sm:hidden">{MODE_LABEL[m].short}</span>
            <span className="hidden sm:inline">{MODE_LABEL[m].full}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ModeBanner() {
  const { mode, account } = useAnnyTrade();
  if (mode === "demo") {
    return (
      <div
        className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[8px] border px-3 py-2 text-[0.75rem]"
        style={{
          borderColor:
            "color-mix(in srgb, var(--at-demo) 35%, var(--at-border))",
          background: "color-mix(in srgb, var(--at-demo) 10%, transparent)",
          color: "var(--at-text-secondary)",
        }}
      >
        <span>
          <strong className="text-[var(--at-text)]">Paper desk</strong>:
          simulated fills only. Equity{" "}
          <span className="at-mono font-semibold">
            {formatMoney(account.equity, account.currency)}
          </span>
          . Live brokerage stays hard-blocked.
        </span>
        <Link href={annytradeRoutes.wallet} className="font-bold underline">
          Paper wallet
        </Link>
      </div>
    );
  }
  return (
    <div
      className="mb-3 rounded-[8px] border px-3 py-2 text-[0.75rem]"
      style={{
        borderColor: "color-mix(in srgb, var(--at-live) 35%, var(--at-border))",
        background: "color-mix(in srgb, var(--at-live) 10%, transparent)",
      }}
    >
      <strong>UI preview</strong> — chrome only. Orders still hit the PAPER
      ledger. No live money path.
    </div>
  );
}
