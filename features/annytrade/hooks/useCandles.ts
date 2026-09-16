"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

import {
  marketClient,
  toChartCandles,
  type CandleInterval,
  type ChartCandle,
} from "../services/market-client";

export function useCandles(
  symbol: string,
  interval: CandleInterval,
  limit = 120,
) {
  const [candles, setCandles] = useState<ChartCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEmpty(false);

    marketClient
      .candles({ symbol, interval, limit }, controller.signal)
      .then((res) => {
        if (cancelled) return;
        const mapped = toChartCandles(res.candles);
        setCandles(mapped);
        setEmpty(mapped.length === 0);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled || err.name === "AbortError") return;
        setCandles([]);
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [symbol, interval, limit]);

  return { candles, loading, error, empty };
}
