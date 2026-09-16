import type { OrderBook, OrderBookLevel } from "../types";

/** Synthetic ladder from quote mid — not exchange Level 2. */
export function buildIllustrativeOrderBook(input: {
  last?: number | null;
  bid?: number | null;
  ask?: number | null;
  levels?: number;
}): OrderBook | null {
  const last = input.last ?? null;
  const bid = input.bid ?? last;
  const ask = input.ask ?? last;
  if (bid == null || ask == null || !Number.isFinite(bid) || !Number.isFinite(ask)) {
    return null;
  }
  const mid = (bid + ask) / 2;
  if (!(mid > 0)) return null;

  const levels = input.levels ?? 8;
  const spread = Math.max(Math.abs(ask - bid), mid * 0.00005);
  const step =
    mid > 100 ? Math.max(0.05, spread) : mid > 10 ? Math.max(0.01, spread) : Math.max(0.0001, spread);

  const asks: OrderBookLevel[] = [];
  const bids: OrderBookLevel[] = [];
  let askTotal = 0;
  let bidTotal = 0;

  for (let i = 0; i < levels; i += 1) {
    const askPrice = Number((ask + step * i).toFixed(mid > 10 ? 2 : 5));
    const bidPrice = Number((bid - step * i).toFixed(mid > 10 ? 2 : 5));
    const askSize = Number((0.35 + ((i * 3) % 5) * 0.28 + (i % 2) * 0.15).toFixed(2));
    const bidSize = Number((0.4 + ((i * 5) % 4) * 0.32 + ((i + 1) % 2) * 0.12).toFixed(2));
    askTotal += askSize;
    bidTotal += bidSize;
    asks.push({ price: askPrice, size: askSize, total: Number(askTotal.toFixed(2)) });
    bids.push({ price: bidPrice, size: bidSize, total: Number(bidTotal.toFixed(2)) });
  }

  return { asks, bids };
}
