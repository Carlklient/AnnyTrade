import { cached, MarketCacheTTL } from "../market/cache";
import { getNewsProvider } from "./factory";
import type { ListNewsInput } from "./types";

export const newsService = {
  meta() {
    return getNewsProvider().meta;
  },

  list(input: ListNewsInput = {}) {
    const symbol = input.symbol?.toUpperCase();
    const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
    const key = `news:${symbol ?? "all"}:${input.category ?? ""}:${limit}:${input.from?.toISOString() ?? ""}:${input.to?.toISOString() ?? ""}`;
    return cached(key, MarketCacheTTL.search, () =>
      getNewsProvider().listNews({ ...input, symbol, limit }),
    );
  },
};
