import type { Quote } from "../market/types";
import { parseDecimal } from "./money";

/**
 * Paper fill-price policy (documented):
 * - BUY market / stop-market fill: prefer ask, else last, then optional slippage
 * - SELL market / stop-market fill: prefer bid, else last, then optional slippage
 * - LIMIT fills execute at the limit price when the market is at or through the limit
 *   (BUY when market ask/last <= limit; SELL when market bid/last >= limit)
 * Client-supplied prices are never trusted for fills.
 */

function slippageBps(): number {
  const bps = Number(process.env.ANNYTRADE_PAPER_SLIPPAGE_BPS ?? "0");
  return Number.isFinite(bps) && bps > 0 ? bps : 0;
}

/** Apply adverse slippage for market-style fills (BUY pays up, SELL receives less). */
export function applyPaperSlippage(
  price: number,
  side: "BUY" | "SELL",
): number {
  const bps = slippageBps();
  if (bps <= 0 || !(price > 0)) return price;
  const mult = side === "BUY" ? 1 + bps / 10_000 : 1 - bps / 10_000;
  return Math.round(price * mult * 1e8) / 1e8;
}

/** Raw ask (no slippage) — used for limit triggers. */
export function quoteAsk(quote: Quote): number | null {
  return parseDecimal(quote.ask) ?? parseDecimal(quote.last);
}

/** Raw bid (no slippage) — used for limit triggers. */
export function quoteBid(quote: Quote): number | null {
  return parseDecimal(quote.bid) ?? parseDecimal(quote.last);
}

/** Executable market BUY price (ask + optional adverse slippage). */
export function marketBuyPrice(quote: Quote): number | null {
  const raw = quoteAsk(quote);
  if (raw == null) return null;
  return applyPaperSlippage(raw, "BUY");
}

/** Executable market SELL price (bid − optional adverse slippage). */
export function marketSellPrice(quote: Quote): number | null {
  const raw = quoteBid(quote);
  if (raw == null) return null;
  return applyPaperSlippage(raw, "SELL");
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

/**
 * Session gate — when ANNYTRADE_PAPER_RESPECT_SESSION=true, market/resting fills
 * wait while the quote session is closed. Default off so paper practice stays 24/7.
 */
export function isPaperSessionTradable(quote: Quote): boolean {
  if (process.env.ANNYTRADE_PAPER_RESPECT_SESSION !== "true") return true;
  return quote.marketStatus !== "closed";
}

/**
 * Optional partial market fills for realism.
 * ANNYTRADE_PAPER_PARTIAL_MAX_FRAC in (0,1] — first pass fills at most this fraction
 * of remaining qty (default 1 = always full). Rest stays PARTIALLY_FILLED.
 */
export function paperMarketFillQty(remaining: number): number {
  const frac = Number(process.env.ANNYTRADE_PAPER_PARTIAL_MAX_FRAC ?? "1");
  if (!Number.isFinite(frac) || frac >= 1 || frac <= 0) return remaining;
  const qty = Math.round(remaining * frac * 1e8) / 1e8;
  const floor = Math.min(remaining, Math.max(qty, remaining * 0.05));
  return Math.min(remaining, floor);
}
