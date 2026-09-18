"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CandleChart } from "../charts/CandleChart";
import { annytradeRoutes } from "../../lib/routes";
import {
  cleanCopy,
  formatCompactTime,
  formatLiveAge,
  formatPrice,
} from "../../lib/format";
import { computeChartIndicators } from "../../lib/indicators";
import { DEFAULT_CHART_PREFS } from "../../lib/chart-prefs";
import { useCandles } from "../../hooks/useCandles";
import {
  signalsClient,
  type AnalysisSignalDto,
} from "../../services/signals-client";
import type { CandleInterval } from "../../services/market-client";

const LIVE_POLL_MS = 15_000;

export function SignalDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [signal, setSignal] = useState<AnalysisSignalDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load(silent: boolean) {
      if (!silent) setLoading(true);
      try {
        const res = await signalsClient.get(id);
        if (cancelled) return;
        setSignal(res.signal);
        setError(null);
        setNowTick(Date.now());
        if (res.signal.id !== id) {
          router.replace(annytradeRoutes.signal(res.signal.id));
        }
      } catch (err) {
        if (cancelled) return;
        // Bar may have rolled; try listing same symbol from path decode is server-side.
        // Fall back to list page messaging.
        setSignal(null);
        setError(err instanceof Error ? err.message : "Signal unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load(false);
    const timer = window.setInterval(() => void load(true), LIVE_POLL_MS);
    const tick = window.setInterval(() => setNowTick(Date.now()), 1_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.clearInterval(tick);
    };
  }, [id, router]);

  const interval = (signal?.interval ?? "1h") as CandleInterval;
  const {
    candles,
    loading: candleLoading,
    error: candleError,
    empty,
  } = useCandles(signal?.symbol ?? "", interval, 120);

  const indicators = useMemo(
    () => (candles.length >= 20 ? computeChartIndicators(candles) : null),
    [candles],
  );

  if (loading && !signal) {
    return (
      <p className="text-[0.8125rem] font-bold text-[var(--at-text)]">
        Loading live signal…
      </p>
    );
  }

  if (error || !signal) {
    return (
      <div className="at-card">
        <div className="at-card-body py-12 text-center">
          <p className="font-semibold">Signal unavailable</p>
          <p className="mt-2 text-[0.8125rem] font-bold text-[var(--at-text)]">
            {cleanCopy(error ?? "Not found")}
          </p>
          <Link
            href={annytradeRoutes.signals}
            className="at-btn at-btn-primary mt-4"
          >
            Back to signals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={annytradeRoutes.signals}
        className="text-[0.8125rem] font-bold text-[var(--at-accent)]"
      >
        All signals
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="at-label">
            LIVE, updated {formatLiveAge(signal.generatedAt, nowTick)},{" "}
            {signal.interval}, {signal.dataFreshness}
          </p>
          <h1
            className="text-2xl font-semibold tracking-normal"
            style={{ fontFamily: "var(--at-font-sans)" }}
          >
            {signal.symbol}{" "}
            <span
              className={
                signal.bias === "Bullish"
                  ? "at-up"
                  : signal.bias === "Bearish"
                    ? "at-down"
                    : "font-bold text-[var(--at-text)]"
              }
            >
              {signal.bias}
            </span>
          </h1>
          <p className="mt-1 text-[0.8125rem] font-bold text-[var(--at-text)]">
            {cleanCopy(signal.title)}
          </p>
        </div>
        <span className="at-badge">{signal.status}</span>
      </div>

      <p
        className="rounded-[8px] border px-3 py-2 text-[0.75rem] font-bold text-[var(--at-text)]"
        style={{ borderColor: "var(--at-border)" }}
      >
        {cleanCopy(signal.disclosure)}
      </p>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="at-card overflow-hidden">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">
              Price context ({signal.interval})
            </h2>
          </div>
          <CandleChart
            symbol={signal.symbol}
            candles={candles}
            loading={candleLoading}
            error={candleError}
            empty={empty}
            lastPrice={signal.inputs.close as number | null}
            indicators={indicators}
            flags={{
              ...DEFAULT_CHART_PREFS.indicators,
              atr: false,
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="at-card">
            <div className="at-card-header">
              <h2 className="text-sm font-semibold">Why this signal</h2>
            </div>
            <ul className="at-card-body space-y-2 text-[0.8125rem]">
              {signal.reasons.map((r) => (
                <li key={r.code}>
                  <span className="at-label">{r.label}</span>
                  <p className="mt-0.5 font-bold text-[var(--at-text)]">
                    {cleanCopy(r.detail)}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="at-card">
            <div className="at-card-header">
              <h2 className="text-sm font-semibold">Inputs and lifecycle</h2>
            </div>
            <div className="at-card-body grid grid-cols-2 gap-2 text-[0.75rem]">
              <Row label="Alignment score" value={`${signal.confidence}`} />
              <Row label="Status" value={signal.status} />
              <Row
                label="Generated"
                value={formatCompactTime(signal.generatedAt, { seconds: true })}
              />
              <Row
                label="Expires"
                value={formatCompactTime(signal.expiresAt, { seconds: true })}
              />
              <Row
                label="Close"
                value={
                  signal.inputs.close != null
                    ? formatPrice(Number(signal.inputs.close))
                    : "n/a"
                }
              />
              <Row
                label="RSI14"
                value={
                  signal.inputs.rsi14 != null
                    ? Number(signal.inputs.rsi14).toFixed(1)
                    : "n/a"
                }
              />
              <Row
                label="EMA20"
                value={
                  signal.inputs.ema20 != null
                    ? formatPrice(Number(signal.inputs.ema20))
                    : "n/a"
                }
              />
              <Row
                label="EMA50"
                value={
                  signal.inputs.ema50 != null
                    ? formatPrice(Number(signal.inputs.ema50))
                    : "n/a"
                }
              />
              <Row
                label="MACD hist"
                value={
                  signal.inputs.macdHist != null
                    ? Math.abs(Number(signal.inputs.macdHist)).toFixed(4)
                    : "n/a"
                }
              />
              <Row label="Candles" value={`${signal.candleCount}`} />
            </div>
            <p
              className="border-t px-4 py-3 text-[0.65rem] font-bold text-[var(--at-text)]"
              style={{ borderColor: "var(--at-border)" }}
            >
              {cleanCopy(signal.confidenceMethod)}
            </p>
          </div>

          <Link
            href={`${annytradeRoutes.trade(signal.symbol)}?side=${
              signal.bias === "Bearish" ? "SELL" : "BUY"
            }&fromSignal=1`}
            className="at-btn at-btn-primary w-full justify-center"
          >
            Apply bias to PAPER trade · {signal.symbol}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="at-label">{label}</p>
      <p className="mt-0.5 font-bold text-[var(--at-text)]">{value}</p>
    </div>
  );
}
