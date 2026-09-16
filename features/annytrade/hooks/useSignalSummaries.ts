"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

import {
  signalsClient,
  type AnalysisSignalDto,
  type SignalBias,
} from "../services/signals-client";

const LIVE_POLL_MS = 15_000;

export function useSignalSummaries(symbols: string[], enabled = true) {
  const [bySymbol, setBySymbol] = useState<Record<string, AnalysisSignalDto>>(
    {},
  );
  const [loading, setLoading] = useState(false);

  const symbolKey = symbols
    .map((s) => s.toUpperCase())
    .sort()
    .join(",");

  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      setBySymbol({});
      return;
    }
    let cancelled = false;

    async function load(silent: boolean) {
      if (!silent) setLoading(true);
      const list = symbolKey.split(",").filter(Boolean);
      try {
        const res = await signalsClient.list({ symbols: list, interval: "1h" });
        if (cancelled) return;
        const map: Record<string, AnalysisSignalDto> = {};
        for (const s of res.signals) map[s.symbol] = s;
        setBySymbol(map);
      } catch {
        if (!cancelled && !silent) setBySymbol({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load(false);
    const timer = window.setInterval(() => void load(true), LIVE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, symbolKey, symbols.length]);

  return { bySymbol, loading };
}

export function biasGlyph(bias: SignalBias): string {
  if (bias === "Bullish") return "▲";
  if (bias === "Bearish") return "▼";
  if (bias === "Neutral") return "◆";
  return "○";
}
