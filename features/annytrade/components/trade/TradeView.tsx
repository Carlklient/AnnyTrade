"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CandleChart } from "../charts/CandleChart";
import { NewsView } from "../news/NewsView";
import { SymbolAlertsPanel } from "../alerts/SymbolAlertsPanel";
import { InstrumentsRail } from "./InstrumentsRail";
import { SpaceRail } from "./SpaceRail";
import { annytradeApi } from "../../services/api";
import { annytradeRoutes } from "../../lib/routes";
import {
  formatCompactTime,
  formatMoney,
  formatPct,
  formatPrice,
  pnlClass,
} from "../../lib/format";
import { computeChartIndicators } from "../../lib/indicators";
import {
  DEFAULT_CHART_PREFS,
  loadChartPrefs,
  saveChartPrefs,
  type ChartIndicatorFlags,
} from "../../lib/chart-prefs";
import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { useInstrument } from "../../hooks/useInstrument";
import { useQuote } from "../../hooks/useQuotes";
import { useCandles } from "../../hooks/useCandles";
import {
  freshnessLabel,
  num,
  type CandleInterval,
} from "../../services/market-client";
import {
  newIdempotencyKey,
  paperTradingClient,
} from "../../services/paper-client";
import type { PublicOrder, PublicPosition } from "../../types/backend";

const TIMEFRAMES: { id: string; interval: CandleInterval; limit: number }[] = [
  { id: "1D", interval: "5m", limit: 78 },
  { id: "5D", interval: "15m", limit: 130 },
  { id: "1M", interval: "1h", limit: 160 },
  { id: "3M", interval: "1d", limit: 90 },
  { id: "6M", interval: "1d", limit: 130 },
  { id: "1Y", interval: "1d", limit: 260 },
  { id: "M1", interval: "1m", limit: 120 },
  { id: "H1", interval: "1h", limit: 120 },
  { id: "D1", interval: "1d", limit: 120 },
];

type TradeViewProps = { symbol: string };
type PanelTab =
  "positions" | "pending" | "history" | "details" | "news" | "alerts";
type TicketType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
type TicketSide = "BUY" | "SELL";

function formatTs(iso: string | null): string {
  if (!iso) return "n/a";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function TradeView({ symbol }: TradeViewProps) {
  const { auth } = useAnnyTrade();
  const sym = symbol.toUpperCase();
  const {
    instrument,
    loading: instLoading,
    error: instError,
    notFound,
  } = useInstrument(sym);
  const { quote, loading: quoteLoading, error: quoteError } = useQuote(sym);
  const [prefsReady, setPrefsReady] = useState(false);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[2]!);
  const [indicatorFlags, setIndicatorFlags] = useState<ChartIndicatorFlags>(
    DEFAULT_CHART_PREFS.indicators,
  );
  const {
    candles,
    loading: candleLoading,
    error: candleError,
    empty,
  } = useCandles(sym, timeframe.interval, timeframe.limit);

  const book = annytradeApi.getOrderBook(sym);
  const demoAsset = annytradeApi.getAsset(sym);
  const demoPriceData = annytradeApi.getPriceData(sym);

  const [side, setSide] = useState<TicketSide>("BUY");
  const [orderType, setOrderType] = useState<TicketType>("MARKET");
  const [size, setSize] = useState(1);
  const [limitPrice, setLimitPrice] = useState(0);
  const [stopPrice, setStopPrice] = useState(0);
  const [panel, setPanel] = useState<PanelTab>("positions");
  const [showIndicators, setShowIndicators] = useState(false);

  useEffect(() => {
    const prefs = loadChartPrefs();
    const tf =
      TIMEFRAMES.find((t) => t.id === prefs.timeframeId) ?? TIMEFRAMES[2]!;
    setTimeframe(tf);
    setIndicatorFlags(prefs.indicators);
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    saveChartPrefs({ timeframeId: timeframe.id, indicators: indicatorFlags });
  }, [prefsReady, timeframe.id, indicatorFlags]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [availableCash, setAvailableCash] = useState<number | null>(null);
  const [paperCurrency, setPaperCurrency] = useState("USD");
  const [positions, setPositions] = useState<PublicPosition[]>([]);
  const [orders, setOrders] = useState<PublicOrder[]>([]);

  const demoFallback = Boolean(notFound && demoAsset && demoPriceData);
  const chartCandles = demoFallback ? demoPriceData!.candles : candles;
  const indicatorBundle = useMemo(
    () =>
      chartCandles.length >= 20 ? computeChartIndicators(chartCandles) : null,
    [chartCandles],
  );
  const last = demoFallback ? demoAsset!.price : num(quote?.last);
  const bid = demoFallback ? demoAsset!.bid : (num(quote?.bid) ?? last);
  const ask = demoFallback ? demoAsset!.ask : (num(quote?.ask) ?? last);
  const changePct = demoFallback
    ? demoAsset!.changePct
    : (num(quote?.changePercent) ?? 0);
  const high = demoFallback ? demoAsset!.high : num(quote?.high);
  const low = demoFallback ? demoAsset!.low : num(quote?.low);

  useEffect(() => {
    if (last != null) {
      setLimitPrice(last);
      setStopPrice(last);
    }
  }, [last]);

  const refreshPaper = useCallback(async () => {
    if (!auth.authenticated) {
      setPositions([]);
      setOrders([]);
      setAvailableCash(null);
      return;
    }
    try {
      const [summary, orderRes] = await Promise.all([
        paperTradingClient.summary(),
        paperTradingClient.listOrders(),
      ]);
      setAvailableCash(summary.availableCash);
      setPaperCurrency(summary.currency);
      setPositions(summary.positions.filter((p) => p.symbol === sym));
      setOrders(orderRes.orders.filter((o) => o.symbol === sym));
    } catch {
      // guest / error
    }
  }, [auth.authenticated, sym]);

  useEffect(() => {
    void refreshPaper();
  }, [refreshPaper]);

  const estPrice =
    orderType === "LIMIT"
      ? limitPrice
      : orderType === "STOP" || orderType === "STOP_LIMIT"
        ? stopPrice || limitPrice
        : side === "BUY"
          ? (ask ?? last ?? 0)
          : (bid ?? last ?? 0);
  const estimatedValue = Number((estPrice * size).toFixed(2));

  async function submit(nextSide: TicketSide) {
    setSide(nextSide);
    setMessage(null);
    setErrorMsg(null);
    if (!auth.authenticated) {
      setErrorMsg("Sign in to place PAPER orders.");
      return;
    }
    if (demoFallback) {
      setErrorMsg("Symbol not in Phase 2 market catalog. Cannot paper trade.");
      return;
    }
    if (size <= 0) {
      setErrorMsg("Quantity must be positive.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await paperTradingClient.submitOrder({
        symbol: sym,
        side: nextSide,
        orderType,
        quantity: size,
        limitPrice:
          orderType === "LIMIT" || orderType === "STOP_LIMIT"
            ? limitPrice
            : null,
        stopPrice:
          orderType === "STOP" || orderType === "STOP_LIMIT" ? stopPrice : null,
        idempotencyKey: newIdempotencyKey(),
      });
      const o = result.order;
      setMessage(
        result.replayed
          ? `Idempotent replay. Order ${o.status}`
          : `PAPER ${o.side} ${o.orderType} ${o.status}${
              o.rejectReason ? `: ${o.rejectReason}` : ""
            }`,
      );
      await refreshPaper();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelOrder(id: string) {
    try {
      await paperTradingClient.cancelOrder(id);
      await refreshPaper();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  if (instLoading && !instrument) {
    return (
      <div className="at-terminal">
        <InstrumentsRail activeSymbol={sym} />
        <div className="at-terminal-center">
          <div className="at-card">
            <div className="at-card-body py-16 text-center text-[0.8125rem] font-bold text-[#020617]">
              Loading instrument…
            </div>
          </div>
        </div>
        <SpaceRail symbol={sym} />
      </div>
    );
  }

  if (
    (notFound && !demoFallback) ||
    (!instrument && !instLoading && !demoFallback)
  ) {
    return (
      <div className="at-card">
        <div className="at-card-body py-16 text-center">
          <p className="font-semibold">Instrument unavailable</p>
          <p className="mt-1 text-[0.8125rem] font-bold text-[#020617]">
            Symbol â€œ{sym}â€ was not found in the market-data catalog.
          </p>
          <Link
            href={annytradeRoutes.markets}
            className="at-btn at-btn-primary mt-4"
          >
            Back to markets
          </Link>
        </div>
      </div>
    );
  }

  if (instError && !demoFallback) {
    return (
      <div className="at-card">
        <div className="at-card-body py-16 text-center">
          <p className="font-semibold">Market data error</p>
          <p className="mt-1 text-[0.8125rem] font-bold text-[#020617]">
            {instError}
          </p>
        </div>
      </div>
    );
  }

  const sessionClosed = demoFallback
    ? demoAsset!.status === "closed"
    : quote?.marketStatus === "closed";
  const freshness = demoFallback ? "DEMO" : (quote?.freshness ?? "UNAVAILABLE");
  const marketStatusForUI = demoFallback
    ? demoAsset!.status === "closed"
      ? "closed"
      : "regular"
    : quote?.marketStatus;
  const delayText =
    !demoFallback && quote?.delayMinutes != null
      ? `, Delayed ${quote.delayMinutes} min`
      : "";

  const openOrders = orders.filter((o) =>
    ["PENDING", "OPEN", "PARTIALLY_FILLED"].includes(o.status),
  );
  const historyOrders = orders;

  return (
    <div className="at-terminal">
      <InstrumentsRail activeSymbol={sym} />
      <div className="at-terminal-center space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="at-label capitalize">
              PAPER{" "}
              {demoFallback
                ? demoAsset!.class
                : (instrument?.assetClass ?? "n/a")}{" "}
              {marketStatusForUI ?? "…"} {freshnessLabel(freshness)}
              {delayText}
            </p>
            <h1
              className="flex flex-wrap items-baseline gap-3 text-xl font-semibold tracking-[-0.03em] sm:text-2xl"
              style={{ fontFamily: "var(--at-font-display)" }}
            >
              {demoFallback
                ? demoAsset!.symbol
                : (instrument?.displaySymbol ?? sym)}
              <span
                className={`at-mono text-lg ${last != null ? pnlClass(changePct) : ""}`}
                aria-live="off"
              >
                {quoteLoading && last == null
                  ? "…"
                  : last != null
                    ? formatPrice(last)
                    : "n/a"}
              </span>
              <span className={`at-mono text-sm ${pnlClass(changePct)}`}>
                {formatPct(changePct)}
              </span>
            </h1>
            <p className="mt-1 text-[0.8125rem] font-bold text-[#020617]">
              {demoFallback ? demoAsset!.name : instrument?.name}
              {!demoFallback && quote?.timestamp ? (
                <span className="ml-2 font-bold text-[#020617]">
                  Updated {formatTs(quote.timestamp)}
                </span>
              ) : null}
            </p>
            {!demoFallback && quoteError ? (
              <p className="mt-1 text-[0.75rem] text-[var(--at-sell)]">
                Quote: {quoteError}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-[0.75rem]">
            <Meta label="Bid" value={bid != null ? formatPrice(bid) : "n/a"} />
            <Meta label="Ask" value={ask != null ? formatPrice(ask) : "n/a"} />
            <Meta
              label="Spread"
              value={
                bid != null && ask != null ? formatPrice(ask - bid) : "n/a"
              }
            />
            <Meta
              label="High"
              value={high != null ? formatPrice(high) : "n/a"}
            />
            <Meta label="Low" value={low != null ? formatPrice(low) : "n/a"} />
          </div>
        </div>

        <div className="at-term-exec">
          <button
            type="button"
            className="at-term-exec-sell"
            disabled={submitting || demoFallback}
            onClick={() => void submit("SELL")}
          >
            <span>Sell</span>
            <span className="at-mono">
              {bid != null ? formatPrice(bid) : "n/a"}
            </span>
          </button>
          <label className="at-term-qty">
            <span className="sr-only">Quantity</span>
            <input
              type="number"
              min={1}
              step={1}
              value={size}
              onChange={(e) => setSize(Number(e.target.value) || 1)}
            />
          </label>
          <button
            type="button"
            className="at-term-exec-buy"
            disabled={submitting || demoFallback}
            onClick={() => void submit("BUY")}
          >
            <span>Buy</span>
            <span className="at-mono">
              {ask != null ? formatPrice(ask) : "n/a"}
            </span>
          </button>
        </div>

        <div
          className="rounded-[8px] border px-3 py-2 text-[0.8125rem]"
          style={{
            borderColor: "var(--at-border-strong)",
            background: "var(--at-surface-2)",
          }}
        >
          <strong>PAPER TRADING</strong> , simulated fills only. Not real
          brokerage or live execution.
          {demoFallback
            ? " Real market-data catalog miss. Showing demo candles; paper orders disabled."
            : ""}
          {sessionClosed ? " Session marked closed." : null}
        </div>

        {message ? (
          <div
            className="rounded-[8px] border px-3 py-2 text-[0.8125rem]"
            style={{
              borderColor:
                "color-mix(in srgb, var(--at-buy) 40%, var(--at-border))",
              background: "var(--at-buy-muted)",
            }}
          >
            {message}
          </div>
        ) : null}
        {errorMsg ? (
          <div
            className="rounded-[8px] border px-3 py-2 text-[0.8125rem]"
            style={{
              borderColor:
                "color-mix(in srgb, var(--at-sell) 40%, var(--at-border))",
              background: "var(--at-sell-muted)",
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <div className="at-card min-w-0">
            <div className="at-card-header flex-wrap">
              <div className="flex flex-wrap gap-1">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className="at-btn h-8 px-2.5 text-[0.7rem]"
                    style={
                      timeframe.id === tf.id
                        ? {
                            background: "var(--at-surface-3)",
                            color: "var(--at-text)",
                          }
                        : {
                            background: "transparent",
                            color: "var(--at-text-muted)",
                            border: "1px solid transparent",
                          }
                    }
                  >
                    {tf.id}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="at-btn at-btn-ghost h-8"
                onClick={() => setShowIndicators((v) => !v)}
              >
                Indicators
              </button>
            </div>
            {showIndicators ? (
              <div
                className="flex flex-wrap gap-2 border-b px-4 py-2 text-[0.7rem]"
                style={{ borderColor: "var(--at-border)" }}
              >
                {(
                  [
                    ["sma20", "SMA20"],
                    ["sma50", "SMA50"],
                    ["ema20", "EMA20"],
                    ["ema50", "EMA50"],
                    ["bb", "BB"],
                    ["rsi", "RSI"],
                    ["macd", "MACD"],
                    ["atr", "ATR"],
                    ["volume", "Vol"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="at-badge"
                    style={
                      indicatorFlags[key]
                        ? {
                            background: "var(--at-accent-muted)",
                            color: "var(--at-text)",
                          }
                        : undefined
                    }
                    onClick={() =>
                      setIndicatorFlags((f) => ({ ...f, [key]: !f[key] }))
                    }
                  >
                    {label}
                  </button>
                ))}
                <span className="font-bold text-[#020617]">
                  Deterministic overlays, prefs saved locally
                </span>
              </div>
            ) : null}
            <CandleChart
              candles={chartCandles}
              loading={demoFallback ? false : candleLoading}
              error={demoFallback ? null : candleError}
              empty={demoFallback ? false : empty}
              lastPrice={last}
              indicators={indicatorBundle}
              flags={indicatorFlags}
            />
          </div>

          <div className="space-y-4">
            <div className="at-card">
              <div className="at-card-header">
                <h2 className="text-sm font-semibold">Order book</h2>
                <span className="at-label">Preview</span>
              </div>
              <div className="at-card-body space-y-3 pt-2">
                <p className="text-[0.65rem] font-bold text-[#020617]">
                  Depth is illustrative preview, not live exchange depth.
                </p>
                {book ? (
                  <>
                    <DepthSide
                      levels={book.asks.slice().reverse()}
                      tone="sell"
                    />
                    <div className="at-mono py-1 text-center text-sm font-semibold">
                      {last != null ? formatPrice(last) : "n/a"}
                    </div>
                    <DepthSide levels={book.bids} tone="buy" />
                  </>
                ) : (
                  <p className="text-[0.8125rem] font-bold text-[#020617]">
                    No preview depth for this symbol.
                  </p>
                )}
              </div>
            </div>

            <div className="at-card">
              <div className="at-card-header">
                <h2 className="text-sm font-semibold">PAPER order ticket</h2>
                <span className="at-badge">PAPER</span>
              </div>
              <div className="at-card-body space-y-3">
                <div
                  className="grid grid-cols-2 gap-1 rounded-[8px] border p-0.5 sm:grid-cols-4"
                  style={{ borderColor: "var(--at-border)" }}
                >
                  {(
                    [
                      ["MARKET", "Market"],
                      ["LIMIT", "Limit"],
                      ["STOP", "Stop"],
                      ["STOP_LIMIT", "Stop-L"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setOrderType(id)}
                      className="rounded-[6px] py-1.5 text-[0.65rem] font-semibold"
                      style={
                        orderType === id
                          ? {
                              background: "var(--at-surface-3)",
                              color: "var(--at-text)",
                            }
                          : { color: "var(--at-text-muted)" }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {orderType === "LIMIT" || orderType === "STOP_LIMIT" ? (
                  <Field
                    label="Limit price"
                    value={limitPrice}
                    onChange={(v) => {
                      if (typeof v === "number") setLimitPrice(v);
                    }}
                  />
                ) : null}
                {orderType === "STOP" || orderType === "STOP_LIMIT" ? (
                  <Field
                    label="Stop trigger"
                    value={stopPrice}
                    onChange={(v) => {
                      if (typeof v === "number") setStopPrice(v);
                    }}
                  />
                ) : null}

                <Field
                  label="Quantity (shares)"
                  value={size}
                  onChange={(v) => {
                    if (typeof v === "number") setSize(v);
                  }}
                  step={1}
                />

                <div className="grid grid-cols-2 gap-2 text-[0.75rem]">
                  <div
                    className="rounded-[8px] border p-2.5"
                    style={{
                      borderColor: "var(--at-border)",
                      background: "var(--at-bg-elevated)",
                    }}
                  >
                    <p className="at-label">Est. value</p>
                    <p className="at-mono mt-1 font-semibold">
                      {formatMoney(estimatedValue, paperCurrency)}
                    </p>
                  </div>
                  <div
                    className="rounded-[8px] border p-2.5"
                    style={{
                      borderColor: "var(--at-border)",
                      background: "var(--at-bg-elevated)",
                    }}
                  >
                    <p className="at-label">Available PAPER cash</p>
                    <p className="at-mono mt-1 font-semibold">
                      {availableCash == null
                        ? auth.authenticated
                          ? "…"
                          : "Sign in"
                        : formatMoney(availableCash, paperCurrency)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    className="at-btn at-btn-buy h-10"
                    disabled={submitting || demoFallback}
                    onClick={() => void submit("BUY")}
                  >
                    Buy {ask != null ? formatPrice(ask) : ""}
                  </button>
                  <button
                    type="button"
                    className="at-btn at-btn-sell h-10"
                    disabled={submitting || demoFallback}
                    onClick={() => void submit("SELL")}
                  >
                    Sell {bid != null ? formatPrice(bid) : ""}
                  </button>
                </div>
                <p className="text-[0.65rem] leading-relaxed font-bold text-[#020617]">
                  Fills use server market data (buyâ†’ask / sellâ†’bid).
                  Long-only. No margin.
                  {!auth.authenticated ? " Sign in required." : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="at-card">
          <div
            className="flex gap-1 overflow-x-auto border-b px-2"
            style={{ borderColor: "var(--at-border)" }}
          >
            {(
              [
                ["positions", "Open positions"],
                ["pending", "Open orders"],
                ["history", "Order history"],
                ["news", "News"],
                ["alerts", "Alerts"],
                ["details", "Asset details"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPanel(id)}
                className="shrink-0 border-b-2 px-3 py-2.5 text-[0.8125rem] font-medium"
                style={{
                  borderColor:
                    panel === id ? "var(--at-accent)" : "transparent",
                  color:
                    panel === id ? "var(--at-text)" : "var(--at-text-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="at-card-body">
            {!auth.authenticated &&
            panel !== "details" &&
            panel !== "news" &&
            panel !== "alerts" ? (
              <p className="text-[0.8125rem] font-bold text-[#020617]">
                Sign in to view PAPER positions and orders.{" "}
                <Link
                  href={annytradeRoutes.auth.login}
                  className="text-[var(--at-accent)]"
                >
                  Login
                </Link>
              </p>
            ) : null}
            {panel === "positions" && auth.authenticated ? (
              positions.length === 0 ? (
                <p className="text-[0.8125rem] font-bold text-[#020617]">
                  No open PAPER position on this symbol.
                </p>
              ) : (
                <SimpleTable
                  headers={["Qty", "Avg entry", "Mark", "P&L", "Opened"]}
                  rows={positions.map((p) => [
                    String(p.quantity),
                    formatPrice(p.averageEntry),
                    p.markPrice != null ? formatPrice(p.markPrice) : "n/a",
                    p.unrealizedPnl != null
                      ? formatMoney(p.unrealizedPnl, paperCurrency, {
                          signed: true,
                        })
                      : "n/a",
                    formatCompactTime(p.openedAt),
                  ])}
                />
              )
            ) : null}
            {panel === "pending" && auth.authenticated ? (
              openOrders.length === 0 ? (
                <p className="text-[0.8125rem] font-bold text-[#020617]">
                  No open PAPER orders.
                </p>
              ) : (
                <div className="space-y-2">
                  {openOrders.map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0"
                      style={{ borderColor: "var(--at-border)" }}
                    >
                      <div className="text-[0.8125rem]">
                        <span className="font-semibold">
                          {o.side} {o.orderType}
                        </span>{" "}
                        , qty {o.quantity}
                        {o.limitPrice != null
                          ? `, lim ${formatPrice(o.limitPrice)}`
                          : ""}
                        {o.stopPrice != null
                          ? `, stop ${formatPrice(o.stopPrice)}`
                          : ""}
                        <span className="at-badge ml-2">{o.status}</span>
                      </div>
                      <button
                        type="button"
                        className="at-btn at-btn-ghost h-8"
                        onClick={() => void cancelOrder(o.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : null}
            {panel === "history" && auth.authenticated ? (
              <SimpleTable
                headers={["Type", "Side", "Status", "Qty", "Avg", "Time"]}
                rows={historyOrders.map((o) => [
                  o.orderType,
                  o.side,
                  o.status,
                  String(o.quantity),
                  o.averageFillPrice != null
                    ? formatPrice(o.averageFillPrice)
                    : "n/a",
                  formatCompactTime(o.submittedAt),
                ])}
              />
            ) : null}
            {panel === "details" ? (
              <div className="grid gap-3 text-[0.8125rem] sm:grid-cols-2">
                <Detail
                  label="Asset class"
                  value={
                    demoFallback
                      ? demoAsset!.class
                      : (instrument?.assetClass ?? "n/a")
                  }
                />
                <Detail
                  label="Exchange"
                  value={demoFallback ? "n/a" : (instrument?.exchange ?? "n/a")}
                />
                <Detail
                  label="Currency"
                  value={demoFallback ? "n/a" : (instrument?.currency ?? "n/a")}
                />
                <Detail
                  label="Timezone"
                  value={demoFallback ? "n/a" : (instrument?.timezone ?? "n/a")}
                />
                <Detail
                  label="Market status"
                  value={
                    demoFallback
                      ? demoAsset!.status === "closed"
                        ? "closed"
                        : "regular"
                      : (quote?.marketStatus ?? "n/a")
                  }
                />
                <Detail label="Freshness" value={freshnessLabel(freshness)} />
              </div>
            ) : null}
            {panel === "news" ? <NewsView symbolFilter={sym} /> : null}
            {panel === "alerts" ? (
              <SymbolAlertsPanel symbol={sym} lastPrice={last} />
            ) : null}
          </div>
        </div>
      </div>
      <SpaceRail symbol={sym} />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[8px] border px-2.5 py-1.5"
      style={{
        borderColor: "var(--at-border)",
        background: "var(--at-surface)",
      }}
    >
      <span className="at-label mr-2">{label}</span>
      <span className="at-mono font-medium">{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 0.0001,
}: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  step?: number;
}) {
  return (
    <label className="block text-[0.75rem]">
      <span className="at-label mb-1 block">{label}</span>
      <input
        className="at-input at-mono"
        type="number"
        step={step}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? "" : Number(raw));
        }}
      />
    </label>
  );
}

function DepthSide({
  levels,
  tone,
}: {
  levels: { price: number; size: number; total: number }[];
  tone: "buy" | "sell";
}) {
  const max = Math.max(...levels.map((l) => l.total), 1);
  return (
    <ul className="space-y-1">
      {levels.map((l) => (
        <li
          key={l.price}
          className="relative grid grid-cols-3 gap-2 px-1 py-0.5 text-[0.7rem]"
        >
          <span
            className="absolute inset-y-0 right-0 rounded-sm opacity-30"
            style={{
              width: `${(l.total / max) * 100}%`,
              background: tone === "buy" ? "var(--at-buy)" : "var(--at-sell)",
            }}
          />
          <span
            className={`at-mono relative ${tone === "buy" ? "at-up" : "at-down"}`}
          >
            {formatPrice(l.price)}
          </span>
          <span className="at-mono relative text-right font-bold text-[#020617]">
            {l.size}
          </span>
          <span className="at-mono relative text-right font-bold text-[#020617]">
            {l.total}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-[0.8125rem]">
        <thead>
          <tr className="font-bold text-[#020617]">
            {headers.map((h) => (
              <th key={h} className="pb-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t"
              style={{ borderColor: "var(--at-border)" }}
            >
              {row.map((cell, j) => (
                <td key={j} className="at-mono py-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[8px] border p-3 capitalize"
      style={{
        borderColor: "var(--at-border)",
        background: "var(--at-bg-elevated)",
      }}
    >
      <p className="at-label">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
