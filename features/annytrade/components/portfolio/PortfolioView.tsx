"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import {
  formatCompactTime,
  formatMoney,
  formatPrice,
  pnlClass,
} from "../../lib/format";
import {
  newIdempotencyKey,
  paperTradingClient,
} from "../../services/paper-client";
import type {
  PaperAccountSummary,
  PublicOrder,
  PublicPosition,
} from "../../types/backend";

type Tab = "open" | "pending" | "closed";

export function PortfolioView() {
  const { auth } = useAnnyTrade();
  const [tab, setTab] = useState<Tab>("open");
  const [summary, setSummary] = useState<PaperAccountSummary | null>(null);
  const [open, setOpen] = useState<PublicPosition[]>([]);
  const [closed, setClosed] = useState<PublicPosition[]>([]);
  const [pending, setPending] = useState<PublicOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!auth.authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [s, orders, closedPos] = await Promise.all([
        paperTradingClient.summary(),
        paperTradingClient.listOrders({ openOnly: true }),
        paperTradingClient.listPositions({ closed: true }),
      ]);
      setSummary(s);
      setOpen(s.positions);
      setPending(orders.orders);
      setClosed(closedPos.positions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  }, [auth.authenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function cancel(id: string) {
    try {
      await paperTradingClient.cancelOrder(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  async function closePosition(symbol: string, quantity: number) {
    try {
      await paperTradingClient.submitOrder({
        symbol,
        side: "SELL",
        orderType: "MARKET",
        quantity,
        idempotencyKey: newIdempotencyKey(),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Close failed");
    }
  }

  async function closePartial(symbol: string, maxQty: number) {
    const raw = window.prompt(
      `Close how many of ${symbol}? (max ${maxQty})`,
      String(maxQty),
    );
    if (raw == null) return;
    const qty = Number(raw);
    if (!Number.isFinite(qty) || qty <= 0 || qty > maxQty + 1e-8) {
      setError("Enter a valid partial quantity.");
      return;
    }
    await closePosition(symbol, qty);
  }

  async function amendPending(id: string, limitPrice: number | null) {
    const raw = window.prompt(
      "New limit price (leave blank to keep / cancel)",
      limitPrice != null ? String(limitPrice) : "",
    );
    if (raw == null || raw.trim() === "") return;
    const next = Number(raw);
    if (!Number.isFinite(next) || next <= 0) {
      setError("Invalid amend price.");
      return;
    }
    try {
      await paperTradingClient.amendOrder(id, { limitPrice: next });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Amend failed");
    }
  }

  function exportCsv() {
    const lines = [
      "section,symbol,qty,side,type,status,price,pnl,time",
      ...open.map(
        (p) =>
          `position,${p.symbol},${p.quantity},LONG,,,${p.markPrice ?? ""},${p.unrealizedPnl ?? ""},${p.openedAt}`,
      ),
      ...pending.map(
        (o) =>
          `order,${o.symbol},${o.quantity},${o.side},${o.orderType},${o.status},${o.limitPrice ?? o.stopPrice ?? ""},,${o.submittedAt}`,
      ),
      ...closed.map(
        (p) =>
          `closed,${p.symbol},${p.quantity},,,,${p.realizedPnl ?? ""},${p.closedAt ?? ""}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annytrade-paper-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const currency = summary?.currency ?? "USD";
  const marksOk = summary?.marksComplete !== false;
  const note =
    summary && !summary.marksComplete
      ? `Marks incomplete for ${(summary.unmarkedSymbols ?? []).join(", ") || "some symbols"}. Equity withheld. No invented prices.`
      : null;

  if (!auth.authenticated) {
    return (
      <div className="at-card">
        <div className="at-card-body py-12 text-center">
          <p className="font-semibold">PAPER portfolio</p>
          <p className="mt-2 text-[0.8125rem] font-bold text-[#020617]">
            Sign in to view persistent paper positions and orders.
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="at-label">PAPER TRADING, Positions</p>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            Portfolio
          </h1>
        </div>
        <button
          type="button"
          className="at-btn at-btn-ghost h-9"
          onClick={exportCsv}
          disabled={!summary}
        >
          Export CSV
        </button>
      </div>

      {error ? (
        <p className="text-[0.8125rem] text-[var(--at-sell)]">{error}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Stat
          label="Cash"
          value={
            summary == null ? "…" : formatMoney(summary.cashBalance, currency)
          }
        />
        <Stat
          label="Available"
          value={
            summary == null ? "…" : formatMoney(summary.availableCash, currency)
          }
        />
        <Stat
          label="Market value"
          value={
            summary?.marketValue == null
              ? "…"
              : formatMoney(summary.marketValue, currency)
          }
        />
        <Stat
          label="Cost basis"
          value={
            summary?.costBasis == null
              ? "…"
              : formatMoney(summary.costBasis, currency)
          }
        />
        <Stat
          label="Equity"
          value={
            summary == null
              ? "…"
              : summary.equity == null
                ? marksOk
                  ? "…"
                  : "Unavailable"
                : formatMoney(summary.equity, currency)
          }
        />
        <Stat
          label="Unrealized P&L"
          value={
            summary == null
              ? "…"
              : formatMoney(summary.unrealizedPnl, currency, { signed: true })
          }
          className={summary ? pnlClass(summary.unrealizedPnl) : ""}
        />
        <Stat
          label="Realized P&L"
          value={
            summary?.realizedPnl == null
              ? "…"
              : formatMoney(summary.realizedPnl, currency, { signed: true })
          }
          className={
            summary?.realizedPnl != null ? pnlClass(summary.realizedPnl) : ""
          }
        />
        <Stat
          label="Total P&L"
          value={
            summary?.totalPnl == null
              ? "…"
              : formatMoney(summary.totalPnl, currency, { signed: true })
          }
          className={
            summary?.totalPnl != null ? pnlClass(summary.totalPnl) : ""
          }
        />
      </div>
      {note ? (
        <p className="text-[0.75rem] font-bold text-[#020617]">{note}</p>
      ) : null}
      {summary?.feesPaid != null && summary.feesPaid > 0 ? (
        <p className="text-[0.75rem] font-bold text-[#020617]">
          Fees paid: {formatMoney(summary.feesPaid, currency)}
        </p>
      ) : null}

      <div className="flex gap-1">
        {(
          [
            ["open", "Open positions"],
            ["pending", "Open orders"],
            ["closed", "Closed"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="at-btn"
            style={
              tab === id
                ? {
                    background: "var(--at-accent-muted)",
                    color: "var(--at-text)",
                  }
                : {
                    background: "transparent",
                    border: "1px solid var(--at-border)",
                    color: "var(--at-text-secondary)",
                  }
            }
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="at-btn at-btn-ghost ml-auto"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="at-card overflow-x-auto">
        {tab === "open" ? (
          <table className="w-full min-w-[800px] text-left text-[0.8125rem]">
            <thead>
              <tr
                className="border-b font-bold text-[#020617]"
                style={{ borderColor: "var(--at-border)" }}
              >
                {[
                  "Symbol",
                  "Qty",
                  "Entry",
                  "Cost",
                  "Mark",
                  "MV",
                  "P&L",
                  "Opened",
                  "",
                ].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {open.map((p) => (
                <tr
                  key={p.id}
                  className="border-b last:border-0"
                  style={{ borderColor: "var(--at-border)" }}
                >
                  <td className="px-3 py-3">
                    <Link
                      href={annytradeRoutes.trade(p.symbol)}
                      className="font-semibold"
                    >
                      {p.symbol}
                    </Link>
                  </td>
                  <td className="at-mono px-3 py-3">{p.quantity}</td>
                  <td className="at-mono px-3 py-3">
                    {formatPrice(p.averageEntry)}
                  </td>
                  <td className="at-mono px-3 py-3">
                    {formatMoney(p.costBasis, currency)}
                  </td>
                  <td className="at-mono px-3 py-3">
                    {p.markPrice != null ? formatPrice(p.markPrice) : "n/a"}
                  </td>
                  <td className="at-mono px-3 py-3">
                    {p.marketValue != null
                      ? formatMoney(p.marketValue, currency)
                      : "n/a"}
                  </td>
                  <td
                    className={`at-mono px-3 py-3 font-semibold ${pnlClass(p.unrealizedPnl ?? 0)}`}
                  >
                    {p.unrealizedPnl != null
                      ? formatMoney(p.unrealizedPnl, currency, { signed: true })
                      : "n/a"}
                  </td>
                  <td className="px-3 py-3 font-bold text-[#020617]">
                    {formatCompactTime(p.openedAt)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        className="at-btn at-btn-ghost h-8"
                        onClick={() =>
                          void closePartial(p.symbol, p.quantity)
                        }
                      >
                        Partial
                      </button>
                      <button
                        type="button"
                        className="at-btn at-btn-ghost h-8"
                        onClick={() => void closePosition(p.symbol, p.quantity)}
                      >
                        Close
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "pending" ? (
          <table className="w-full min-w-[640px] text-left text-[0.8125rem]">
            <thead>
              <tr
                className="border-b font-bold text-[#020617]"
                style={{ borderColor: "var(--at-border)" }}
              >
                {["Symbol", "Type", "Side", "Qty", "Prices", "Status", ""].map(
                  (h) => (
                    <th key={h || "action"} className="px-3 py-2.5 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {pending.map((o) => (
                <tr
                  key={o.id}
                  className="border-b last:border-0"
                  style={{ borderColor: "var(--at-border)" }}
                >
                  <td className="px-3 py-3 font-semibold">{o.symbol}</td>
                  <td className="px-3 py-3">{o.orderType}</td>
                  <td className="px-3 py-3">{o.side}</td>
                  <td className="at-mono px-3 py-3">{o.quantity}</td>
                  <td className="at-mono px-3 py-3">
                    {o.limitPrice != null
                      ? `L ${formatPrice(o.limitPrice)} `
                      : ""}
                    {o.stopPrice != null ? `S ${formatPrice(o.stopPrice)}` : ""}
                    {o.limitPrice == null && o.stopPrice == null ? "n/a" : ""}
                  </td>
                  <td className="px-3 py-3">
                    <span className="at-badge">{o.status}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {(o.orderType === "LIMIT" ||
                        o.orderType === "STOP_LIMIT") && (
                        <button
                          type="button"
                          className="at-btn at-btn-ghost h-8"
                          onClick={() =>
                            void amendPending(o.id, o.limitPrice)
                          }
                        >
                          Amend
                        </button>
                      )}
                      <button
                        type="button"
                        className="at-btn at-btn-ghost h-8"
                        onClick={() => void cancel(o.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "closed" ? (
          <table className="w-full min-w-[640px] text-left text-[0.8125rem]">
            <thead>
              <tr
                className="border-b font-bold text-[#020617]"
                style={{ borderColor: "var(--at-border)" }}
              >
                {["Symbol", "Realized P&L", "Closed"].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {closed.map((p) => (
                <tr
                  key={p.id}
                  className="border-b last:border-0"
                  style={{ borderColor: "var(--at-border)" }}
                >
                  <td className="px-3 py-3 font-semibold">{p.symbol}</td>
                  <td
                    className={`at-mono px-3 py-3 ${pnlClass(p.realizedPnl)}`}
                  >
                    {formatMoney(p.realizedPnl, currency, { signed: true })}
                  </td>
                  <td className="px-3 py-3 font-bold text-[#020617]">
                    {p.closedAt ? formatCompactTime(p.closedAt) : "n/a"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {((tab === "open" && open.length === 0) ||
          (tab === "pending" && pending.length === 0) ||
          (tab === "closed" && closed.length === 0)) &&
        !loading ? (
          <div className="px-4 py-10 text-center text-[0.8125rem] font-bold text-[#020617]">
            Nothing here yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({
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
