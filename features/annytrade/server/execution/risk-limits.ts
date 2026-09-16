/**
 * Server-side risk limits for order sizing (Phase 8 readiness).
 * Configurable via env; defaults are conservative.
 */

export type RiskLimitConfig = {
  maxOrderNotionalUsd: number;
  maxOrderQuantity: number;
  maxOpenOrdersPerAccount: number;
  staleQuoteMaxAgeMs: number;
  /** Max relative disagreement between market quote and broker last price. */
  maxMarkDisagreementBps: number;
  duplicateOrderWindowMs: number;
};

export function getRiskLimitConfig(): RiskLimitConfig {
  return {
    maxOrderNotionalUsd: numEnv("ANNYTRADE_MAX_ORDER_NOTIONAL_USD", 50_000),
    maxOrderQuantity: numEnv("ANNYTRADE_MAX_ORDER_QUANTITY", 10_000),
    maxOpenOrdersPerAccount: numEnv("ANNYTRADE_MAX_OPEN_ORDERS", 50),
    staleQuoteMaxAgeMs: numEnv("ANNYTRADE_STALE_QUOTE_MAX_AGE_MS", 15_000),
    maxMarkDisagreementBps: numEnv("ANNYTRADE_MAX_MARK_DISAGREEMENT_BPS", 250),
    duplicateOrderWindowMs: numEnv(
      "ANNYTRADE_DUPLICATE_ORDER_WINDOW_MS",
      5_000,
    ),
  };
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export class RiskLimitError extends Error {
  readonly code = "RISK_LIMIT";
  constructor(message: string) {
    super(message);
    this.name = "RiskLimitError";
  }
}

export function assertOrderWithinRiskLimits(input: {
  quantity: number;
  estimatedNotionalUsd: number | null;
  openOrderCount?: number;
}): void {
  const cfg = getRiskLimitConfig();
  if (input.quantity > cfg.maxOrderQuantity) {
    throw new RiskLimitError(
      `Quantity ${input.quantity} exceeds max order quantity ${cfg.maxOrderQuantity}`,
    );
  }
  if (
    input.estimatedNotionalUsd != null &&
    input.estimatedNotionalUsd > cfg.maxOrderNotionalUsd
  ) {
    throw new RiskLimitError(
      `Estimated notional ${input.estimatedNotionalUsd.toFixed(2)} exceeds max ${cfg.maxOrderNotionalUsd}`,
    );
  }
  if (
    input.openOrderCount != null &&
    input.openOrderCount >= cfg.maxOpenOrdersPerAccount
  ) {
    throw new RiskLimitError(
      `Open order count ${input.openOrderCount} meets/exceeds max ${cfg.maxOpenOrdersPerAccount}`,
    );
  }
}
