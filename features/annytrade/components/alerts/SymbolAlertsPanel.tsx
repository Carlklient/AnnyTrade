"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import { formatPrice } from "../../lib/format";
import { alertsClient, type PriceAlertDto } from "../../services/alerts-client";

export function SymbolAlertsPanel({
  symbol,
  lastPrice,
}: {
  symbol: string;
  lastPrice?: number | null;
}) {
  const { auth } = useAnnyTrade();
  const [alerts, setAlerts] = useState<PriceAlertDto[]>([]);
  const [condition, setCondition] =
    useState<PriceAlertDto["condition"]>("PRICE_ABOVE");
  const [target, setTarget] = useState(lastPrice ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (lastPrice != null && target === 0) setTarget(lastPrice);
  }, [lastPrice, target]);

  const refresh = useCallback(async () => {
    if (!auth.authenticated) return;
    try {
      const res = await alertsClient.list();
      setAlerts(res.alerts.filter((a) => a.symbol === symbol.toUpperCase()));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    }
  }, [auth.authenticated, symbol]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!auth.authenticated) {
    return (
      <p className="text-[0.8125rem] font-bold text-[#020617]">
        Sign in to create price alerts.{" "}
        <Link
          href={annytradeRoutes.auth.login}
          className="text-[var(--at-accent)]"
        >
          Login
        </Link>
      </p>
    );
  }

  async function create() {
    setError(null);
    setMessage(null);
    try {
      await alertsClient.create({
        symbol,
        condition,
        targetValue: target,
        notifyInApp: true,
      });
      await alertsClient.process();
      setMessage("Alert saved.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function cancel(id: string) {
    try {
      await alertsClient.cancel(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[0.75rem] font-bold text-[#020617]">
        Server-side evaluation with arming + cooldown to prevent spam. In-app
        notifications first.
        {lastPrice != null ? ` Last ${formatPrice(lastPrice)}.` : ""}
      </p>
      {error ? (
        <p className="text-[0.8125rem] text-[var(--at-sell)]">{error}</p>
      ) : null}
      {message ? (
        <p className="text-[0.8125rem] font-bold text-[#020617]">{message}</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[0.7rem]">
          <span className="at-label mb-1 block">Condition</span>
          <select
            className="at-input w-auto"
            value={condition}
            onChange={(e) =>
              setCondition(e.target.value as PriceAlertDto["condition"])
            }
          >
            <option value="PRICE_ABOVE">Price above</option>
            <option value="PRICE_BELOW">Price below</option>
            <option value="PCT_MOVE">Percent move %</option>
          </select>
        </label>
        <label className="text-[0.7rem]">
          <span className="at-label mb-1 block">
            {condition === "PCT_MOVE" ? "Percent" : "Target"}
          </span>
          <input
            className="at-input at-mono w-32"
            type="number"
            step="any"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          className="at-btn at-btn-primary"
          onClick={() => void create()}
        >
          Add alert
        </button>
        <button
          type="button"
          className="at-btn at-btn-ghost"
          onClick={() => void alertsClient.process().then(() => refresh())}
        >
          Evaluate now
        </button>
      </div>

      <ul className="space-y-2 text-[0.8125rem]">
        {alerts.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border px-3 py-2"
            style={{ borderColor: "var(--at-border)" }}
          >
            <span>
              {a.condition} {a.targetValue}, {a.status}
              {!a.armed ? ", waiting rearm" : ""}, triggers {a.triggerCount}
            </span>
            <button
              type="button"
              className="at-btn at-btn-ghost h-8"
              onClick={() => void cancel(a.id)}
            >
              Cancel
            </button>
          </li>
        ))}
        {alerts.length === 0 ? (
          <li className="font-bold text-[#020617]">No alerts for {symbol}.</li>
        ) : null}
      </ul>
    </div>
  );
}
