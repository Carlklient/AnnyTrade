import { getRiskLimitConfig, RiskLimitError } from "./risk-limits";

export class StalePriceError extends Error {
  readonly code = "STALE_PRICE";
  constructor(message: string) {
    super(message);
    this.name = "StalePriceError";
  }
}

/**
 * Refuse orders when the reference quote is too old or missing.
 * Server-side only — client timestamps are not trusted as sole authority.
 */
export function assertQuoteFresh(input: {
  quoteTimestamp: string | null | undefined;
  nowMs?: number;
  /** Optional override; defaults to risk config. */
  maxAgeMs?: number;
}): { ageMs: number; fresh: true } {
  const maxAge = input.maxAgeMs ?? getRiskLimitConfig().staleQuoteMaxAgeMs;
  const now = input.nowMs ?? Date.now();
  if (!input.quoteTimestamp) {
    throw new StalePriceError("Quote timestamp missing — refusing order");
  }
  const ts = Date.parse(input.quoteTimestamp);
  if (!Number.isFinite(ts)) {
    throw new StalePriceError("Quote timestamp invalid — refusing order");
  }
  const ageMs = now - ts;
  if (ageMs > maxAge) {
    throw new StalePriceError(
      `Quote age ${ageMs}ms exceeds max ${maxAge}ms — stale-price protection`,
    );
  }
  if (ageMs < -5_000) {
    throw new StalePriceError("Quote timestamp in the future — refusing order");
  }
  return { ageMs, fresh: true };
}

export function assertMarkAgreement(input: {
  marketPrice: number;
  brokerPrice: number | null | undefined;
  symbol: string;
}): void {
  if (input.brokerPrice == null || !Number.isFinite(input.brokerPrice)) return;
  if (!Number.isFinite(input.marketPrice) || input.marketPrice <= 0) {
    throw new RiskLimitError("Invalid market price for disagreement check");
  }
  const bps =
    (Math.abs(input.marketPrice - input.brokerPrice) / input.marketPrice) *
    10_000;
  const max = getRiskLimitConfig().maxMarkDisagreementBps;
  if (bps > max) {
    throw new RiskLimitError(
      `Market/broker mark disagreement for ${input.symbol}: ${bps.toFixed(0)} bps > ${max} bps`,
    );
  }
}
