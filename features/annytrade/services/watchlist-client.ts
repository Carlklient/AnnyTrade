import { annytradeFetch } from "./client";

export type WatchlistDto = {
  id: string;
  name: string;
  symbols?: string[];
  items?: { symbol: string }[];
};

export const watchlistClient = {
  list() {
    return annytradeFetch<{ watchlists: WatchlistDto[] }>("/watchlists", {
      method: "GET",
    });
  },
  async ensureFavorites(): Promise<WatchlistDto> {
    const { watchlists } = await this.list();
    const existing =
      watchlists.find((w) => w.name.toLowerCase() === "favorites") ??
      watchlists[0];
    if (existing) return existing;
    const created = await annytradeFetch<{ watchlist: WatchlistDto }>(
      "/watchlists",
      {
        method: "POST",
        body: JSON.stringify({ name: "Favorites" }),
      },
    );
    return created.watchlist;
  },
  addItem(watchlistId: string, symbol: string) {
    return annytradeFetch(`/watchlists/${watchlistId}/items`, {
      method: "POST",
      body: JSON.stringify({ symbol }),
    });
  },
  removeItem(watchlistId: string, symbol: string) {
    return annytradeFetch(
      `/watchlists/${watchlistId}/items/${encodeURIComponent(symbol)}`,
      { method: "DELETE" },
    );
  },
};
