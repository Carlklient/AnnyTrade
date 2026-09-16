import { annytradeFetch } from "./client";
import type { CandleInterval } from "./market-client";

export type SignalBias = "Bullish" | "Bearish" | "Neutral" | "Watch";
export type SignalLifecycle = "Active" | "Stale" | "Expired";

export type AnalysisSignalDto = {
  id: string;
  symbol: string;
  interval: CandleInterval;
  bias: SignalBias;
  confidence: number;
  confidenceMethod: string;
  status: SignalLifecycle;
  generatedAt: string;
  barTime: string;
  expiresAt: string;
  staleAfterBars: number;
  inputs: Record<string, number | null>;
  reasons: { code: string; label: string; detail: string }[];
  title: string;
  summary: string;
  disclosure: string;
  dataFreshness: string;
  candleCount: number;
  insufficientHistory: boolean;
};

export const signalsClient = {
  list(opts?: { symbols?: string[]; interval?: CandleInterval }) {
    const params = new URLSearchParams();
    if (opts?.interval) params.set("interval", opts.interval);
    if (opts?.symbols?.length) params.set("symbols", opts.symbols.join(","));
    const q = params.toString() ? `?${params}` : "";
    return annytradeFetch<{
      signals: AnalysisSignalDto[];
      errors: { symbol: string; message: string }[];
      interval: CandleInterval;
      generatedAt: string;
      disclosure: string;
      paper: true;
    }>(`/signals${q}`, { method: "GET" });
  },

  get(id: string) {
    return annytradeFetch<{
      signal: AnalysisSignalDto;
      disclosure: string;
      paper: true;
    }>(`/signals/${encodeURIComponent(id)}`, { method: "GET" });
  },
};
