import type { ListNewsInput, NewsArticle, NewsProviderMeta } from "./types";

/**
 * News provider contract — independent of market-data provider.
 * Never return full copyrighted article bodies; headlines + optional short summary + URL only.
 */
export interface NewsProvider {
  readonly meta: NewsProviderMeta;
  listNews(input: ListNewsInput): Promise<NewsArticle[]>;
}
