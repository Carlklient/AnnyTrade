import type { Quote } from "../market/types";
import { parseDecimal } from "./money";

/**
 * Paper fill-price policy (documented):
 * - BUY market / stop-market fill: prefer ask, else last
 * - SELL market / stop-market fill: prefer bid, else last
 * - LIMIT fills execute at the limit price when the market is at or through the limit
 *   (BUY when market ask/last <= limit; SELL when market bid/last >= limit)
 * Client-supplied prices are never trusted for fills.
 */
export function marketBuyPrice(quote: Quote): number | null {
  return parseDecimal(quote.ask) ?? parseDecimal(quote.last);
}

export function marketSellPrice(quote: Quote): number | null {
  return parseDecimal(quote.bid) ?? parseDecimal(quote.last);
}

export function referenceLast(quote: Quote): number | null {
  return (
    parseDecimal(quote.last) ??
    parseDecimal(quote.ask) ??
    parseDecimal(quote.bid)
  );
}

export function paperFeeAmount(notional: number): number {
  const bps = Number(process.env.ANNYTRADE_PAPER_FEE_BPS ?? "0");
  if (!Number.isFinite(bps) || bps <= 0) return 0;
  return Math.round(((notional * bps) / 10_000) * 1e8) / 1e8;
}
