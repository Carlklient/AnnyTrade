"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Bitcoin,
  Check,
  ChevronDown,
  Sparkles,
  Star,
  ThumbsUp,
} from "lucide-react";

import { annytradeApi } from "../../services/api";
import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import { formatCompactTime, formatMoney } from "../../lib/format";

const METHODS = [
  {
    id: "paper-usd",
    label: "Paper USD",
    hint: "Simulated cash",
    Icon: Sparkles,
  },
  {
    id: "demo-boost",
    label: "Demo boost",
    hint: "Practice top-up",
    Icon: Star,
  },
  {
    id: "sandbox",
    label: "Sandbox credit",
    hint: "Non-withdrawable",
    Icon: Bitcoin,
  },
] as const;

export function WalletView() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("tab") === "withdraw" ? "withdraw" : "deposit";
  const { account, auth, user } = useAnnyTrade();
  const wallet = annytradeApi.getWallet();
  const txs = annytradeApi.listTransactions();
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"] | null>(
    null,
  );
  const [amount, setAmount] = useState(500);
  const [notice, setNotice] = useState<string | null>(null);

  const primary = wallet.balances[0];
  const currency = primary?.currency ?? "USD";

  function submit() {
    if (!method) return;
    setNotice(
      mode === "withdraw"
        ? "Practice withdrawal recorded (simulated). No real funds leave AnnyTrade. Custody is not offered."
        : "Practice funding recorded (simulated). No real money moved. AnnyTrade does not custody customer funds.",
    );
    setMethod(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="at-sec-banner">
        <Check className="size-4 shrink-0 text-[var(--at-buy)]" aria-hidden />
        <p className="font-bold">
          Paper wallet only. Deposits and withdrawals here are simulated for
          practice. Live custody and payouts are not offered.
        </p>
      </div>

      <div
        className="flex rounded-full p-0.5 text-[0.8125rem] font-bold"
        style={{ background: "var(--at-surface-2)" }}
        role="tablist"
        aria-label="Wallet mode"
      >
        <Link
          href={annytradeRoutes.wallet}
          role="tab"
          aria-selected={mode === "deposit"}
          className="flex-1 rounded-full px-3 py-2 text-center no-underline transition"
          style={
            mode === "deposit"
              ? {
                  background: "#fff",
                  color: "var(--at-accent)",
                  boxShadow: "var(--at-shadow)",
                }
              : { color: "var(--at-text-secondary)" }
          }
        >
          Deposit
        </Link>
        <Link
          href={`${annytradeRoutes.wallet}?tab=withdraw`}
          role="tab"
          aria-selected={mode === "withdraw"}
          className="flex-1 rounded-full px-3 py-2 text-center no-underline transition"
          style={
            mode === "withdraw"
              ? {
                  background: "#fff",
                  color: "var(--at-accent)",
                  boxShadow: "var(--at-shadow)",
                }
              : { color: "var(--at-text-secondary)" }
          }
        >
          Withdraw
        </Link>
      </div>

      {notice ? (
        <div
          className="rounded-[12px] border px-3 py-2 text-[0.8125rem] font-bold"
          style={{
            borderColor:
              "color-mix(in srgb, var(--at-demo) 35%, var(--at-border))",
            background: "color-mix(in srgb, var(--at-demo) 10%, transparent)",
            color: "var(--at-text)",
          }}
        >
          {notice}
        </div>
      ) : null}

      <section className="at-card">
        <div className="at-card-body space-y-5">
          <h1
            className="text-xl font-bold tracking-[-0.03em] sm:text-2xl"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            {mode === "withdraw"
              ? "Select where to withdraw from"
              : "Select where to transfer the money"}
          </h1>

          <Link
            href={
              auth.authenticated
                ? annytradeRoutes.account
                : annytradeRoutes.auth.login
            }
            className="flex w-full items-center justify-between rounded-[12px] border px-3 py-3 text-left no-underline transition hover:border-[var(--at-accent)]"
            style={{
              borderColor: "var(--at-border)",
              background: "var(--at-surface-2)",
              color: "var(--at-text)",
            }}
          >
            <span className="flex items-center gap-2 text-[0.875rem]">
              <span
                className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold text-white uppercase"
                style={{ background: "var(--at-accent)" }}
              >
                Practice
              </span>
              <span className="font-bold">
                {auth.authenticated ? user.name || "Trader" : "Guest"}, PAPER
              </span>
              <span className="at-mono font-bold text-[#020617]">
                {formatMoney(primary?.available ?? account.balance, currency)}
              </span>
            </span>
            <ChevronDown className="size-4 font-bold text-[#020617]" />
          </Link>

          <ul className="flex flex-wrap gap-4 text-[0.75rem] font-bold text-[#020617]">
            <li className="flex items-center gap-1.5">
              <Check className="size-3.5 text-[var(--at-buy)]" />
              No commission on paper
            </li>
            <li className="flex items-center gap-1.5">
              <ThumbsUp className="size-3.5 text-[var(--at-accent)]" />
              Honest practice marks
            </li>
            <li className="flex items-center gap-1.5">
              <Star className="size-3.5 text-[var(--at-warning)]" />
              Live execution off
            </li>
          </ul>

          <div>
            <p className="mb-3 text-sm font-bold">
              {mode === "withdraw"
                ? "Practice withdrawal"
                : "New practice deposit"}
              {auth.authenticated ? ` for ${user.name || "your account"}` : ""}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className="flex items-center gap-3 rounded-[14px] border px-3 py-4 text-left transition hover:border-[var(--at-accent)]"
                  style={{
                    borderColor:
                      method === m.id ? "var(--at-accent)" : "var(--at-border)",
                    background:
                      method === m.id
                        ? "var(--at-accent-muted)"
                        : "var(--at-surface)",
                    color: "var(--at-text)",
                  }}
                >
                  <m.Icon className="size-7 text-[var(--at-accent)]" />
                  <span>
                    <span className="block text-[0.875rem] font-bold">
                      {m.label}
                    </span>
                    <span className="block text-[0.7rem] font-extrabold text-[#020617]">
                      {m.hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {method ? (
            <div
              className="space-y-3 rounded-[14px] border p-4"
              style={{ borderColor: "var(--at-border)" }}
            >
              <label className="block text-[0.75rem] font-bold text-[#020617]">
                Amount ({currency})
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="at-mono mt-1 w-full rounded-[10px] border px-3 py-2.5 text-base font-bold"
                  style={{
                    borderColor: "var(--at-border)",
                    background: "var(--at-surface-2)",
                    color: "var(--at-text)",
                  }}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="at-btn at-btn-primary font-bold"
                  onClick={submit}
                >
                  {mode === "withdraw"
                    ? "Confirm practice withdrawal"
                    : "Confirm practice deposit"}
                </button>
                <button
                  type="button"
                  className="at-btn at-btn-ghost font-bold"
                  onClick={() => setMethod(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="at-card">
        <div className="at-card-header">
          <h2 className="text-sm font-bold">Recent activity</h2>
        </div>
        <ul>
          {txs.slice(0, 8).map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0"
              style={{ borderColor: "var(--at-border)" }}
            >
              <div>
                <p className="text-[0.8125rem] font-bold capitalize">
                  {t.type}
                </p>
                <p className="text-[0.7rem] font-extrabold text-[#020617]">
                  {formatCompactTime(t.createdAt)}, {t.status}
                </p>
              </div>
              <p className="at-mono text-[0.8125rem] font-bold">
                {formatMoney(t.amount, t.currency)}
              </p>
            </li>
          ))}
          {txs.length === 0 ? (
            <li className="px-4 py-6 text-[0.8125rem] font-bold text-[#020617]">
              No wallet activity yet.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
