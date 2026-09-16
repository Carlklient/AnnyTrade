import { annytradeFetch } from "./client";

export type NewsArticleDto = {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
  summary: string | null;
  relatedSymbols: string[];
  imageUrl: string | null;
  category: string | null;
  freshness: string;
};

export type EconomicEventDto = {
  id: string;
  event: string;
  country: string | null;
  region: string | null;
  currency: string | null;
  time: string;
  importance: "high" | "medium" | "low" | "unknown";
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  unit: string | null;
  freshness: string;
};

export const newsClient = {
  list(opts?: {
    symbol?: string;
    category?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (opts?.symbol) params.set("symbol", opts.symbol);
    if (opts?.category) params.set("category", opts.category);
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const q = params.toString() ? `?${params}` : "";
    return annytradeFetch<{
      articles: NewsArticleDto[];
      meta: {
        providerId: string;
        providerLabel?: string;
        mode: string;
        notes: string;
      };
      disclosure: string;
    }>(`/news${q}`, { method: "GET" });
  },
};

export const calendarClient = {
  list(opts?: {
    from?: string;
    to?: string;
    country?: string;
    importance?: string;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (opts?.from) params.set("from", opts.from);
    if (opts?.to) params.set("to", opts.to);
    if (opts?.country) params.set("country", opts.country);
    if (opts?.importance) params.set("importance", opts.importance);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const q = params.toString() ? `?${params}` : "";
    return annytradeFetch<{
      events: EconomicEventDto[];
      meta: { providerId: string; mode: string; notes: string };
      timezoneNote: string;
    }>(`/calendar${q}`, { method: "GET" });
  },
};
