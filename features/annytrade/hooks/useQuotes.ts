"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

import { marketClient, type Quote } from "../services/market-client";
import { useQuotesStream } from "./useQuotesStream";

export function useQuotes(symbols: string[], pollMs = 8_000) {
  const key = symbols
    .map((s) => s.toUpperCase())
    .filter(Boolean)
    .sort()
    .join(",");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setQuotes([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        const res = await marketClient.quotes(
          key.split(","),
          controller.signal,
        );
        if (!cancelled) {
          setQuotes(res.quotes);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (
          !cancelled &&
          !(err instanceof DOMException && err.name === "AbortError")
        ) {
          setError(err instanceof Error ? err.message : "Quote fetch failed");
          setLoading(false);
        }
      }
    }

    void load();
    const timer = setInterval(() => void load(), pollMs);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [key, pollMs]);

  return { quotes, loading, error };
}

export function useQuote(symbol: string, pollMs = 5_000) {
  const { quotes, loading, error } = useQuotes(symbol ? [symbol] : [], pollMs);
  return { quote: quotes[0] ?? null, loading, error };
}

/** Prefer SSE fan-out; fall back to REST poll if stream has not delivered yet. */
export function useLiveQuote(symbol: string) {
  const sym = symbol.trim().toUpperCase();
  const { quoteMap, status, loading, error } = useQuotesStream(
    sym ? [sym] : [],
  );
  const streamed = sym ? (quoteMap[sym] ?? null) : null;
  const needPoll = Boolean(sym) && !streamed;
  const { quote: polled, loading: pollLoading, error: pollError } = useQuote(
    needPoll ? sym : "",
    8_000,
  );
  const quote = streamed ?? polled;
  return {
    quote,
    loading: quote ? false : loading || (needPoll && pollLoading),
    error: streamed ? error : error || pollError,
    streamStatus: status,
  };
}

export { useQuotesStream };
