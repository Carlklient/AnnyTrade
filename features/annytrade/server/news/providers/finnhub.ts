import type { NewsProvider } from "../provider";
import type { ListNewsInput, NewsArticle } from "../types";
import { MarketDataError } from "../../market/types";
import { providerRateLimit } from "../../market/provider-rate-limit";
import { normalizeSymbol } from "../../market/normalize";

type FinnhubNewsConfig = { apiKey: string; baseUrl?: string };

type FinnhubNewsItem = {
  id?: number;
  category?: string;
  datetime?: number;
  headline?: string;
  source?: string;
  summary?: string;
  url?: string;
  image?: string;
  related?: string;
};

async function finnhubGet<T>(
  path: string,
  apiKey: string,
  baseUrl: string,
): Promise<T> {
  const limited = providerRateLimit({
    key: "finnhub-news",
    limit: 40,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    throw new MarketDataError(
      "RATE_LIMITED",
      `News provider rate limit; retry in ${limited.retryAfterSec}s`,
      429,
    );
  }
  const url = new URL(path, baseUrl);
  url.searchParams.set("token", apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) {
      throw new MarketDataError(
        "PROVIDER_AUTH",
        "News provider auth failed",
        res.status,
      );
    }
    if (res.status === 429) {
      throw new MarketDataError(
        "RATE_LIMITED",
        "News provider rate limited",
        429,
      );
    }
    if (!res.ok) {
      throw new MarketDataError(
        "PROVIDER_ERROR",
        `News provider error (${res.status})`,
        502,
      );
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof MarketDataError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new MarketDataError("TIMEOUT", "News provider timeout", 504);
    }
    throw new MarketDataError(
      "PROVIDER_ERROR",
      "News provider request failed",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

function mapItem(
  raw: FinnhubNewsItem,
  fallbackSymbol?: string,
): NewsArticle | null {
  const headline = (raw.headline ?? "").trim();
  const url = (raw.url ?? "").trim();
  if (!headline || !url || !/^https?:\/\//i.test(url)) return null;
  const related = (raw.related ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (fallbackSymbol && !related.includes(fallbackSymbol)) {
    related.unshift(fallbackSymbol);
  }
  const summaryRaw = (raw.summary ?? "").trim();
  // Cap summary — never store full article text
  const summary =
    summaryRaw.length > 0
      ? summaryRaw.slice(0, 400) + (summaryRaw.length > 400 ? "…" : "")
      : null;
  const publishedAt =
    typeof raw.datetime === "number" && Number.isFinite(raw.datetime)
      ? new Date(raw.datetime * 1000).toISOString()
      : new Date().toISOString();
  return {
    id: `fh-${raw.id ?? `${Date.parse(publishedAt)}-${headline.slice(0, 24)}`}`,
    headline: headline.slice(0, 280),
    source: (raw.source ?? "Unknown").slice(0, 120),
    publishedAt,
    url,
    summary,
    relatedSymbols: [...new Set(related)].slice(0, 12),
    imageUrl: raw.image && /^https?:\/\//i.test(raw.image) ? raw.image : null,
    category: raw.category ?? null,
    freshness: "DELAYED",
  };
}

export function createFinnhubNewsProvider(
  config: FinnhubNewsConfig,
): NewsProvider {
  const baseUrl = config.baseUrl ?? "https://finnhub.io/api/v1/";
  return {
    meta: {
      providerId: "finnhub-news",
      providerLabel: "Finnhub News",
      mode: "live",
      freshnessDefault: "DELAYED",
      notes: "Company/market news headlines + link; no full article scrape.",
    },
    async listNews(input: ListNewsInput) {
      const limit = Math.min(input.limit ?? 40, 80);
      const to = input.to ?? new Date();
      const from = input.from ?? new Date(to.getTime() - 7 * 24 * 3600_000);
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);

      let raw: FinnhubNewsItem[] = [];
      if (input.symbol) {
        const sym = normalizeSymbol(input.symbol);
        raw = await finnhubGet<FinnhubNewsItem[]>(
          `company-news?symbol=${encodeURIComponent(sym)}&from=${fromStr}&to=${toStr}`,
          config.apiKey,
          baseUrl,
        );
        return (Array.isArray(raw) ? raw : [])
          .map((r) => mapItem(r, sym))
          .filter((a): a is NewsArticle => a != null)
          .slice(0, limit);
      }

      const category = input.category === "crypto" ? "crypto" : "general";
      raw = await finnhubGet<FinnhubNewsItem[]>(
        `news?category=${encodeURIComponent(category)}`,
        config.apiKey,
        baseUrl,
      );
      return (Array.isArray(raw) ? raw : [])
        .map((r) => mapItem(r))
        .filter((a): a is NewsArticle => a != null)
        .slice(0, limit);
    },
  };
}
