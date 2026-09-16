import { getSql } from "../db/client";
import type {
  DbWatchlist,
  DbWatchlistItem,
  PublicWatchlist,
} from "../domain/types";

export async function listWatchlists(
  userId: string,
): Promise<PublicWatchlist[]> {
  const sql = getSql();
  const lists = await sql<DbWatchlist[]>`
    SELECT * FROM annytrade.watchlists
    WHERE user_id = ${userId}
    ORDER BY sort_order ASC, created_at ASC
  `;
  if (lists.length === 0) return [];

  const ids = lists.map((l) => l.id);
  const items = await sql<DbWatchlistItem[]>`
    SELECT * FROM annytrade.watchlist_items
    WHERE watchlist_id = ANY(${ids})
    ORDER BY sort_order ASC, created_at ASC
  `;

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    sortOrder: list.sort_order,
    symbols: items
      .filter((i) => i.watchlist_id === list.id)
      .map((i) => i.symbol),
  }));
}

export async function createWatchlist(
  userId: string,
  name: string,
): Promise<PublicWatchlist> {
  const sql = getSql();
  const rows = await sql<DbWatchlist[]>`
    INSERT INTO annytrade.watchlists (user_id, name)
    VALUES (${userId}, ${name})
    RETURNING *
  `;
  const list = rows[0];
  if (!list) throw new Error("Failed to create watchlist");
  return {
    id: list.id,
    name: list.name,
    sortOrder: list.sort_order,
    symbols: [],
  };
}

export async function renameWatchlist(
  userId: string,
  watchlistId: string,
  name: string,
): Promise<PublicWatchlist> {
  const sql = getSql();
  const rows = await sql<DbWatchlist[]>`
    UPDATE annytrade.watchlists
    SET name = ${name}, updated_at = NOW()
    WHERE id = ${watchlistId} AND user_id = ${userId}
    RETURNING *
  `;
  const list = rows[0];
  if (!list) throw new Error("NOT_FOUND");
  const full = await listWatchlists(userId);
  return full.find((w) => w.id === list.id)!;
}

export async function deleteWatchlist(
  userId: string,
  watchlistId: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM annytrade.watchlists
    WHERE id = ${watchlistId} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function addWatchlistItem(
  userId: string,
  watchlistId: string,
  symbol: string,
): Promise<PublicWatchlist> {
  const sql = getSql();
  const owned = await sql<{ id: string }[]>`
    SELECT id FROM annytrade.watchlists
    WHERE id = ${watchlistId} AND user_id = ${userId}
    LIMIT 1
  `;
  if (!owned[0]) throw new Error("NOT_FOUND");

  await sql`
    INSERT INTO annytrade.watchlist_items (watchlist_id, symbol)
    VALUES (${watchlistId}, ${symbol})
    ON CONFLICT (watchlist_id, symbol) DO NOTHING
  `;

  const lists = await listWatchlists(userId);
  const list = lists.find((w) => w.id === watchlistId);
  if (!list) throw new Error("NOT_FOUND");
  return list;
}

export async function removeWatchlistItem(
  userId: string,
  watchlistId: string,
  symbol: string,
): Promise<boolean> {
  const sql = getSql();
  const owned = await sql<{ id: string }[]>`
    SELECT id FROM annytrade.watchlists
    WHERE id = ${watchlistId} AND user_id = ${userId}
    LIMIT 1
  `;
  if (!owned[0]) return false;

  const rows = await sql`
    DELETE FROM annytrade.watchlist_items
    WHERE watchlist_id = ${watchlistId} AND symbol = ${symbol}
    RETURNING id
  `;
  return rows.length > 0;
}
