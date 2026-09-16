"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

import { annytradeFetch } from "../services/client";
import type { PublicWatchlist } from "../types/backend";
import { useAnnyTrade } from "../context/AnnyTradeContext";

const FALLBACK = ["AAPL", "MSFT", "NVDA", "EURUSD", "SPY"];

/** Resolves watchlist symbols for market quotes — never auto-deletes invalid ones. */
export function useWatchlistSymbols() {
  const { auth } = useAnnyTrade();
  const [symbols, setSymbols] = useState<string[]>(FALLBACK);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.authenticated) {
      setSymbols(FALLBACK);
      return;
    }
    let cancelled = false;
    setLoading(true);
    annytradeFetch<{ watchlists: PublicWatchlist[] }>("/watchlists", {
      method: "GET",
    })
      .then((res) => {
        if (cancelled) return;
        const fromLists = res.watchlists.flatMap((w) => w.symbols);
        const unique = [...new Set(fromLists.map((s) => s.toUpperCase()))];
        setSymbols(unique.length > 0 ? unique.slice(0, 25) : FALLBACK);
      })
      .catch(() => {
        if (!cancelled) setSymbols(FALLBACK);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.authenticated]);

  return { symbols, loading };
}
