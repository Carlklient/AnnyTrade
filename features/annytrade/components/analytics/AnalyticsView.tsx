"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import { formatMoney, formatPct, pnlClass } from "../../lib/format";
import { paperTradingClient } from "../../services/paper-client";
import type { PortfolioAnalyticsResponse } from "../../types/backend";

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function AnalyticsView() {
  const { auth } = useAnnyTrade();
  const [from, setFrom] = useState(() => daysAgo(90));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<PortfolioAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!auth.authenticated) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const analytics = await paperTradingClient.analytics({ from, to });
      setData(analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [auth.authenticated, from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!auth.authenticated) {
    return (
      <div className="at-card">
        <div className="at-card-body py-12 text-center">
          <p className="font-semibold">PAPER performance analytics</p>
          <p className="mt-2 text-[0.8125rem] font-bold text-[var(--at-text)]">
            Sign in to compute analytics from your paper ledger, executions, and
            equity snapshots.
          </p>
          <Link
            href={annytradeRoutes.auth.login}
            className="at-btn at-btn-primary mt-4"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const currency = data?.currency ?? "USD";
  const t = data?.tradeStats;
  const dd = data?.drawdown;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="at-label">PAPER TRADING, Performance</p>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            Performance analytics
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[0.7rem]">
            <span className="at-label mb-1 block">From</span>
            <input
              className="at-input"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-[0.7rem]">
            <span className="at-label mb-1 block">To</span>
            <input
              className="at-input"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="at-btn at-btn-ghost"
            onClick={() => void refresh()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-[0.8125rem] text-[var(--at-sell)]">{error}</p>
      ) : null}
      {data && !data.marksComplete ? (
        <p className="text-[0.75rem] font-bold text-[var(--at-text)]">
          Marks incomplete for {data.unmarkedSymbols.join(", ")}. Equity/growth
          withheld rather than inventing prices.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Account growth"
          value={
            data?.accountGrowthPct == null
              ? "n/a"
              : formatPct(data.accountGrowthPct)
          }
          className={
            data?.accountGrowthPct != null
              ? pnlClass(data.accountGrowthPct)
              : ""
          }
        />
        <Kpi
          label="Total P&L"
          value={
            data == null
              ? "…"
              : formatMoney(data.totalPnl, currency, { signed: true })
          }
          className={data ? pnlClass(data.totalPnl) : ""}
        />
        <Kpi
          label="Win rate"
          value={t?.winRate == null ? "n/a" : `${t.winRate}%`}
        />
        <Kpi
          label="Loss rate"
          value={t?.lossRate == null ? "n/a" : `${t.lossRate}%`}
        />
        <Kpi
          label="Profit factor"
          value={t?.profitFactor == null ? "n/a" : t.profitFactor.toFixed(2)}
        />
        <Kpi
          label="Avg win"
          value={
            t?.averageWin == null ? "n/a" : formatMoney(t.averageWin, currency)
          }
        />
        <Kpi
          label="Avg loss"
          value={
            t?.averageLoss == null
              ? "n/a"
              : formatMoney(t.averageLoss, currency)
          }
        />
        <Kpi
          label="Max drawdown"
          value={
            dd?.insufficientHistory || dd?.maxDrawdownPct == null
              ? "n/a"
              : `${dd.maxDrawdownPct}%`
          }
          className="at-down"
        />
        <Kpi label="Best asset" value={t?.bestAsset ?? "n/a"} />
        <Kpi label="Worst asset" value={t?.worstAsset ?? "n/a"} />
        <Kpi
          label="Volume"
          value={
            t == null
              ? "…"
              : formatMoney(t.tradingVolume, currency, { compact: true })
          }
        />
        <Kpi
          label="Avg duration"
          value={
            t?.averageDurationHours == null
              ? "n/a"
              : `${t.averageDurationHours}h`
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Equity"
          value={
            data?.equity == null
              ? "Unavailable"
              : formatMoney(data.equity, currency)
          }
        />
        <Kpi
          label="Cash"
          value={data == null ? "…" : formatMoney(data.cash, currency)}
        />
        <Kpi
          label="Market value"
          value={data == null ? "…" : formatMoney(data.marketValue, currency)}
        />
        <Kpi
          label="Fees paid"
          value={data == null ? "…" : formatMoney(data.feesPaid, currency)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarCard
          title="Equity / P&L by day (snapshots)"
          data={(data?.series.daily ?? []).map((x) => ({
            label: x.label,
            pnl: x.pnl,
          }))}
          emptyHint="History begins when equity snapshots exist."
        />
        <BarCard
          title="Equity / P&L by week"
          data={(data?.series.weekly ?? []).map((x) => ({
            label: x.label,
            pnl: x.pnl,
          }))}
          emptyHint="Need multiple snapshot days."
        />
        <BarCard
          title="Equity / P&L by month"
          data={(data?.series.monthly ?? []).map((x) => ({
            label: x.label,
            pnl: x.pnl,
          }))}
          emptyHint="Need multi-month snapshots."
        />
        <BarCard
          title="P&L by symbol (completed FIFO trades)"
          data={(data?.bySymbolPnl ?? []).map((x) => ({
            label: x.symbol,
            pnl: x.pnl,
          }))}
          emptyHint="Complete round-trip sells to populate trade P&L by symbol."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">Long vs short</h2>
          </div>
          <div className="at-card-body">
            <div className="flex h-3 overflow-hidden rounded-full">
              <div
                style={{
                  width: `${t?.longPct ?? 100}%`,
                  background: "var(--at-buy)",
                }}
              />
              <div
                style={{
                  width: `${t?.shortPct ?? 0}%`,
                  background: "var(--at-sell)",
                }}
              />
            </div>
            <div className="mt-3 flex justify-between text-[0.8125rem]">
              <span className="at-up">Long {t?.longPct ?? 100}%</span>
              <span className="at-down">Short {t?.shortPct ?? 0}%</span>
            </div>
            <p className="mt-2 text-[0.65rem] font-bold text-[var(--at-text)]">
              Phase 3/4 paper accounts are long only.
            </p>
          </div>
        </div>
        <div className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">
              Asset allocation (marked MV)
            </h2>
          </div>
          <ul className="at-card-body space-y-2">
            {(data?.allocation ?? []).map((row) => (
              <li key={row.symbol} className="text-[0.8125rem]">
                <div className="mb-1 flex justify-between">
                  <span>{row.symbol}</span>
                  <span className="at-mono">{row.pct}%</span>
                </div>
                <div
                  className="h-1.5 rounded-full"
                  style={{ background: "var(--at-surface-3)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${row.pct}%`,
                      background: "var(--at-accent)",
                    }}
                  />
                </div>
              </li>
            ))}
            {(data?.allocation.length ?? 0) === 0 ? (
              <li className="text-[0.8125rem] font-bold text-[var(--at-text)]">
                No marked open positions.
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      {data ? (
        <div className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">Methodology</h2>
          </div>
          <ul className="at-card-body space-y-1 text-[0.75rem] font-bold text-[var(--at-text)]">
            {Object.entries(data.methodology).map(([k, v]) => (
              <li key={k}>
                <strong className="font-bold text-[var(--at-text)]">{k}:</strong> {v}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="at-card">
      <div className="at-card-body py-3">
        <p className="at-label">{label}</p>
        <p className={`at-mono mt-1 text-lg font-semibold ${className ?? ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function BarCard({
  title,
  data,
  emptyHint,
}: {
  title: string;
  data: { label: string; pnl: number }[];
  emptyHint?: string;
}) {
  const max = Math.max(...data.map((d) => Math.abs(d.pnl)), 1);
  return (
    <div className="at-card">
      <div className="at-card-header">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="at-card-body space-y-2">
        {data.length === 0 ? (
          <p className="text-[0.75rem] font-bold text-[var(--at-text)]">
            {emptyHint ?? "No data."}
          </p>
        ) : null}
        {data.slice(-12).map((row) => (
          <div key={row.label} className="text-[0.75rem]">
            <div className="mb-1 flex justify-between gap-2">
              <span className="font-bold text-[var(--at-text)]">{row.label}</span>
              <span className={`at-mono ${pnlClass(row.pnl)}`}>
                {formatMoney(row.pnl, "USD", { signed: true })}
              </span>
            </div>
            <div
              className="h-1.5 rounded-full"
              style={{ background: "var(--at-surface-3)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(Math.abs(row.pnl) / max) * 100}%`,
                  background: row.pnl >= 0 ? "var(--at-buy)" : "var(--at-sell)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
