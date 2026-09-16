"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

import { Sparkline } from "../charts/Sparkline";
import { annytradeRoutes } from "../../lib/routes";
import { formatPct, formatPrice, pnlClass } from "../../lib/format";
import { useInstrumentSearch } from "../../hooks/useInstrumentSearch";
import { useMarketMeta } from "../../hooks/useMarketMeta";
import { useQuotes } from "../../hooks/useQuotes";
import {
  freshnessLabel,
  marketClient,
  num,
  type Instrument,
  type Quote,
} from "../../services/market-client";

type Tab =
  | "all"
  | "equity"
  | "forex"
  | "etf"
  | "crypto"
  | "commodities"
  | "indices"
  | "gainers"
  | "losers";

const TABS: { id: Tab; label: string; supported: boolean }[] = [
  { id: "all", label: "All", supported: true },
  { id: "equity", label: "Stocks", supported: true },
  { id: "forex", label: "Forex", supported: true },
  { id: "etf", label: "ETFs", supported: true },
  { id: "crypto", label: "Crypto", supported: false },
  { id: "indices", label: "Indices", supported: false },
  { id: "commodities", label: "Commodities", supported: false },
  { id: "gainers", label: "Gainers", supported: true },
  { id: "losers", label: "Losers", supported: true },
];

const DEFAULT_SYMBOLS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "SPY",
  "EURUSD",
  "GBPUSD",
];

type Row = {
  instrument: Instrument;
  quote: Quote | null;
};

export function MarketsView() {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [baseInstruments, setBaseInstruments] = useState<Instrument[]>([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseError, setBaseError] = useState<string | null>(null);

  const { data: metaData } = useMarketMeta();
  const {
    instruments: searchHits,
    loading: searchLoading,
    error: searchError,
  } = useInstrumentSearch(query);

  useEffect(() => {
    let cancelled = false;
    setBaseLoading(true);
    Promise.all(
      DEFAULT_SYMBOLS.map((s) =>
        marketClient
          .instrument(s)
          .then((r) => r.instrument)
          .catch(() => null),
      ),
    )
      .then((list) => {
        if (!cancelled) {
          setBaseInstruments(list.filter(Boolean) as Instrument[]);
          setBaseError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setBaseError(err.message);
      })
      .finally(() => {
        if (!cancelled) setBaseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeInstruments = useMemo(() => {
    if (query.trim().length >= 1) return searchHits;
    return baseInstruments;
  }, [query, searchHits, baseInstruments]);

  const symbols = activeInstruments.map((i) => i.symbol);
  const {
    quotes,
    loading: quotesLoading,
    error: quotesError,
  } = useQuotes(symbols);

  const quoteMap = useMemo(() => {
    const m = new Map<string, Quote>();
    for (const q of quotes) m.set(q.symbol, q);
    return m;
  }, [quotes]);

  const rows: Row[] = useMemo(() => {
    let list = activeInstruments.map((instrument) => ({
      instrument,
      quote: quoteMap.get(instrument.symbol) ?? null,
    }));

    if (tab === "crypto" || tab === "commodities" || tab === "indices") {
      return [];
    }
    if (tab === "equity" || tab === "forex" || tab === "etf") {
      list = list.filter((r) => r.instrument.assetClass === tab);
    }
    if (tab === "gainers") {
      list = list
        .filter((r) => (num(r.quote?.changePercent) ?? 0) > 0)
        .sort(
          (a, b) =>
            (num(b.quote?.changePercent) ?? 0) -
            (num(a.quote?.changePercent) ?? 0),
        );
    }
    if (tab === "losers") {
      list = list
        .filter((r) => (num(r.quote?.changePercent) ?? 0) < 0)
        .sort(
          (a, b) =>
            (num(a.quote?.changePercent) ?? 0) -
            (num(b.quote?.changePercent) ?? 0),
        );
    }
    return list;
  }, [activeInstruments, quoteMap, tab]);

  const unsupported =
    tab === "crypto" || tab === "commodities" || tab === "indices";
  const loading = baseLoading || (query.trim() ? searchLoading : false);
  const freshness = metaData
    ? freshnessLabel(metaData.meta.freshnessDefault)
    : "…";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="at-label">
            Instruments, Market Data {freshness}
            {metaData?.credentials.credentialRequired
              ? ", credential required for live feed"
              : ""}
          </p>
          <h1
            className="text-2xl font-semibold tracking-[-0.03em]"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            Markets
          </h1>
        </div>
        <input
          className="at-input max-w-xs"
          placeholder="Search symbol or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search instruments"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="at-btn shrink-0"
            style={
              tab === t.id
                ? {
                    background: "var(--at-accent-muted)",
                    color: "var(--at-text)",
                    border:
                      "1px solid color-mix(in srgb, var(--at-accent) 40%, var(--at-border))",
                  }
                : {
                    background: "transparent",
                    color: "var(--at-text-secondary)",
                    border: "1px solid var(--at-border)",
                  }
            }
          >
            {t.label}
            {!t.supported ? ", n/a" : ""}
          </button>
        ))}
      </div>

      {unsupported ? (
        <div className="at-card">
          <div className="at-card-body py-10 text-center text-[0.8125rem] font-bold text-[#020617]">
            This asset class is not live in Phase 2. Scope is US equities / ETFs
            and major forex pairs. Crypto, indices, and commodities remain
            unavailable, not simulated as live.
          </div>
        </div>
      ) : (
        <div className="at-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-[0.8125rem]">
              <thead>
                <tr
                  className="border-b font-bold text-[#020617]"
                  style={{
                    borderColor: "var(--at-border)",
                    background: "var(--at-bg-elevated)",
                  }}
                >
                  <th className="w-10 px-3 py-3" />
                  <th className="px-3 py-3 font-medium">Symbol</th>
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Bid</th>
                  <th className="px-3 py-3 font-medium">Ask</th>
                  <th className="px-3 py-3 font-medium">Change %</th>
                  <th className="px-3 py-3 font-medium">High</th>
                  <th className="px-3 py-3 font-medium">Low</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Feed</th>
                  <th className="px-3 py-3 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ instrument, quote }) => {
                  const last = num(quote?.last);
                  const bid = num(quote?.bid);
                  const ask = num(quote?.ask);
                  const changePct = num(quote?.changePercent) ?? 0;
                  const high = num(quote?.high);
                  const low = num(quote?.low);
                  const fav = favorites[instrument.id];
                  const spark = quote
                    ? [
                        Number(quote.low ?? quote.last ?? 0),
                        Number(quote.open ?? quote.last ?? 0),
                        Number(quote.last ?? 0),
                        Number(quote.high ?? quote.last ?? 0),
                      ]
                    : [0, 0, 0, 0];
                  return (
                    <tr
                      key={instrument.id}
                      className="border-b transition-colors last:border-0 hover:bg-[var(--at-surface-2)]"
                      style={{ borderColor: "var(--at-border)" }}
                    >
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          aria-label={fav ? "Remove favorite" : "Add favorite"}
                          onClick={() =>
                            setFavorites((f) => ({
                              ...f,
                              [instrument.id]: !f[instrument.id],
                            }))
                          }
                          className="font-bold text-[#020617] hover:text-[var(--at-accent)]"
                        >
                          <Star
                            className="size-3.5"
                            fill={fav ? "var(--at-accent)" : "none"}
                            stroke={fav ? "var(--at-accent)" : "currentColor"}
                          />
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={annytradeRoutes.trade(instrument.symbol)}
                          className="font-semibold hover:text-[var(--at-accent)]"
                        >
                          {instrument.displaySymbol}
                        </Link>
                        <p className="text-[0.65rem] font-bold text-[#020617] capitalize">
                          {instrument.assetClass}
                        </p>
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-3 font-bold text-[#020617]">
                        {instrument.name}
                      </td>
                      <td
                        className="at-mono px-3 py-3 font-medium"
                        aria-live="off"
                      >
                        {last != null
                          ? formatPrice(last)
                          : quotesLoading
                            ? "…"
                            : "n/a"}
                      </td>
                      <td className="at-mono px-3 py-3 font-bold text-[#020617]">
                        {bid != null ? formatPrice(bid) : "n/a"}
                      </td>
                      <td className="at-mono px-3 py-3 font-bold text-[#020617]">
                        {ask != null ? formatPrice(ask) : "n/a"}
                      </td>
                      <td
                        className={`at-mono px-3 py-3 font-semibold ${pnlClass(changePct)}`}
                      >
                        {quote ? formatPct(changePct) : "n/a"}
                      </td>
                      <td className="at-mono px-3 py-3 font-bold text-[#020617]">
                        {high != null ? formatPrice(high) : "n/a"}
                      </td>
                      <td className="at-mono px-3 py-3 font-bold text-[#020617]">
                        {low != null ? formatPrice(low) : "n/a"}
                      </td>
                      <td className="px-3 py-3">
                        <span className="at-badge capitalize">
                          {quote?.marketStatus ?? "…"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="at-badge">
                          {quote ? freshnessLabel(quote.freshness) : "…"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Sparkline data={spark} positive={changePct >= 0} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {loading ? (
            <div className="px-4 py-10 text-center text-[0.8125rem] font-bold text-[#020617]">
              Loading instruments…
            </div>
          ) : null}
          {!loading && rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-[0.8125rem] font-bold text-[#020617]">
              No instruments match this filter.
            </div>
          ) : null}
          {baseError || searchError || quotesError ? (
            <div
              className="border-t px-4 py-3 text-[0.75rem] text-[var(--at-sell)]"
              style={{ borderColor: "var(--at-border)" }}
            >
              {baseError || searchError || quotesError}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
