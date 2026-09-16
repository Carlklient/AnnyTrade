"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react";

import type { Quote } from "../services/market-client";

type StreamStatus = {
  connectionState: string;
  providerId: string;
  freshnessDefault?: string;
  mode?: string;
  staleSymbols?: string[];
  reconnectAttempt?: number;
  note?: string;
};

export function useQuotesStream(symbols: string[]) {
  const normalized = useMemo(() => {
    const unique = [
      ...new Set((symbols ?? []).map((s) => s.trim().toUpperCase())),
    ].filter(Boolean);
    return unique.slice(0, 25);
  }, [symbols]);

  const [quoteMap, setQuoteMap] = useState<Record<string, Quote>>({});
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [loading, setLoading] = useState(normalized.length > 0);
  const [error, setError] = useState<string | null>(null);

  const attemptRef = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (normalized.length === 0) {
      setQuoteMap({});
      setStatus(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setQuoteMap({});
    setStatus(null);
    attemptRef.current = 0;

    const connect = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      const url = `/api/annytrade/markets/stream?symbols=${encodeURIComponent(
        normalized.join(","),
      )}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("connected", (ev: MessageEvent) => {
        attemptRef.current = 0;
        try {
          JSON.parse(ev.data) as unknown;
        } catch {
          // ignore
        }
        setLoading(false);
      });

      es.addEventListener("status", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data) as StreamStatus;
          setStatus(payload);
        } catch {
          // ignore
        }
      });

      es.addEventListener("quote", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data) as Quote;
          if (!payload?.symbol) return;
          setQuoteMap((prev) => ({ ...prev, [payload.symbol]: payload }));
        } catch {
          // ignore malformed
        }
      });

      es.onerror = () => {
        // Close and manually reconnect with backoff.
        try {
          es.close();
        } catch {
          // ignore
        }
        esRef.current = null;

        setError(
          "Realtime market stream unavailable. Falling back to empty until reconnect.",
        );
        setLoading(false);
        setStatus((s) => (s ? { ...s, connectionState: "error" } : s));

        attemptRef.current += 1;
        const delay = Math.min(
          30_000,
          1000 * 2 ** Math.min(attemptRef.current, 5),
        );
        reconnectTimer.current = setTimeout(() => {
          connect();
        }, delay);
      };
    };

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
      try {
        esRef.current?.close();
      } catch {
        // ignore
      }
      esRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized.join(",")]);

  return { quoteMap, status, loading, error };
}
