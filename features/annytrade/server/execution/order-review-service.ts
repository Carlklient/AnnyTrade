import { getSql } from "../db/client";
import {
  buildOrderReview,
  type OrderReviewConfirmation,
  type OrderReviewPayload,
} from "./order-review";
import { recordExecutionAudit } from "../repos/execution-audit";
import { createOpaqueToken } from "../security/crypto";

export async function createOrderReview(
  userId: string,
  payload: OrderReviewPayload,
): Promise<OrderReviewConfirmation> {
  const reviewId = crypto.randomUUID();
  const review = buildOrderReview(payload, reviewId);
  const sql = getSql();
  await sql`
    INSERT INTO annytrade.order_reviews (
      id, user_id, account_id, environment, payload, status, blocked_reason, client_order_id
    ) VALUES (
      ${review.reviewId},
      ${userId},
      ${payload.accountId},
      ${payload.environment},
      ${sql.json(payload as never)},
      ${review.status},
      ${review.blockedReason},
      ${payload.clientOrderId}
    )
  `;
  await recordExecutionAudit({
    userId,
    eventType: "order.review.created",
    environment: payload.environment,
    metadata: {
      reviewId: review.reviewId,
      status: review.status,
      symbol: payload.symbol,
      side: payload.side,
      quantity: payload.quantity,
      // opaque nonce so reviews are not forgeable from client alone
      nonce: createOpaqueToken(8),
    },
  });
  return review;
}
