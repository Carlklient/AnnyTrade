"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bitcoin,
  ChevronDown,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
} from "lucide-react";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import {
  formatCompactTime,
  formatMoney,
  formatPct,
  formatPrice,
  pnlClass,
  cleanCopy,
} from "../../lib/format";
import { useQuotes } from "../../hooks/useQuotes";
import { useWatchlistSymbols } from "../../hooks/useWatchlistSymbols";
import { newsClient, type NewsArticleDto } from "../../services/news-client";
import { num } from "../../services/market-client";
import { paperTradingClient } from "../../services/paper-client";
import type { PaperAccountSummary, PublicPosition } from "../../types/backend";

export function DashboardView() {
  const { auth, user } = useAnnyTrade();
  const { symbols: watchSymbols } = useWatchlistSymbols();
  const { quotes, loading: quotesLoading } = useQuotes(watchSymbols);

  const [summary, setSummary] = useState<PaperAccountSummary | null>(null);
  const [accountTab, setAccountTab] = useState<"practice" | "real">("practice");
  const [articles, setArticles] = useState<NewsArticleDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!auth.authenticated) {
      setSummary(null);
      return;
    }
    try {
      const s = await paperTradingClient.summary();
      setSummary(s);
      setLoadError(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load practice account",
      );
    }
  }, [auth.authenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void newsClient
      .list({ limit: 6 })
      .then((res) => setArticles(res.articles))
      .catch(() => setArticles([]));
  }, []);

  const currency = summary?.currency ?? "USD";
  const positions: PublicPosition[] = summary?.positions ?? [];

  const movers = useMemo(() => {
    return [...quotes]
      .map((q) => ({
        symbol: q.symbol,
        last: num(q.last) ?? 0,
        changePct: num(q.changePercent) ?? 0,
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 5);
  }, [quotes]);

  const balance = summary?.cashBalance ?? 0;
  const equity = summary?.equity ?? null;
  const available = summary?.availableCash ?? 0;
  const totalPnl = summary?.totalPnl ?? null;
  const unrealized = summary?.unrealizedPnl ?? 0;

  return (
    <div className="space-y-4">
      <div className="at-sec-banner">
        <Lock className="size-4 shrink-0 text-[var(--at-accent)]" aria-hidden />
        <p>
          Reach an intermediate practice level. Your paper desk progress stays
          local and live brokerage is off.{" "}
          <Link
            href={annytradeRoutes.account}
            className="font-semibold text-[var(--at-accent)]"
          >
            See what to improve
          </Link>
          .
        </p>
      </div>

      {loadError ? (
        <p className="text-[0.75rem] text-[var(--at-sell)]">{loadError}</p>
      ) : null}

      {/* Primary account overview */}
      <section className="at-card">
        <div className="at-card-header">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">Practice accounts</h2>
            <ChevronDown
              className="size-4 font-bold text-[#020617]"
              aria-hidden
            />
          </div>
          <Link
            href={
              auth.authenticated
                ? annytradeRoutes.account
                : annytradeRoutes.auth.register
            }
            className="at-btn at-btn-ghost size-8 p-0"
            aria-label="Add account"
            title="Open practice account"
          >
            <Plus className="size-4" />
          </Link>
        </div>
        <div className="at-card-body space-y-4">
          <Link
            href={
              auth.authenticated
                ? annytradeRoutes.account
                : annytradeRoutes.auth.login
            }
            className="flex w-full items-center justify-between rounded-[12px] border px-3 py-2.5 text-left text-[0.8125rem] no-underline transition hover:border-[var(--at-accent)]"
            style={{
              borderColor: "var(--at-border)",
              background: "var(--at-surface-2)",
              color: "var(--at-text)",
            }}
          >
            <span className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold text-white uppercase"
                style={{ background: "var(--at-accent)" }}
              >
                Practice
              </span>
              <span className="font-bold">
                {auth.authenticated
                  ? `${user.name || "Trader"}, PAPER USD`
                  : "Sign in for your paper book"}
              </span>
            </span>
            <ChevronDown className="size-4 font-bold text-[#020617]" />
          </Link>

          <div>
            <p
              className="text-[2.5rem] leading-none font-medium tracking-normal text-[#020617] sm:text-[3rem]"
              style={{
                fontFamily: "var(--at-font-sans)",
                fontVariantNumeric: "lining-nums",
              }}
            >
              {auth.authenticated ? formatMoney(balance, currency) : "$0.00"}
            </p>
            <p className="mt-2 text-[0.75rem] font-extrabold text-[#020617]">
              Simulated balance, not withdrawable, not live brokerage
            </p>
          </div>

          <div className="at-metric-row">
            <div>
              <p className="lbl" style={{ color: "#000", fontWeight: 900 }}>
                Total profit
              </p>
              <p
                className={`val ${totalPnl != null ? pnlClass(totalPnl) : ""}`}
              >
                {auth.authenticated && totalPnl != null
                  ? formatMoney(totalPnl, currency, { signed: true })
                  : "n/a"}
              </p>
            </div>
            <div>
              <p className="lbl" style={{ color: "#000", fontWeight: 900 }}>
                Equity
              </p>
              <p className="val">
                {auth.authenticated && equity != null
                  ? formatMoney(equity, currency)
                  : "n/a"}
              </p>
            </div>
            <div>
              <p className="lbl" style={{ color: "#000", fontWeight: 900 }}>
                Available
              </p>
              <p className="val">
                {auth.authenticated ? formatMoney(available, currency) : "n/a"}
              </p>
            </div>
            <div>
              <p className="lbl" style={{ color: "#000", fontWeight: 900 }}>
                Bonus
              </p>
              <p className="val">$0.00</p>
            </div>
            <div>
              <p className="lbl" style={{ color: "#000", fontWeight: 900 }}>
                Net profit
              </p>
              <p className={`val ${pnlClass(unrealized)}`}>
                {auth.authenticated
                  ? formatMoney(unrealized, currency, { signed: true })
                  : "n/a"}
              </p>
            </div>
          </div>

          <div className="at-action-row">
            <Link
              href={annytradeRoutes.wallet}
              className="at-btn at-btn-primary h-11 justify-center font-bold"
            >
              Deposit
            </Link>
            <Link
              href={annytradeRoutes.trade()}
              className="at-btn at-btn-ghost h-11 justify-center font-bold"
            >
              Trade
            </Link>
            <Link
              href={`${annytradeRoutes.wallet}?tab=withdraw`}
              className="at-btn at-btn-ghost h-11 justify-center font-bold"
            >
              Withdraw
            </Link>
            <Link
              href={annytradeRoutes.portfolio}
              className="at-btn at-btn-ghost h-11 justify-center font-bold"
            >
              Details
            </Link>
          </div>
        </div>
      </section>

      {/* Deposit methods + top changes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-bold">Popular funding methods</h2>
          </div>
          <div className="at-card-body">
            <p className="mb-3 text-[0.75rem] font-extrabold text-[#020617]">
              Demo labels only. AnnyTrade does not custody crypto or customer
              funds. Deposit opens paper wallet funding.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Paper USD", icon: ShieldCheck },
                { label: "Demo top-up", icon: Sparkles },
                { label: "Simulated", icon: Bitcoin },
              ].map((m) => (
                <Link
                  key={m.label}
                  href={annytradeRoutes.wallet}
                  className="flex flex-col items-center gap-2 rounded-[12px] border px-2 py-4 text-center text-[0.75rem] font-bold no-underline transition hover:border-[var(--at-accent)]"
                  style={{
                    borderColor: "var(--at-border)",
                    color: "var(--at-text)",
                    background: "var(--at-surface-2)",
                  }}
                >
                  <m.icon className="size-6 text-[var(--at-accent)]" />
                  {m.label}
                </Link>
              ))}
            </div>
            <ul className="mt-4 flex flex-wrap gap-4 text-[0.75rem] font-bold text-[#020617]">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-[var(--at-buy)]" />
                No commission on paper
              </li>
              <li className="flex items-center gap-1.5">
                <ThumbsUp className="size-3.5 text-[var(--at-accent)]" />
                Honest marks
              </li>
              <li className="flex items-center gap-1.5">
                <Star className="size-3.5 text-[var(--at-warning)]" />
                Live execution off
              </li>
            </ul>
          </div>
        </section>

        <section className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-bold">Top daily changes</h2>
            <Link
              href={annytradeRoutes.markets}
              className="text-[0.75rem] font-bold text-[var(--at-accent)]"
            >
              Markets
            </Link>
          </div>
          <ul>
            {quotesLoading && movers.length === 0 ? (
              <li className="px-4 py-6 text-[0.8125rem] font-bold text-[#020617]">
                Loading quotes…
              </li>
            ) : null}
            {movers.map((a) => (
              <li
                key={a.symbol}
                className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0"
                style={{ borderColor: "var(--at-border)" }}
              >
                <div>
                  <p className="text-[0.8125rem] font-bold">#{a.symbol}</p>
                  <p
                    className={`at-mono text-[0.7rem] font-bold ${pnlClass(a.changePct)}`}
                  >
                    {formatPct(a.changePct)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="at-mono text-[0.8125rem] font-bold">
                    {formatPrice(a.last)}
                  </p>
                  <Link
                    href={annytradeRoutes.trade(a.symbol)}
                    className="at-btn at-btn-primary h-8 px-3 text-[0.7rem] font-bold tracking-wide uppercase"
                  >
                    Trade
                  </Link>
                </div>
              </li>
            ))}
            {!quotesLoading && movers.length === 0 ? (
              <li className="px-4 py-6 text-[0.8125rem] font-bold text-[#020617]">
                No watchlist quotes yet.{" "}
                <Link
                  href={annytradeRoutes.markets}
                  className="font-bold text-[var(--at-accent)]"
                >
                  Browse markets
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      </div>

      {/* Promo banners */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="at-promo">
          <div>
            <h3>Invite friends and earn together</h3>
            <p>
              Share AnnyTrade practice. Build discipline together. No referral
              payouts on live funds (live stays disabled).
            </p>
          </div>
          <Link
            href={annytradeRoutes.account}
            className="at-btn at-btn-primary shrink-0"
          >
            Learn more
          </Link>
        </div>
        <div
          className="at-promo"
          style={{
            background: "linear-gradient(135deg, #eff6ff, #f8fafc)",
          }}
        >
          <div>
            <h3>Practice boost</h3>
            <p>
              Top up simulated cash from Wallet to keep drilling entries without
              risking real money.
            </p>
          </div>
          <Link
            href={annytradeRoutes.wallet}
            className="at-btn at-btn-primary shrink-0"
          >
            Get boost
          </Link>
        </div>
      </div>

      {/* Your accounts */}
      <section className="at-card">
        <div className="at-card-header">
          <h2 className="text-sm font-bold">Your accounts</h2>
          <div
            className="flex rounded-full p-0.5 text-[0.75rem] font-bold"
            style={{ background: "var(--at-surface-2)" }}
            role="tablist"
            aria-label="Account type"
          >
            {(
              [
                ["practice", "Practice"],
                ["real", "Real"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={accountTab === id}
                className="rounded-full px-3 py-1.5 font-bold transition"
                style={
                  accountTab === id
                    ? {
                        background: "#fff",
                        color: "var(--at-accent)",
                        boxShadow: "var(--at-shadow)",
                      }
                    : { color: "var(--at-text-secondary)" }
                }
                onClick={() => setAccountTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {accountTab === "real" ? (
          <p className="px-4 py-8 text-center text-[0.8125rem] font-bold text-[#020617]">
            Real-money accounts are not available. Live execution remains hard
            blocked. Use Practice for paper trading.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[0.8125rem]">
              <thead>
                <tr
                  className="border-b font-bold text-[#020617]"
                  style={{ borderColor: "var(--at-border)" }}
                >
                  {["Account", "Type", "Balance", "Equity"].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="grid size-8 place-items-center rounded-[8px] text-[0.65rem] font-bold text-white"
                        style={{ background: "var(--at-accent)" }}
                      >
                        AT
                      </span>
                      <div>
                        <p className="font-bold">
                          {auth.authenticated
                            ? "Paper, AnnyTrade"
                            : "Guest demo"}
                        </p>
                        <p className="text-[0.7rem] font-bold text-[#020617]">
                          USD practice book
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-bold">Practice</td>
                  <td className="at-mono px-4 py-3.5 font-bold">
                    {auth.authenticated
                      ? formatMoney(balance, currency)
                      : "n/a"}
                  </td>
                  <td className="at-mono px-4 py-3.5 font-bold">
                    {auth.authenticated && equity != null
                      ? formatMoney(equity, currency)
                      : "n/a"}
                  </td>
                </tr>
                {positions.slice(0, 3).map((p) => (
                  <tr
                    key={p.id}
                    className="border-t"
                    style={{ borderColor: "var(--at-border)" }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={annytradeRoutes.trade(p.symbol)}
                        className="font-bold text-[var(--at-accent)]"
                      >
                        Position, {p.symbol}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#020617]">Open</td>
                    <td className="at-mono px-4 py-3 font-bold">
                      {p.quantity}
                    </td>
                    <td
                      className={`at-mono px-4 py-3 font-bold ${pnlClass(p.unrealizedPnl ?? 0)}`}
                    >
                      {p.unrealizedPnl != null
                        ? formatMoney(p.unrealizedPnl, currency, {
                            signed: true,
                          })
                        : "n/a"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Space Feed */}
      <section className="at-card">
        <div className="at-card-header">
          <h2 className="text-sm font-bold">Space Feed</h2>
          <Link
            href={annytradeRoutes.news}
            className="text-[0.75rem] font-bold text-[var(--at-accent)]"
          >
            View all posts
          </Link>
        </div>
        <div className="at-card-body pt-0">
          {articles.length === 0 ? (
            <p className="py-6 text-[0.8125rem] font-bold text-[#020617]">
              No feed items yet.{" "}
              <Link
                href={annytradeRoutes.news}
                className="font-bold text-[var(--at-accent)]"
              >
                Open news
              </Link>
            </p>
          ) : (
            articles.map((a) => (
              <article key={a.id} className="at-feed-item">
                <div className="at-feed-meta">
                  <span
                    className="grid size-7 place-items-center rounded-full text-[0.6rem] font-bold text-white"
                    style={{ background: "var(--at-accent)" }}
                  >
                    AT
                  </span>
                  <span className="font-bold text-[var(--at-text)]">
                    AnnyTrade Insights
                  </span>
                  <span>, </span>
                  <time dateTime={a.publishedAt}>
                    {formatCompactTime(a.publishedAt)}
                  </time>
                </div>
                <h3>{cleanCopy(a.headline)}</h3>
                <p>
                  {cleanCopy(
                    a.summary?.slice(0, 160) ||
                      "Market headline. Open the source for the full story.",
                  )}
                  {(a.summary?.length ?? 0) > 160 ? "…" : ""}
                </p>
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-[0.8125rem] font-bold text-[var(--at-accent)]"
                  >
                    Read more
                  </a>
                ) : (
                  <Link
                    href={annytradeRoutes.news}
                    className="mt-2 inline-block text-[0.8125rem] font-bold text-[var(--at-accent)]"
                  >
                    Read more
                  </Link>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
