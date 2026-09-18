import { annytradeFetch } from "./client";
import type {
  PaperAccountSummary,
  PortfolioAnalyticsResponse,
  PublicOrder,
  PublicPosition,
} from "../types/backend";

export type SubmitPaperOrderInput = {
  accountId?: string;
  symbol: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  quantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
  timeInForce?: "GTC" | "DAY" | "IOC";
  idempotencyKey?: string;
};

export const paperTradingClient = {
  summary(accountId?: string) {
    const q = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    return annytradeFetch<PaperAccountSummary>(`/portfolio/summary${q}`, {
      method: "GET",
    });
  },

  analytics(opts?: { accountId?: string; from?: string; to?: string }) {
    const params = new URLSearchParams();
    if (opts?.accountId) params.set("accountId", opts.accountId);
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);
    const q = params.toString() ? `?${params}` : "";
    return annytradeFetch<PortfolioAnalyticsResponse>(
      `/portfolio/analytics${q}`,
      { method: "GET" },
    );
  },

  listOrders(opts?: { openOnly?: boolean; accountId?: string }) {
    const params = new URLSearchParams();
    if (opts?.openOnly) params.set("open", "1");
    if (opts?.accountId) params.set("accountId", opts.accountId);
    const q = params.toString() ? `?${params}` : "";
    return annytradeFetch<{ orders: PublicOrder[]; paper: true }>(
      `/orders${q}`,
      { method: "GET" },
    );
  },

  getOrder(id: string) {
    return annytradeFetch<{
      order: PublicOrder;
      executions: unknown[];
      paper: true;
    }>(`/orders/${id}`, { method: "GET" });
  },

  submitOrder(input: SubmitPaperOrderInput) {
    return annytradeFetch<{
      order: PublicOrder;
      replayed: boolean;
      paper: true;
    }>("/orders", {
      method: "POST",
      headers: input.idempotencyKey
        ? { "Idempotency-Key": input.idempotencyKey }
        : undefined,
      body: JSON.stringify(input),
    });
  },

  cancelOrder(id: string) {
    return annytradeFetch<{ order: PublicOrder; paper: true }>(
      `/orders/${id}/cancel`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  amendOrder(
    id: string,
    body: {
      limitPrice?: number | null;
      stopPrice?: number | null;
      quantity?: number;
    },
  ) {
    return annytradeFetch<{ order: PublicOrder; paper: true }>(`/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  processOrders(accountId?: string) {
    return annytradeFetch<{ processed: number; filled: number; paper: true }>(
      "/orders/process",
      {
        method: "POST",
        body: JSON.stringify(accountId ? { accountId } : {}),
      },
    );
  },

  listPositions(opts?: { accountId?: string; closed?: boolean }) {
    const params = new URLSearchParams();
    if (opts?.accountId) params.set("accountId", opts.accountId);
    if (opts?.closed) params.set("closed", "1");
    const q = params.toString() ? `?${params}` : "";
    return annytradeFetch<{ positions: PublicPosition[]; paper: true }>(
      `/positions${q}`,
      { method: "GET" },
    );
  },
};

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
