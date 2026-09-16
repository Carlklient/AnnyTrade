"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { useQuotes } from "../../hooks/useQuotes";
import { useWatchlistSymbols } from "../../hooks/useWatchlistSymbols";
import { annytradeRoutes } from "../../lib/routes";
import { formatPct, formatPrice, pnlClass } from "../../lib/format";
import { num } from "../../services/market-client";

const FILTERS = ["All", "Forex", "Crypto", "Indices", "Equities"] as const;

function classify(symbol: string): (typeof FILTERS)[number] {
  const s = symbol.toUpperCase();
  if (["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD"].includes(s))
    return "Forex";
  if (["BTCUSD", "ETHUSD", "BTC", "ETH"].some((x) => s.includes(x)))
    return "Crypto";
  if (["SPY", "QQQ", "DIA", "IWM"].includes(s)) return "Indices";
  return "Equities";
}

export function InstrumentsRail({ activeSymbol }: { activeSymbol: string }) {
  const { symbols } = useWatchlistSymbols();
  const { quotes, loading } = useQuotes(symbols);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const rows = useMemo(() => {
    const bySym = new Map(quotes.map((x) => [x.symbol.toUpperCase(), x]));
    return symbols
      .map((sym) => {
        const quote = bySym.get(sym.toUpperCase());
        return {
          symbol: sym.toUpperCase(),
          last: num(quote?.last) ?? null,
          changePct: num(quote?.changePercent) ?? 0,
          high: num(quote?.high) ?? null,
          low: num(quote?.low) ?? null,
          closed: quote?.marketStatus === "closed",
          cls: classify(sym),
        };
      })
      .filter((r) => {
        if (filter !== "All" && r.cls !== filter) return false;
        if (!q.trim()) return true;
        return r.symbol.includes(q.trim().toUpperCase());
      });
  }, [quotes, symbols, filter, q]);

  return (
    <aside
      className="at-term-rail at-term-instruments"
      aria-label="Instruments"
    >
      <div className="at-term-rail-head">
        <h2>Instruments</h2>
        <label className="at-term-search">
          <Search className="size-3.5 shrink-0 opacity-60" aria-hidden />
          <input
            type="search"
            placeholder="Search instruments"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search instruments"
          />
        </label>
      </div>

      <div className="at-term-filters" role="tablist" aria-label="Asset class">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            className="at-term-chip"
            data-active={filter === f ? "true" : "false"}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="at-term-inst-list">
        {loading && rows.length === 0 ? (
          <li className="at-term-inst-empty">Loading…</li>
        ) : null}
        {rows.map((r) => {
          const active = r.symbol === activeSymbol.toUpperCase();
          return (
            <li key={r.symbol}>
              <Link
                href={annytradeRoutes.trade(r.symbol)}
                className="at-term-inst-row"
                data-active={active ? "true" : "false"}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{r.symbol}</span>
                    {r.closed ? (
                      <span className="at-term-closed">Market closed</span>
                    ) : null}
                  </div>
                  <p className="at-term-lh">
                    L {r.low != null ? formatPrice(r.low) : "n/a"}, H{" "}
                    {r.high != null ? formatPrice(r.high) : "n/a"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="at-mono text-[0.8125rem] font-semibold">
                    {r.last != null ? formatPrice(r.last) : "n/a"}
                  </p>
                  <p
                    className={`at-mono text-[0.7rem] ${pnlClass(r.changePct)}`}
                  >
                    {formatPct(r.changePct)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
        {!loading && rows.length === 0 ? (
          <li className="at-term-inst-empty">No instruments match.</li>
        ) : null}
      </ul>
    </aside>
  );
}
