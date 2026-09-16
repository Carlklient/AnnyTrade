/**
 * Duplicate-order protection helpers (Phase 8).
 * Primary idempotency remains clientOrderId uniqueness at the DB layer.
 */

import { getRiskLimitConfig } from "./risk-limits";

export type OrderFingerprint = {
  accountId: string;
  symbol: string;
  side: string;
  orderType: string;
  quantity: number;
  limitPrice: number | null;
  stopPrice: number | null;
};

const recent = new Map<string, number>();

function fingerprintKey(fp: OrderFingerprint): string {
  return [
    fp.accountId,
    fp.symbol.toUpperCase(),
    fp.side,
    fp.orderType,
    String(fp.quantity),
    fp.limitPrice ?? "",
    fp.stopPrice ?? "",
  ].join("|");
}

export class DuplicateOrderError extends Error {
  readonly code = "DUPLICATE_ORDER";
  constructor(message = "Duplicate order detected within protection window") {
    super(message);
    this.name = "DuplicateOrderError";
  }
}

/**
 * In-process duplicate guard (complements DB idempotency keys).
 * Not a substitute for clientOrderId uniqueness across instances —
 * use durable idempotency keys for that.
 */
export function assertNotDuplicateRecent(
  fp: OrderFingerprint,
  nowMs = Date.now(),
): void {
  const key = fingerprintKey(fp);
  const window = getRiskLimitConfig().duplicateOrderWindowMs;
  const prev = recent.get(key);
  if (prev != null && nowMs - prev < window) {
    throw new DuplicateOrderError(
      `Identical order within ${window}ms window — use a new clientOrderId if intentional`,
    );
  }
  recent.set(key, nowMs);
  // Bound memory
  if (recent.size > 5_000) {
    const cutoff = nowMs - window * 2;
    for (const [k, t] of recent) {
      if (t < cutoff) recent.delete(k);
    }
  }
}

/** Test helper */
export function resetDuplicateOrderWindow(): void {
  recent.clear();
}

export function newIdempotencyKey(prefix = "at"): string {
  const rand = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${Date.now()}_${rand}`;
}
