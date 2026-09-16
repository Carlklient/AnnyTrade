export type NewsFreshness =
  "LIVE" | "DELAYED" | "STALE" | "DEMO" | "UNAVAILABLE";

export type NewsArticle = {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  url: string;
  summary: string | null;
  relatedSymbols: string[];
  imageUrl: string | null;
  category: string | null;
  freshness: NewsFreshness;
};

export type NewsProviderMeta = {
  providerId: string;
  providerLabel: string;
  mode: "demo" | "live" | "test";
  freshnessDefault: NewsFreshness;
  notes: string;
};

export type ListNewsInput = {
  symbol?: string;
  category?: string;
  from?: Date;
  to?: Date;
  limit?: number;
};
