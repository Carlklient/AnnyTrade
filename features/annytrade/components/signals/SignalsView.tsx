"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { annytradeRoutes } from "../../lib/routes";
import { cleanCopy, formatCompactTime, formatLiveAge } from "../../lib/format";
import {
  signalsClient,
  type AnalysisSignalDto,
  type SignalBias,
  type SignalLifecycle,
} from "../../services/signals-client";
import type { CandleInterval } from "../../services/market-client";

import { RiskDisclosure } from "../compliance/RiskDisclosure";

const INTERVALS: CandleInterval[] = ["15m", "1h", "1d"];
const LIVE_POLL_MS = 15_000;

export function SignalsView() {
  const [interval, setInterval] = useState<CandleInterval>("1h");
  const [bias, setBias] = useState<SignalBias | "all">("all");
  const [status, setStatus] = useState<SignalLifecycle | "all">("all");
  const [signals, setSignals] = useState<AnalysisSignalDto[]>([]);
  const [errors, setErrors] = useState<{ symbol: string; message: string }[]>(
    [],
  );
  const [disclosure, setDisclosure] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await signalsClient.list({ interval });
        setSignals(res.signals);
        setErrors(res.errors);
        setDisclosure(cleanCopy(res.disclosure));
        setGeneratedAt(res.generatedAt);
        setNowTick(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load signals");
        if (!silent) setSignals([]);
      } finally {
        setLoading(false);
      }
    },
    [interval],
  );

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      void refresh(true);
    }, LIVE_POLL_MS);
    return () => window.clearInterval(id);
  }, [live, refresh]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [live]);

  const filtered = signals.filter((s) => {
    if (bias !== "all" && s.bias !== bias) return false;
    if (status !== "all" && s.status !== status) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="at-label">Live rule based analysis, Educational</p>
        <h1
          className="text-2xl font-semibold tracking-normal"
          style={{ fontFamily: "var(--at-font-sans)" }}
        >
          Market signals
        </h1>
        <p className="mt-2 max-w-2xl text-[0.8125rem] font-bold text-[var(--at-text)]">
          Live indicator readings (EMA trend, RSI, MACD, volatility, volume when
          available) refresh every {LIVE_POLL_MS / 1000}s. Labels are{" "}
          <strong className="text-[var(--at-text)]">
            Bullish / Bearish / Neutral / Watch
          </strong>
          , never &ldquo;guaranteed buy&rdquo; or &ldquo;guaranteed
          profit.&rdquo; Confidence is an alignment score, not a success rate.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[0.7rem]">
          <span className="at-label mb-1 block">Timeframe</span>
          <select
            className="at-input w-auto min-w-[6rem]"
            value={interval}
            onChange={(e) => setInterval(e.target.value as CandleInterval)}
          >
            {INTERVALS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[0.7rem]">
          <span className="at-label mb-1 block">Bias</span>
          <select
            className="at-input w-auto min-w-[8rem]"
            value={bias}
            onChange={(e) => setBias(e.target.value as SignalBias | "all")}
          >
            {["all", "Bullish", "Bearish", "Neutral", "Watch"].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[0.7rem]">
          <span className="at-label mb-1 block">Status</span>
          <select
            className="at-input w-auto min-w-[8rem]"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as SignalLifecycle | "all")
            }
          >
            {["all", "Active", "Stale", "Expired"].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="at-btn at-btn-ghost"
          onClick={() => void refresh(false)}
          disabled={loading}
        >
          Refresh now
        </button>
        <button
          type="button"
          className={`at-btn ${live ? "at-btn-primary" : "at-btn-ghost"}`}
          aria-pressed={live}
          onClick={() => setLive((v) => !v)}
        >
          {live ? "Live on" : "Live off"}
        </button>
      </div>

      {error ? (
        <p className="text-[0.8125rem] text-[var(--at-sell)]">{error}</p>
      ) : null}
      {generatedAt ? (
        <p className="text-[0.7rem] font-bold text-[var(--at-text)]">
          <span className={live ? "at-up" : ""}>
            {live ? "LIVE" : "Paused"}
          </span>
          {", updated "}
          {formatLiveAge(generatedAt, nowTick)}
          {" ("}
          {formatCompactTime(generatedAt, { seconds: true })}
          {")"}
          {loading ? ", refreshing…" : ""}
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((s) => (
          <Link
            key={s.id}
            href={annytradeRoutes.signal(s.id)}
            className="at-card block transition-transform hover:-translate-y-0.5"
          >
            <div className="at-card-body space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {s.symbol}{" "}
                    <span className={biasClass(s.bias)} aria-label={s.bias}>
                      {s.bias}
                    </span>
                  </p>
                  <p className="text-[0.7rem] font-bold text-[var(--at-text)]">
                    {cleanCopy(s.title)}, {s.interval}
                    {s.dataFreshness ? `, ${s.dataFreshness}` : ""}
                  </p>
                </div>
                <span className="at-badge">{s.status}</span>
              </div>
              <p className="text-[0.75rem] font-bold text-[var(--at-text)]">
                {cleanCopy(s.summary)}
              </p>
              <div className="flex items-center justify-between text-[0.75rem]">
                <span>
                  Alignment <strong>{s.confidence}</strong>
                  {s.insufficientHistory ? ", incomplete history" : ""}
                </span>
                <span className="font-bold text-[var(--at-text)]">
                  {formatCompactTime(s.generatedAt, { seconds: true })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!loading && filtered.length === 0 ? (
        <p className="text-[0.8125rem] font-bold text-[var(--at-text)]">
          No signals for these filters.
        </p>
      ) : null}

      {errors.length > 0 ? (
        <div className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">Data issues</h2>
          </div>
          <ul className="at-card-body space-y-1 text-[0.75rem] font-bold text-[var(--at-text)]">
            {errors.map((e) => (
              <li key={e.symbol}>
                {e.symbol}: {cleanCopy(e.message)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {disclosure ? (
        <p className="text-[0.7rem] font-bold text-[var(--at-text)]">{disclosure}</p>
      ) : null}

      <RiskDisclosure />
    </div>
  );
}

function biasClass(bias: SignalBias): string {
  if (bias === "Bullish") return "at-up";
  if (bias === "Bearish") return "at-down";
  return "font-bold text-[var(--at-text)]";
}
