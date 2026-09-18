import { getSql } from "../db/client";
import { ApiError } from "../http/errors";
import { marketDataService } from "../market/service";
import { MarketDataError } from "../market/types";
import { normalizeSymbol } from "../market/normalize";
import { recordAuditEvent } from "../repos/audit";
import {
  getAccountForUser,
  getAvailableCash,
  listAccountsForUser,
} from "../repos/accounts";
import {
  findOrderByIdempotency,
  getOrderForUser,
  insertOrder,
  listOpenOrdersForAccount,
  listOrdersForUser,
} from "../repos/orders";
import {
  getPositionForAccountSymbol,
  listClosedPositionsForUser,
  listOpenPositionsForUser,
} from "../repos/positions";
import { listExecutionsForOrder } from "../repos/executions";
import type {
  DbOrder,
  DbPosition,
  DbTradingAccount,
  OrderSide,
  OrderType,
  PublicOrder,
  PublicPosition,
} from "../domain/types";
import {
  toPublicExecution,
  toPublicOrder,
  toPublicPosition,
} from "../domain/types";
import {
  add,
  mul,
  nearlyEqual,
  parseDecimal,
  requirePositive,
  roundMoney,
  sub,
} from "./money";
import {
  marketBuyPrice,
  marketSellPrice,
  paperFeeAmount,
  referenceLast,
} from "./pricing";
import type { Quote } from "../market/types";

/** postgres.js transaction client (tagged template). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;

export type SubmitOrderInput = {
  userId: string;
  accountId?: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
  timeInForce?: "GTC" | "DAY" | "IOC" | null;
  idempotencyKey?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

async function lockAccount(
  tx: Tx,
  accountId: string,
): Promise<DbTradingAccount> {
  const rows = await tx<DbTradingAccount[]>`
    SELECT * FROM annytrade.trading_accounts
    WHERE id = ${accountId}
    FOR UPDATE
  `;
  const account = rows[0];
  if (!account) throw new ApiError(404, "NOT_FOUND", "Account not found");
  return account;
}

async function ledgerBalanceTx(tx: Tx, accountId: string): Promise<number> {
  const rows = await tx<{ balance: string }[]>`
    SELECT COALESCE(SUM(amount), 0)::text AS balance
    FROM annytrade.account_ledger_entries
    WHERE account_id = ${accountId}
  `;
  return Number(rows[0]?.balance ?? 0);
}

async function reservedBuyNotionalTx(
  tx: Tx,
  accountId: string,
): Promise<number> {
  const rows = await tx<{ reserved: string }[]>`
    SELECT COALESCE(SUM(
      (quantity - filled_quantity) *
      COALESCE(limit_price, stop_price, 0)
    ), 0)::text AS reserved
    FROM annytrade.orders
    WHERE account_id = ${accountId}
      AND side = 'BUY'
      AND status IN ('PENDING', 'OPEN', 'PARTIALLY_FILLED')
  `;
  return Number(rows[0]?.reserved ?? 0);
}

async function availableCashTx(tx: Tx, accountId: string): Promise<number> {
  const balance = await ledgerBalanceTx(tx, accountId);
  const reserved = await reservedBuyNotionalTx(tx, accountId);
  return Math.max(0, roundMoney(balance - reserved));
}

async function positionQtyTx(
  tx: Tx,
  accountId: string,
  symbol: string,
): Promise<number> {
  const rows = await tx<{ quantity: string }[]>`
    SELECT quantity::text AS quantity
    FROM annytrade.positions
    WHERE account_id = ${accountId} AND symbol = ${symbol}
    FOR UPDATE
  `;
  return Number(rows[0]?.quantity ?? 0);
}

function estimateBuyNotional(
  orderType: OrderType,
  quantity: number,
  quote: Quote,
  limitPrice?: number | null,
  stopPrice?: number | null,
): number {
  if (orderType === "LIMIT" && limitPrice != null) {
    return mul(quantity, limitPrice);
  }
  if (
    (orderType === "STOP" || orderType === "STOP_LIMIT") &&
    stopPrice != null
  ) {
    const px = limitPrice ?? stopPrice;
    return mul(quantity, px);
  }
  const px = marketBuyPrice(quote);
  if (px == null)
    throw new ApiError(503, "MARKET_DATA", "No buy price available");
  return mul(quantity, px);
}

async function applyPositionFill(
  tx: Tx,
  input: {
    accountId: string;
    userId: string;
    symbol: string;
    side: OrderSide;
    quantity: number;
    price: number;
  },
): Promise<void> {
  const { accountId, userId, symbol, side, quantity, price } = input;
  const rows = await tx<DbPosition[]>`
    SELECT * FROM annytrade.positions
    WHERE account_id = ${accountId} AND symbol = ${symbol}
    FOR UPDATE
  `;
  const existing = rows[0];

  if (side === "BUY") {
    if (!existing) {
      const cost = mul(quantity, price);
      await tx`
        INSERT INTO annytrade.positions (
          account_id, user_id, symbol, quantity, average_entry, cost_basis
        ) VALUES (
          ${accountId}, ${userId}, ${symbol}, ${quantity}, ${price}, ${cost}
        )
      `;
      return;
    }
    const prevQty = Number(existing.quantity);
    const prevCost = Number(existing.cost_basis);
    const newQty = add(prevQty, quantity);
    const newCost = add(prevCost, mul(quantity, price));
    const avg = newQty > 0 ? roundMoney(newCost / newQty) : 0;
    await tx`
      UPDATE annytrade.positions SET
        quantity = ${newQty},
        average_entry = ${avg},
        cost_basis = ${newCost},
        closed_at = NULL,
        updated_at = NOW()
      WHERE id = ${existing.id}
    `;
    return;
  }

  // SELL — long-only
  if (!existing || Number(existing.quantity) <= 0) {
    throw new ApiError(400, "OVERSELL", "No long position to sell");
  }
  const prevQty = Number(existing.quantity);
  if (quantity > prevQty + 1e-8) {
    throw new ApiError(400, "OVERSELL", "Cannot sell more than owned quantity");
  }
  const avg = Number(existing.average_entry);
  const realized = mul(sub(price, avg), quantity);
  const newQty = roundMoney(prevQty - quantity);
  const newCost = mul(newQty, avg);
  const newRealized = add(Number(existing.realized_pnl), realized);

  if (newQty <= 1e-8) {
    await tx`
      UPDATE annytrade.positions SET
        quantity = 0,
        cost_basis = 0,
        realized_pnl = ${newRealized},
        closed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${existing.id}
    `;
  } else {
    await tx`
      UPDATE annytrade.positions SET
        quantity = ${newQty},
        cost_basis = ${newCost},
        realized_pnl = ${newRealized},
        updated_at = NOW()
      WHERE id = ${existing.id}
    `;
  }
}

async function insertFillAtomic(
  tx: Tx,
  order: DbOrder,
  fillQty: number,
  fillPrice: number,
  fillKey: string,
): Promise<{ order: DbOrder; duplicate: boolean }> {
  // Idempotent fill key
  const existing = await tx<{ id: string }[]>`
    SELECT id FROM annytrade.executions
    WHERE external_execution_id = ${fillKey}
    LIMIT 1
  `;
  if (existing[0]) {
    const refreshed = await tx<DbOrder[]>`
      SELECT * FROM annytrade.orders WHERE id = ${order.id} LIMIT 1
    `;
    return { order: refreshed[0]!, duplicate: true };
  }

  const fee = paperFeeAmount(mul(fillQty, fillPrice));
  const prevFilled = Number(order.filled_quantity);
  const orderQty = Number(order.quantity);
  const newFilled = add(prevFilled, fillQty);
  if (newFilled > orderQty + 1e-8) {
    throw new ApiError(409, "OVERFILL", "Fill exceeds order quantity");
  }

  const prevAvg = order.average_fill_price
    ? Number(order.average_fill_price)
    : null;
  const newAvg =
    prevAvg == null
      ? fillPrice
      : roundMoney((prevAvg * prevFilled + fillPrice * fillQty) / newFilled);

  const fullyFilled = nearlyEqual(newFilled, orderQty) || newFilled >= orderQty;
  const nextStatus = fullyFilled ? "FILLED" : "PARTIALLY_FILLED";

  await tx`
    INSERT INTO annytrade.executions (
      order_id, account_id, user_id, symbol, side,
      quantity, price, fee, external_execution_id
    ) VALUES (
      ${order.id}, ${order.account_id}, ${order.user_id}, ${order.symbol}, ${order.side},
      ${fillQty}, ${fillPrice}, ${fee}, ${fillKey}
    )
  `;

  const notional = mul(fillQty, fillPrice);
  if (order.side === "BUY") {
    await tx`
      INSERT INTO annytrade.account_ledger_entries (
        account_id, category, amount, currency, memo, related_order_id
      ) VALUES (
        ${order.account_id},
        'TRADE_DEBIT',
        ${-notional},
        'USD',
        ${`Paper BUY ${order.symbol}`},
        ${order.id}
      )
    `;
  } else {
    await tx`
      INSERT INTO annytrade.account_ledger_entries (
        account_id, category, amount, currency, memo, related_order_id
      ) VALUES (
        ${order.account_id},
        'TRADE_CREDIT',
        ${notional},
        'USD',
        ${`Paper SELL ${order.symbol}`},
        ${order.id}
      )
    `;
  }

  if (fee > 0) {
    await tx`
      INSERT INTO annytrade.account_ledger_entries (
        account_id, category, amount, currency, memo, related_order_id
      ) VALUES (
        ${order.account_id},
        'FEE',
        ${-fee},
        'USD',
        ${`Paper fee ${order.symbol}`},
        ${order.id}
      )
    `;
  }

  // Cash check after debit for buys
  if (order.side === "BUY") {
    const bal = await ledgerBalanceTx(tx, order.account_id);
    if (bal < -1e-6) {
      throw new ApiError(
        400,
        "INSUFFICIENT_CASH",
        "Insufficient paper cash for fill",
      );
    }
  }

  await applyPositionFill(tx, {
    accountId: order.account_id,
    userId: order.user_id,
    symbol: order.symbol,
    side: order.side,
    quantity: fillQty,
    price: fillPrice,
  });

  const updated = await tx<DbOrder[]>`
    UPDATE annytrade.orders SET
      filled_quantity = ${newFilled},
      average_fill_price = ${newAvg},
      status = ${nextStatus},
      updated_at = NOW()
    WHERE id = ${order.id}
    RETURNING *
  `;

  return { order: updated[0]!, duplicate: false };
}

function remainingQty(order: DbOrder): number {
  return roundMoney(Number(order.quantity) - Number(order.filled_quantity));
}

async function resolveQuote(symbol: string): Promise<Quote> {
  try {
    return await marketDataService.quote(symbol);
  } catch (error) {
    if (error instanceof MarketDataError) {
      throw new ApiError(
        error.status === 404 ? 400 : 503,
        error.code,
        error.message,
      );
    }
    throw new ApiError(503, "MARKET_DATA", "Market data unavailable");
  }
}

/**
 * Evaluate whether an OPEN/PENDING resting order should fill given a quote.
 * Returns fill price or null if not eligible.
 */
export function evaluateRestingOrder(
  order: DbOrder,
  quote: Quote,
): { fillPrice: number; activateOnly?: boolean } | null {
  const last = referenceLast(quote);
  if (last == null) return null;

  const limit = order.limit_price == null ? null : Number(order.limit_price);
  const stop = order.stop_price == null ? null : Number(order.stop_price);
  const activated = Boolean(order.activated_at);

  if (order.order_type === "LIMIT") {
    if (limit == null) return null;
    if (order.side === "BUY") {
      const ask = marketBuyPrice(quote);
      if (ask == null || ask > limit) return null;
      return { fillPrice: Math.min(limit, ask) };
    }
    const bid = marketSellPrice(quote);
    if (bid == null || bid < limit) return null;
    return { fillPrice: Math.max(limit, bid) };
  }

  if (order.order_type === "STOP") {
    if (stop == null) return null;
    if (order.side === "BUY") {
      if (!activated && last < stop) return null;
      const px = marketBuyPrice(quote);
      if (px == null) return null;
      return { fillPrice: px };
    }
    if (!activated && last > stop) return null;
    const px = marketSellPrice(quote);
    if (px == null) return null;
    return { fillPrice: px };
  }

  if (order.order_type === "STOP_LIMIT") {
    if (stop == null || limit == null) return null;
    if (order.side === "BUY") {
      if (!activated && last < stop) return null;
      // After activation, behave as limit
      const ask = marketBuyPrice(quote);
      if (ask == null || ask > limit) {
        return activated || last >= stop
          ? { fillPrice: 0, activateOnly: true }
          : null;
      }
      return { fillPrice: Math.min(limit, ask) };
    }
    if (!activated && last > stop) return null;
    const bid = marketSellPrice(quote);
    if (bid == null || bid < limit) {
      return activated || last <= stop
        ? { fillPrice: 0, activateOnly: true }
        : null;
    }
    return { fillPrice: Math.max(limit, bid) };
  }

  return null;
}

async function activateStopIfNeeded(
  tx: Tx,
  order: DbOrder,
  quote: Quote,
): Promise<DbOrder> {
  if (order.activated_at) return order;
  if (order.order_type !== "STOP" && order.order_type !== "STOP_LIMIT") {
    return order;
  }
  const stop = order.stop_price == null ? null : Number(order.stop_price);
  const last = referenceLast(quote);
  if (stop == null || last == null) return order;

  const shouldActivate = order.side === "BUY" ? last >= stop : last <= stop;
  if (!shouldActivate) return order;

  const rows = await tx<DbOrder[]>`
    UPDATE annytrade.orders SET
      activated_at = NOW(),
      status = CASE WHEN status = 'PENDING' THEN 'OPEN' ELSE status END,
      updated_at = NOW()
    WHERE id = ${order.id}
    RETURNING *
  `;
  return rows[0] ?? order;
}

async function tryFillOrder(
  orderId: string,
  userId: string,
): Promise<DbOrder | null> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const locked = await tx<DbOrder[]>`
      SELECT * FROM annytrade.orders
      WHERE id = ${orderId} AND user_id = ${userId}
      FOR UPDATE
    `;
    let order = locked[0];
    if (!order) return null;
    if (!["PENDING", "OPEN", "PARTIALLY_FILLED"].includes(order.status)) {
      return order;
    }

    await lockAccount(tx, order.account_id);
    const quote = await resolveQuote(order.symbol);
    order = await activateStopIfNeeded(tx, order, quote);

    if (order.order_type === "MARKET") {
      const rem = remainingQty(order);
      if (rem <= 0) return order;
      const px =
        order.side === "BUY" ? marketBuyPrice(quote) : marketSellPrice(quote);
      if (px == null) {
        throw new ApiError(503, "MARKET_DATA", "No executable paper price");
      }
      if (order.side === "BUY") {
        const need = add(mul(rem, px), paperFeeAmount(mul(rem, px)));
        const cash = await availableCashTx(tx, order.account_id);
        // For market, reservation uses 0 limit — check raw balance minus other reserves
        const bal = await ledgerBalanceTx(tx, order.account_id);
        const reservedOthers = await reservedBuyNotionalTx(
          tx,
          order.account_id,
        );
        if (bal - reservedOthers < need - 1e-8 && cash < need - 1e-8) {
          // Reject remaining if cannot afford
          if (Number(order.filled_quantity) === 0) {
            const rejected = await tx<DbOrder[]>`
              UPDATE annytrade.orders SET
                status = 'REJECTED',
                reject_reason = 'Insufficient paper cash',
                updated_at = NOW()
              WHERE id = ${order.id}
              RETURNING *
            `;
            return rejected[0]!;
          }
          return order;
        }
      } else {
        const owned = await positionQtyTx(tx, order.account_id, order.symbol);
        if (rem > owned + 1e-8) {
          if (Number(order.filled_quantity) === 0) {
            const rejected = await tx<DbOrder[]>`
              UPDATE annytrade.orders SET
                status = 'REJECTED',
                reject_reason = 'Insufficient position quantity',
                updated_at = NOW()
              WHERE id = ${order.id}
              RETURNING *
            `;
            return rejected[0]!;
          }
          return order;
        }
      }
      const fillKey = `fill:${order.id}:${Number(order.filled_quantity)}:${rem}:${px}`;
      const result = await insertFillAtomic(tx, order, rem, px, fillKey);
      return result.order;
    }

    const evalResult = evaluateRestingOrder(order, quote);
    if (!evalResult) return order;
    if (evalResult.activateOnly) return order;

    const rem = remainingQty(order);
    if (rem <= 0) return order;
    const px = evalResult.fillPrice;

    if (order.side === "BUY") {
      const need = add(mul(rem, px), paperFeeAmount(mul(rem, px)));
      const bal = await ledgerBalanceTx(tx, order.account_id);
      // Exclude this order's reservation from reserved sum for cash check
      const reserved = await reservedBuyNotionalTx(tx, order.account_id);
      const thisReserve = mul(
        rem,
        Number(order.limit_price ?? order.stop_price ?? px),
      );
      const available = bal - (reserved - thisReserve);
      if (available < need - 1e-8) return order;
    } else {
      const owned = await positionQtyTx(tx, order.account_id, order.symbol);
      if (rem > owned + 1e-8) return order;
    }

    const fillKey = `fill:${order.id}:${Number(order.filled_quantity)}:${rem}:${px}`;
    const result = await insertFillAtomic(tx, order, rem, px, fillKey);
    return result.order;
  });
}

export async function submitPaperOrder(
  input: SubmitOrderInput,
): Promise<{ order: PublicOrder; replayed: boolean }> {
  const symbol = normalizeSymbol(input.symbol);
  const quantity = requirePositive(input.quantity, "quantity");
  const side = input.side;
  const orderType = input.orderType;

  if (input.idempotencyKey) {
    const existing = await findOrderByIdempotency(
      input.userId,
      input.idempotencyKey,
    );
    if (existing) {
      return { order: toPublicOrder(existing), replayed: true };
    }
  }

  const accounts = await listAccountsForUser(input.userId);
  const account =
    (input.accountId
      ? accounts.find((a) => a.id === input.accountId)
      : accounts[0]) ?? null;
  if (!account || account.user_id !== input.userId) {
    throw new ApiError(404, "NOT_FOUND", "Paper account not found");
  }
  if (account.status !== "ACTIVE") {
    throw new ApiError(403, "ACCOUNT_INACTIVE", "Paper account is not active");
  }

  // Validate prices for order types
  if (orderType === "LIMIT") {
    if (input.limitPrice == null || input.limitPrice <= 0) {
      throw new ApiError(
        400,
        "VALIDATION",
        "limitPrice required for LIMIT orders",
      );
    }
  }
  if (orderType === "STOP") {
    if (input.stopPrice == null || input.stopPrice <= 0) {
      throw new ApiError(
        400,
        "VALIDATION",
        "stopPrice required for STOP orders",
      );
    }
  }
  if (orderType === "STOP_LIMIT") {
    if (
      input.stopPrice == null ||
      input.stopPrice <= 0 ||
      input.limitPrice == null ||
      input.limitPrice <= 0
    ) {
      throw new ApiError(
        400,
        "VALIDATION",
        "stopPrice and limitPrice required for STOP_LIMIT orders",
      );
    }
  }

  let quote: Quote;
  try {
    quote = await resolveQuote(symbol);
    // Also ensure instrument exists
    await marketDataService.instrument(symbol);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      400,
      "SYMBOL",
      "Instrument unavailable for paper trading",
    );
  }

  // Pre-validate cash / position
  if (side === "BUY") {
    const est = estimateBuyNotional(
      orderType,
      quantity,
      quote,
      input.limitPrice,
      input.stopPrice,
    );
    const fee = paperFeeAmount(est);
    const { available } = await getAvailableCash(account.id);
    if (available + 1e-8 < est + fee && orderType === "MARKET") {
      const rejected = await insertOrder({
        accountId: account.id,
        userId: input.userId,
        symbol,
        side,
        orderType,
        quantity,
        limitPrice: input.limitPrice,
        stopPrice: input.stopPrice,
        status: "REJECTED",
        rejectReason: "Insufficient paper cash",
        idempotencyKey: input.idempotencyKey,
      });
      await recordAuditEvent({
        userId: input.userId,
        eventType: "order.rejected",
        metadata: { orderId: rejected.id, reason: "INSUFFICIENT_CASH", symbol },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      return { order: toPublicOrder(rejected), replayed: false };
    }
    if (orderType !== "MARKET" && available + 1e-8 < est + fee) {
      throw new ApiError(
        400,
        "INSUFFICIENT_CASH",
        "Insufficient paper cash for order",
      );
    }
  } else {
    const pos = await getPositionForAccountSymbol(account.id, symbol);
    const owned = pos ? Number(pos.quantity) : 0;
    if (owned + 1e-8 < quantity) {
      const rejected = await insertOrder({
        accountId: account.id,
        userId: input.userId,
        symbol,
        side,
        orderType,
        quantity,
        limitPrice: input.limitPrice,
        stopPrice: input.stopPrice,
        status: "REJECTED",
        rejectReason: "Insufficient position quantity (long-only paper)",
        idempotencyKey: input.idempotencyKey,
      });
      await recordAuditEvent({
        userId: input.userId,
        eventType: "order.rejected",
        metadata: { orderId: rejected.id, reason: "OVERSELL", symbol },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      return { order: toPublicOrder(rejected), replayed: false };
    }
  }

  const initialStatus: DbOrder["status"] =
    orderType === "MARKET" ? "PENDING" : "OPEN";

  let created: DbOrder;
  try {
    created = await insertOrder({
      accountId: account.id,
      userId: input.userId,
      symbol,
      side,
      orderType,
      quantity,
      limitPrice: input.limitPrice,
      stopPrice: input.stopPrice,
      status: initialStatus,
      idempotencyKey: input.idempotencyKey,
    });
  } catch (error) {
    // Unique idempotency race
    if (
      input.idempotencyKey &&
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      const existing = await findOrderByIdempotency(
        input.userId,
        input.idempotencyKey,
      );
      if (existing) return { order: toPublicOrder(existing), replayed: true };
    }
    throw error;
  }

  await recordAuditEvent({
    userId: input.userId,
    eventType: "order.submitted",
    metadata: {
      orderId: created.id,
      symbol,
      side,
      orderType,
      quantity,
      paper: true,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  // Attempt immediate fill / evaluation
  const filled = await tryFillOrder(created.id, input.userId);
  const finalOrder = filled ?? created;

  if (
    finalOrder.status === "FILLED" ||
    finalOrder.status === "PARTIALLY_FILLED"
  ) {
    await recordAuditEvent({
      userId: input.userId,
      eventType: "execution.created",
      metadata: {
        orderId: finalOrder.id,
        status: finalOrder.status,
        filledQuantity: Number(finalOrder.filled_quantity),
        averageFillPrice: finalOrder.average_fill_price,
        paper: true,
      },
    });
    try {
      const { createNotification } = await import("../repos/notifications");
      await createNotification({
        userId: input.userId,
        type: "order",
        title: `PAPER ${finalOrder.side} ${finalOrder.symbol} ${finalOrder.status}`,
        message: `Filled ${Number(finalOrder.filled_quantity)} @ ${
          finalOrder.average_fill_price ?? "n/a"
        }. Simulated fill only.`,
      });
    } catch {
      /* best-effort */
    }
    try {
      const { recordPaperEquitySnapshot } =
        await import("../portfolio/service");
      await recordPaperEquitySnapshot(input.userId, account.id);
    } catch {
      // snapshot is best-effort
    }

    // Bracket exits for long-only: after BUY fill, place TP limit + SL stop sells.
    if (
      finalOrder.side === "BUY" &&
      finalOrder.status === "FILLED" &&
      (input.takeProfitPrice || input.stopLossPrice)
    ) {
      const qty = Number(finalOrder.filled_quantity);
      if (input.takeProfitPrice && qty > 0) {
        try {
          await submitPaperOrder({
            userId: input.userId,
            accountId: account.id,
            symbol,
            side: "SELL",
            orderType: "LIMIT",
            quantity: qty,
            limitPrice: input.takeProfitPrice,
            idempotencyKey: input.idempotencyKey
              ? `${input.idempotencyKey}:tp`
              : `tp-${finalOrder.id}`,
          });
        } catch {
          /* bracket best-effort */
        }
      }
      if (input.stopLossPrice && qty > 0) {
        try {
          await submitPaperOrder({
            userId: input.userId,
            accountId: account.id,
            symbol,
            side: "SELL",
            orderType: "STOP",
            quantity: qty,
            stopPrice: input.stopLossPrice,
            idempotencyKey: input.idempotencyKey
              ? `${input.idempotencyKey}:sl`
              : `sl-${finalOrder.id}`,
          });
        } catch {
          /* bracket best-effort */
        }
      }
    }
  }

  return { order: toPublicOrder(finalOrder), replayed: false };
}

export async function amendPaperOrder(input: {
  userId: string;
  orderId: string;
  limitPrice?: number | null;
  stopPrice?: number | null;
  quantity?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<PublicOrder> {
  const sql = getSql();
  const order = await sql.begin(async (tx) => {
    const rows = await tx<DbOrder[]>`
      SELECT * FROM annytrade.orders
      WHERE id = ${input.orderId} AND user_id = ${input.userId}
      FOR UPDATE
    `;
    const current = rows[0];
    if (!current) throw new ApiError(404, "NOT_FOUND", "Order not found");
    if (!["PENDING", "OPEN", "PARTIALLY_FILLED"].includes(current.status)) {
      throw new ApiError(409, "NOT_AMENDABLE", "Order cannot be amended");
    }
    const nextQty =
      input.quantity != null ? input.quantity : Number(current.quantity);
    if (nextQty < Number(current.filled_quantity)) {
      throw new ApiError(
        400,
        "INVALID_QTY",
        "Quantity cannot be below filled amount",
      );
    }
    const nextLimit =
      input.limitPrice !== undefined
        ? input.limitPrice
        : current.limit_price != null
          ? Number(current.limit_price)
          : null;
    const nextStop =
      input.stopPrice !== undefined
        ? input.stopPrice
        : current.stop_price != null
          ? Number(current.stop_price)
          : null;
    const updated = await tx<DbOrder[]>`
      UPDATE annytrade.orders SET
        quantity = ${nextQty},
        limit_price = ${nextLimit},
        stop_price = ${nextStop},
        updated_at = NOW()
      WHERE id = ${current.id}
      RETURNING *
    `;
    return updated[0]!;
  });

  await recordAuditEvent({
    userId: input.userId,
    eventType: "order.amended",
    metadata: {
      orderId: order.id,
      limitPrice: order.limit_price,
      stopPrice: order.stop_price,
      quantity: order.quantity,
      paper: true,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const filled = await tryFillOrder(order.id, input.userId);
  return toPublicOrder(filled ?? order);
}

export async function cancelPaperOrder(input: {
  userId: string;
  orderId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<PublicOrder> {
  const sql = getSql();
  const order = await sql.begin(async (tx) => {
    const rows = await tx<DbOrder[]>`
      SELECT * FROM annytrade.orders
      WHERE id = ${input.orderId} AND user_id = ${input.userId}
      FOR UPDATE
    `;
    const current = rows[0];
    if (!current) throw new ApiError(404, "NOT_FOUND", "Order not found");
    if (!["PENDING", "OPEN", "PARTIALLY_FILLED"].includes(current.status)) {
      throw new ApiError(409, "NOT_CANCELLABLE", "Order cannot be cancelled");
    }
    const updated = await tx<DbOrder[]>`
      UPDATE annytrade.orders SET
        status = 'CANCELLED',
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = ${current.id}
      RETURNING *
    `;
    return updated[0]!;
  });

  await recordAuditEvent({
    userId: input.userId,
    eventType: "order.cancelled",
    metadata: { orderId: order.id, symbol: order.symbol, paper: true },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return toPublicOrder(order);
}

export async function processOpenOrdersForAccount(
  userId: string,
  accountId: string,
): Promise<{ processed: number; filled: number }> {
  const account = await getAccountForUser(accountId, userId);
  if (!account) throw new ApiError(404, "NOT_FOUND", "Account not found");

  const open = await listOpenOrdersForAccount(accountId);
  let filled = 0;
  for (const order of open) {
    const before = order.status;
    const after = await tryFillOrder(order.id, userId);
    if (
      after &&
      (after.status === "FILLED" || after.status === "PARTIALLY_FILLED") &&
      before !== after.status
    ) {
      filled += 1;
      await recordAuditEvent({
        userId,
        eventType: "execution.created",
        metadata: {
          orderId: after.id,
          status: after.status,
          paper: true,
          source: "process",
        },
      });
      try {
        const { createNotification } = await import("../repos/notifications");
        await createNotification({
          userId,
          type: "order",
          title: `PAPER ${after.side} ${after.symbol} ${after.status}`,
          message: `Resting order filled ${Number(after.filled_quantity)} @ ${
            after.average_fill_price ?? "n/a"
          }. Simulated fill only.`,
        });
      } catch {
        /* best-effort */
      }
    }
  }
  return { processed: open.length, filled };
}

export async function getPaperOrderDetail(userId: string, orderId: string) {
  const order = await getOrderForUser(orderId, userId);
  if (!order) throw new ApiError(404, "NOT_FOUND", "Order not found");
  const executions = await listExecutionsForOrder(orderId, userId);
  return {
    order: toPublicOrder(order),
    executions: executions.map(toPublicExecution),
  };
}

export async function listPaperOrders(
  userId: string,
  options?: { accountId?: string; openOnly?: boolean },
) {
  if (options?.accountId) {
    await processOpenOrdersForAccount(userId, options.accountId).catch(
      () => null,
    );
  } else {
    const accounts = await listAccountsForUser(userId);
    if (accounts[0]) {
      await processOpenOrdersForAccount(userId, accounts[0].id).catch(
        () => null,
      );
    }
  }

  const statuses = options?.openOnly
    ? (["PENDING", "OPEN", "PARTIALLY_FILLED"] as const)
    : undefined;
  const orders = await listOrdersForUser(userId, {
    accountId: options?.accountId,
    status: statuses ? [...statuses] : undefined,
  });
  return orders.map(toPublicOrder);
}

export async function listPaperPositions(
  userId: string,
  accountId?: string,
): Promise<PublicPosition[]> {
  const accounts = await listAccountsForUser(userId);
  const account =
    (accountId ? accounts.find((a) => a.id === accountId) : accounts[0]) ??
    null;
  if (!account) return [];

  await processOpenOrdersForAccount(userId, account.id).catch(() => null);

  const positions = await listOpenPositionsForUser(userId, account.id);
  const symbols = positions.map((p) => p.symbol);
  let quotes: Quote[] = [];
  if (symbols.length > 0) {
    try {
      quotes = await marketDataService.quotes(symbols);
    } catch {
      quotes = [];
    }
  }
  const qmap = new Map(quotes.map((q) => [q.symbol, q]));
  return positions.map((p) => {
    const q = qmap.get(p.symbol);
    const mark = q ? referenceLast(q) : null;
    return toPublicPosition(p, { markPrice: mark });
  });
}

export async function listPaperClosedPositions(
  userId: string,
  accountId?: string,
): Promise<PublicPosition[]> {
  const rows = await listClosedPositionsForUser(userId, accountId);
  return rows.map((p) => toPublicPosition(p));
}

export async function getPaperAccountSummary(
  userId: string,
  accountId?: string,
) {
  const accounts = await listAccountsForUser(userId);
  const account =
    (accountId ? accounts.find((a) => a.id === accountId) : accounts[0]) ??
    null;
  if (!account) throw new ApiError(404, "NOT_FOUND", "Paper account not found");

  const cash = await getAvailableCash(account.id);
  const positions = await listPaperPositions(userId, account.id);
  const unrealized = positions.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0);
  const equity = roundMoney(cash.balance + unrealized);

  return {
    accountId: account.id,
    currency: account.base_currency,
    paper: true as const,
    cashBalance: cash.balance,
    reserved: cash.reserved,
    availableCash: cash.available,
    unrealizedPnl: unrealized,
    equity,
    positions,
  };
}

// Exported for tests
export const __test = {
  evaluateRestingOrder,
  insertFillAtomic,
  tryFillOrder,
  paperFeeAmount,
  marketBuyPrice,
  marketSellPrice,
  parseDecimal,
};
