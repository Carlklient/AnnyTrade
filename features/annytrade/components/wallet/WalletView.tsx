"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, Sparkles } from "lucide-react";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import { formatCompactTime, formatMoney } from "../../lib/format";
import { annytradeFetch } from "../../services/client";

const TOP_UPS = [1_000, 5_000, 10_000, 25_000] as const;

type LedgerPayload = {
  accountId: string;
  currency: string;
  cashBalance: number;
  reserved: number;
  availableCash: number;
  initialBalance: number;
  entries: {
    id: string;
    category: string;
    amount: number;
    currency: string;
    memo: string | null;
    createdAt: string;
  }[];
};

export function WalletView() {
  const { account, auth, refreshAuth } = useAnnyTrade();
  const [ledger, setLedger] = useState<LedgerPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.authenticated) {
      setLedger(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await annytradeFetch<LedgerPayload>(
        "/accounts/paper-ledger?limit=40",
        { method: "GET" },
      );
      setLedger(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, [auth.authenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  async function adjust(action: "top_up" | "reset", amount?: number) {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const result = await annytradeFetch<{
        message: string;
        cashBalance: number;
      }>("/accounts/paper-adjust", {
        method: "POST",
        body: JSON.stringify({ action, amount }),
      });
      setNotice(result.message);
      await load();
      await refreshAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setBusy(false);
    }
  }

  const currency = ledger?.currency ?? account.currency;
  const cash = ledger?.cashBalance ?? account.balance;
  const available = ledger?.availableCash ?? account.balance;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="at-sec-banner">
        <Check className="size-4 shrink-0 text-[var(--at-buy)]" aria-hidden />
        <p className="font-bold">
          Paper wallet only. Top-ups adjust your practice ledger. AnnyTrade does
          not custody real funds or process withdrawals.
        </p>
      </div>

      {!auth.authenticated ? (
        <section className="at-card">
          <div className="at-card-body space-y-3">
            <h1
              className="text-xl font-bold"
              style={{ fontFamily: "var(--at-font-display)" }}
            >
              Sign in for your paper ledger
            </h1>
            <p className="text-[0.875rem] font-semibold text-[#0f172a]">
              Guest mode shows mock desk chrome only. Sign in to see cash,
              fills, fees, and practice top-ups from your real paper account.
            </p>
            <Link href={annytradeRoutes.auth.login} className="at-btn at-btn-primary">
              Sign in
            </Link>
          </div>
        </section>
      ) : null}

      <section className="at-card">
        <div className="at-card-header">
          <h2 className="text-sm font-bold">Paper cash</h2>
          <button
            type="button"
            className="at-btn at-btn-ghost h-8 px-2 text-[0.7rem]"
            onClick={() => void load()}
            disabled={loading || !auth.authenticated}
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
        </div>
        <div className="at-card-body grid gap-3 sm:grid-cols-3">
          <div>
            <p className="at-label">Cash balance</p>
            <p className="at-mono text-lg font-bold">
              {formatMoney(cash, currency)}
            </p>
          </div>
          <div>
            <p className="at-label">Available</p>
            <p className="at-mono text-lg font-bold">
              {formatMoney(available, currency)}
            </p>
          </div>
          <div>
            <p className="at-label">Starting balance</p>
            <p className="at-mono text-lg font-bold">
              {formatMoney(ledger?.initialBalance ?? 100_000, currency)}
            </p>
          </div>
        </div>
      </section>

      {notice ? (
        <div
          className="rounded-[12px] border px-3 py-2 text-[0.8125rem] font-bold"
          style={{
            borderColor:
              "color-mix(in srgb, var(--at-demo) 35%, var(--at-border))",
            background: "color-mix(in srgb, var(--at-demo) 10%, transparent)",
          }}
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div
          className="rounded-[12px] border px-3 py-2 text-[0.8125rem] font-bold text-[#7f1d1d]"
          style={{
            borderColor: "color-mix(in srgb, var(--at-sell) 40%, var(--at-border))",
            background: "var(--at-sell-muted)",
          }}
        >
          {error}
        </div>
      ) : null}

      <section className="at-card">
        <div className="at-card-body space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[var(--at-accent)]" />
            <h1
              className="text-xl font-bold"
              style={{ fontFamily: "var(--at-font-display)" }}
            >
              Practice top-up
            </h1>
          </div>
          <p className="text-[0.8125rem] font-semibold text-[#0f172a]">
            Add synthetic paper cash for practice, or reset toward your starting
            balance. These are ledger adjustments — not bank transfers.
          </p>
          <div className="flex flex-wrap gap-2">
            {TOP_UPS.map((amount) => (
              <button
                key={amount}
                type="button"
                className="at-btn at-btn-primary"
                disabled={busy || !auth.authenticated}
                onClick={() => void adjust("top_up", amount)}
              >
                +{amount.toLocaleString()}
              </button>
            ))}
            <button
              type="button"
              className="at-btn at-btn-ghost"
              disabled={busy || !auth.authenticated}
              onClick={() => void adjust("reset")}
            >
              Reset to start
            </button>
          </div>
        </div>
      </section>

      <section className="at-card">
        <div className="at-card-header">
          <h2 className="text-sm font-bold">Ledger activity</h2>
        </div>
        <ul>
          {loading && !ledger ? (
            <li className="px-4 py-6 text-[0.8125rem] font-bold">Loading…</li>
          ) : null}
          {(ledger?.entries ?? []).map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0"
              style={{ borderColor: "var(--at-border)" }}
            >
              <div>
                <p className="text-[0.8125rem] font-bold capitalize">
                  {t.category.replaceAll("_", " ").toLowerCase()}
                </p>
                <p className="text-[0.7rem] font-semibold text-[#0f172a]">
                  {formatCompactTime(t.createdAt)}
                  {t.memo ? ` · ${t.memo}` : ""}
                </p>
              </div>
              <p className="at-mono text-[0.8125rem] font-bold">
                {formatMoney(t.amount, t.currency)}
              </p>
            </li>
          ))}
          {auth.authenticated && ledger && ledger.entries.length === 0 ? (
            <li className="px-4 py-6 text-[0.8125rem] font-bold text-[#020617]">
              No ledger entries yet.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
