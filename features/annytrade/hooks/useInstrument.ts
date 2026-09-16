"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

import { marketClient, type Instrument } from "../services/market-client";

export function useInstrument(symbol: string) {
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    marketClient
      .instrument(symbol, controller.signal)
      .then((res) => {
        if (cancelled) return;
        setInstrument(res.instrument);
        setLoading(false);
      })
      .catch((err: Error & { status?: number; code?: string }) => {
        if (cancelled || err.name === "AbortError") return;
        if (err.status === 404 || err.code === "NOT_FOUND") {
          setNotFound(true);
          setInstrument(null);
        } else {
          setError(err.message);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [symbol]);

  return { instrument, loading, error, notFound };
}
