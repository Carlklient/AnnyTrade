import type { ExecutionEnvironment } from "./environments";
import { EXECUTION_ENV_LABEL, stampEnvironment } from "./environments";
import type { BrokerOrderSide, BrokerOrderType } from "../broker/types";

export type OrderReviewPayload = {
  symbol: string;
  side: BrokerOrderSide;
  quantity: number;
  orderType: BrokerOrderType;
  limitPrice: number | null;
  stopPrice: number | null;
  estimatedValue: number | null;
  marketState: string;
  accountId: string;
  accountLabel: string;
  environment: ExecutionEnvironment;
  quoteTimestamp: string | null;
  clientOrderId: string;
};

export type OrderReviewConfirmation = OrderReviewPayload & {
  reviewId: string;
  confirmedAt: string | null;
  liveMoney: boolean;
  environmentLabel: string;
  /** Explicit typed confirmation required for BROKER_LIVE (future). */
  confirmationPhraseRequired: string | null;
  status: "PENDING_CONFIRMATION" | "CONFIRMED" | "EXPIRED" | "BLOCKED";
  blockedReason: string | null;
};

const LIVE_CONFIRM_PHRASE = "I UNDERSTAND THIS IS REAL MONEY";

/**
 * Build an order-review object for UI confirmation.
 * BROKER_LIVE reviews are created as BLOCKED while Phase 8 hard block is on.
 */
export function buildOrderReview(
  input: OrderReviewPayload,
  reviewId: string,
): OrderReviewConfirmation {
  const stamp = stampEnvironment(input.environment);
  if (input.environment === "BROKER_LIVE") {
    return {
      ...input,
      reviewId,
      confirmedAt: null,
      liveMoney: true,
      environmentLabel: EXECUTION_ENV_LABEL.BROKER_LIVE,
      confirmationPhraseRequired: LIVE_CONFIRM_PHRASE,
      status: "BLOCKED",
      blockedReason: "LIVE_EXECUTION_DISABLED — Phase 8 hard block",
    };
  }
  return {
    ...input,
    reviewId,
    confirmedAt: null,
    liveMoney: stamp.liveMoney,
    environmentLabel: stamp.label,
    confirmationPhraseRequired: null,
    status: "PENDING_CONFIRMATION",
    blockedReason: null,
  };
}

export function assertLiveReviewConfirmation(input: {
  environment: ExecutionEnvironment;
  typedPhrase: string | null | undefined;
}): void {
  if (input.environment !== "BROKER_LIVE") return;
  if ((input.typedPhrase ?? "").trim() !== LIVE_CONFIRM_PHRASE) {
    throw new Error("Live order confirmation phrase mismatch");
  }
}
