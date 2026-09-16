"use client";

/**
 * Explicit order-review confirmation UI for future live orders.
 * BROKER_LIVE reviews arrive BLOCKED, submit remains impossible in Phase 8.
 */

export type OrderReviewViewModel = {
  reviewId: string;
  symbol: string;
  side: string;
  quantity: number;
  orderType: string;
  limitPrice: number | null;
  stopPrice: number | null;
  estimatedValue: number | null;
  marketState: string;
  accountLabel: string;
  environment: string;
  environmentLabel: string;
  liveMoney: boolean;
  status: string;
  blockedReason: string | null;
  confirmationPhraseRequired: string | null;
};

type Props = {
  review: OrderReviewViewModel;
  onCancel: () => void;
  onConfirm?: (typedPhrase: string) => void;
  busy?: boolean;
};

export function OrderReviewConfirm({
  review,
  onCancel,
  onConfirm,
  busy,
}: Props) {
  const blocked =
    review.status === "BLOCKED" || review.environment === "BROKER_LIVE";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-review-title"
    >
      <div
        className="w-full max-w-md rounded-[10px] border p-4 shadow-lg"
        style={{
          borderColor: "var(--at-border)",
          background: "var(--at-bg)",
          color: "var(--at-text)",
        }}
      >
        <h2 id="order-review-title" className="text-[1rem] font-semibold">
          Order review
        </h2>
        <p className="mt-1 text-[0.75rem] font-bold text-[#020617]">
          Confirm details before any future live submission. Environment cannot
          be changed here.
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[0.8125rem]">
          <dt className="font-bold text-[#020617]">Symbol</dt>
          <dd className="at-mono font-medium">{review.symbol}</dd>
          <dt className="font-bold text-[#020617]">Side</dt>
          <dd>{review.side}</dd>
          <dt className="font-bold text-[#020617]">Quantity</dt>
          <dd className="at-mono">{review.quantity}</dd>
          <dt className="font-bold text-[#020617]">Order type</dt>
          <dd>{review.orderType}</dd>
          <dt className="font-bold text-[#020617]">Limit</dt>
          <dd className="at-mono">{review.limitPrice ?? "n/a"}</dd>
          <dt className="font-bold text-[#020617]">Stop</dt>
          <dd className="at-mono">{review.stopPrice ?? "n/a"}</dd>
          <dt className="font-bold text-[#020617]">Est. value</dt>
          <dd className="at-mono">
            {review.estimatedValue != null
              ? review.estimatedValue.toFixed(2)
              : "n/a"}
          </dd>
          <dt className="font-bold text-[#020617]">Market</dt>
          <dd>{review.marketState}</dd>
          <dt className="font-bold text-[#020617]">Account</dt>
          <dd>{review.accountLabel}</dd>
          <dt className="font-bold text-[#020617]">Environment</dt>
          <dd>
            <span
              className="at-badge"
              style={
                review.liveMoney
                  ? {
                      background: "var(--at-sell-muted)",
                      color: "var(--at-live)",
                    }
                  : undefined
              }
            >
              {review.environmentLabel}
            </span>
          </dd>
        </dl>

        {blocked ? (
          <p
            className="mt-3 rounded-[8px] border px-3 py-2 text-[0.75rem]"
            style={{
              borderColor:
                "color-mix(in srgb, var(--at-live) 40%, var(--at-border))",
              background: "var(--at-sell-muted)",
            }}
          >
            <strong>BROKER_LIVE blocked.</strong>{" "}
            {review.blockedReason ?? "Live execution is disabled."}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="at-btn at-btn-ghost"
            onClick={onCancel}
          >
            Close
          </button>
          <button
            type="button"
            className="at-btn at-btn-primary"
            disabled={blocked || busy}
            onClick={() => onConfirm?.("")}
          >
            {blocked ? "Submit disabled" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
