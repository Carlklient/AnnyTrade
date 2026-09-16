"use client";

import { useMemo } from "react";
import Link from "next/link";

import type { PublicWatchlist } from "../../types/backend";
import { useQuotesStream } from "../../hooks/useQuotesStream";
import { useQuotes } from "../../hooks/useQuotes";
import { biasGlyph, useSignalSummaries } from "../../hooks/useSignalSummaries";
import { freshnessLabel, num } from "../../services/market-client";
import { annytradeRoutes } from "../../lib/routes";
import { formatPct, formatPrice, pnlClass } from "../../lib/format";

function formatUpdated(iso: string | null | undefined) {
  if (!iso) return "n/a";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return "n/a";
  }
}

export function WatchlistQuotesPanel({
  watchlists,
}: {
  watchlists: PublicWatchlist[];
}) {
  const uniqueSymbols = useMemo(() => {
    const all = watchlists.flatMap((w) => w.symbols);
    return [...new Set(all.map((s) => s.toUpperCase()))].slice(0, 25);
  }, [watchlists]);

  const { quoteMap, loading, error } = useQuotesStream(uniqueSymbols);
  const { quotes: polledQuotes, error: polledError } = useQuotes(
    uniqueSymbols,
    8_000,
  );
  const { bySymbol: signals } = useSignalSummaries(uniqueSymbols);

  const polledMap = useMemo(() => {
    const map: Record<string, (typeof polledQuotes)[number]> = {};
    for (const q of polledQuotes) map[q.symbol.toUpperCase()] = q;
    return map;
  }, [polledQuotes]);

  if (watchlists.length === 0) {
    return (
      <div className="at-card-body">
        <p className="text-[0.8125rem] font-bold text-[#020617]">
          No watchlists yet. Add symbols from Markets after you sign in.
        </p>
      </div>
    );
  }

  return (
    <div className="at-card-body space-y-4">
      {error || polledError ? (
        <p className="text-[0.75rem] font-bold text-[#020617]">
          {error
            ? "Realtime stream failed. Showing REST quote updates instead."
            : polledError}
        </p>
      ) : null}

      {watchlists.map((w) => (
        <div key={w.id} className="space-y-2">
          <div>
            <p className="at-label">{w.name}</p>
            <p className="text-[0.7rem] font-bold text-[#020617]">
              {w.symbols.length} symbols
            </p>
          </div>
          <ul className="space-y-1">
            {w.symbols.slice(0, 6).map((raw) => {
              const symbol = raw.toUpperCase();
              const quote = quoteMap[symbol] ?? polledMap[symbol] ?? null;
              const last = num(quote?.last);
              const changePct = num(quote?.changePercent);
              const sig = signals[symbol];
              return (
                <li
                  key={`${w.id}-${symbol}`}
                  className="flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2"
                  style={{ borderColor: "var(--at-border)" }}
                >
                  <div className="min-w-0">
                    <Link
                      href={annytradeRoutes.trade(symbol)}
                      className="font-bold text-[var(--at-accent)]"
                    >
                      {symbol}
                    </Link>
                    <p className="text-[0.65rem] font-bold text-[#020617]">
                      {quote?.timestamp
                        ? formatUpdated(quote.timestamp)
                        : loading
                          ? "…"
                          : freshnessLabel(quote?.freshness ?? "UNAVAILABLE")}
                      {sig ? (
                        <span>
                          {" "}
                          {biasGlyph(sig.bias)} {sig.bias}, {sig.status}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="at-mono text-[0.8125rem] font-bold">
                      {last != null ? formatPrice(last) : "n/a"}
                    </p>
                    <p
                      className={`at-mono text-[0.7rem] font-bold ${
                        changePct != null ? pnlClass(changePct) : ""
                      }`}
                    >
                      {changePct != null ? formatPct(changePct) : "n/a"}
                    </p>
                  </div>
                </li>
              );
            })}
            {w.symbols.length > 6 ? (
              <li className="px-1 text-[0.7rem] font-bold text-[#020617]">
                + {w.symbols.length - 6} more
              </li>
            ) : null}
          </ul>
        </div>
      ))}
    </div>
  );
}
