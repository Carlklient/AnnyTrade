/** Synthetic ladder from quote mid — not exchange Level 2. */
import type { OrderBook, OrderBookLevel } from "../types";

function hashSym(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

export function buildIllustrativeOrderBook(input: {
  last?: number | null;
  bid?: number | null;
  ask?: number | null;
  levels?: number;
  symbol?: string;
}): OrderBook | null {
  const last = input.last ?? null;
  const bid = input.bid ?? last;
  const ask = input.ask ?? last;
  if (bid == null || ask == null || !Number.isFinite(bid) || !Number.isFinite(ask)) {
    return null;
  }
  const mid = (bid + ask) / 2;
  if (!(mid > 0)) return null;

  const levels = input.levels ?? 10;
  const spread = Math.max(Math.abs(ask - bid), mid * 0.00005);
  const step =
    mid > 100
      ? Math.max(0.05, spread)
      : mid > 10
        ? Math.max(0.01, spread)
        : Math.max(0.0001, spread);
  const seed = hashSym((input.symbol ?? "X").toUpperCase());
  const decimals = mid > 10 ? 2 : mid > 1 ? 4 : 5;

  const asks: OrderBookLevel[] = [];
  const bids: OrderBookLevel[] = [];
  let askTotal = 0;
  let bidTotal = 0;

  for (let i = 0; i < levels; i += 1) {
    const askPrice = Number((ask + step * i).toFixed(decimals));
    const bidPrice = Number((bid - step * i).toFixed(decimals));
    // Near-touch thinner, deeper levels accumulate — size wobbles by symbol seed.
    const depthBoost = 1 + i * 0.22;
    const askSize = Number(
      (
        (0.28 + ((seed + i * 7) % 9) * 0.11 + (i % 3) * 0.08) *
        depthBoost
      ).toFixed(2),
    );
    const bidSize = Number(
      (
        (0.3 + ((seed + i * 11) % 8) * 0.13 + ((i + 1) % 3) * 0.07) *
        depthBoost
      ).toFixed(2),
    );
    askTotal += askSize;
    bidTotal += bidSize;
    asks.push({
      price: askPrice,
      size: askSize,
      total: Number(askTotal.toFixed(2)),
    });
    bids.push({
      price: bidPrice,
      size: bidSize,
      total: Number(bidTotal.toFixed(2)),
    });
  }

  return { asks, bids };
}
