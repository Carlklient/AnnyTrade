import type { BrokerProvider } from "../provider";
import type {
  BrokerAccountInfo,
  BrokerCredentials,
  BrokerExecution,
  BrokerOrder,
  BrokerOrderRequest,
  BrokerPosition,
} from "../types";

/**
 * Deterministic in-memory broker for CI fixtures.
 * Never contacts a network. Environment is always SANDBOX.
 */
export function createTestBrokerProvider(): BrokerProvider {
  const orders = new Map<string, BrokerOrder>();
  const byClient = new Map<string, string>();
  const executions: BrokerExecution[] = [];
  let cash = 100_000;
  const positions = new Map<string, BrokerPosition>();

  const account = (): BrokerAccountInfo => ({
    externalAccountId: "test-sandbox-account",
    status: "ACTIVE",
    currency: "USD",
    cash,
    buyingPower: cash,
    equity: cash,
    liveMoney: false,
    environment: "SANDBOX",
    label: "Broker Paper, Test Sandbox",
  });

  return {
    meta: {
      providerId: "test",
      providerLabel: "AnnyTrade Test Broker Sandbox",
      environment: "SANDBOX",
      supportsStreaming: false,
      supportedOrderTypes: ["MARKET", "LIMIT", "STOP", "STOP_LIMIT"],
      supportedAssetsNote: "Fixture symbols only (e.g. AAPL, MSFT).",
      limitations: ["In-memory only", "No network", "For automated tests"],
      officialDocsUrl: "https://docs.alpaca.markets/docs/paper-trading",
    },

    async connect(_c: BrokerCredentials) {
      if (!_c.apiKeyId || !_c.apiSecretKey) {
        throw new Error("Test broker credentials required");
      }
      return account();
    },

    async getAccount() {
      return account();
    },

    async getBuyingPower() {
      return cash;
    },

    async getPositions() {
      return [...positions.values()];
    },

    async submitOrder(_c, order: BrokerOrderRequest) {
      const existing = byClient.get(order.clientOrderId);
      if (existing) return orders.get(existing)!;

      if (order.symbol.toUpperCase() === "REJECT") {
        const id = `test-ord-${orders.size + 1}`;
        const rejected: BrokerOrder = {
          brokerOrderId: id,
          clientOrderId: order.clientOrderId,
          symbol: order.symbol.toUpperCase(),
          side: order.side,
          orderType: order.orderType,
          quantity: order.quantity,
          filledQuantity: 0,
          limitPrice: order.limitPrice ?? null,
          stopPrice: order.stopPrice ?? null,
          averageFillPrice: null,
          status: "REJECTED",
          brokerRawStatus: "rejected",
          rejectReason: "Fixture forced reject",
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        orders.set(id, rejected);
        byClient.set(order.clientOrderId, id);
        return rejected;
      }

      const price = order.limitPrice ?? 100;
      const notional = price * order.quantity;
      if (order.side === "BUY" && notional > cash) {
        const id = `test-ord-${orders.size + 1}`;
        const rejected: BrokerOrder = {
          brokerOrderId: id,
          clientOrderId: order.clientOrderId,
          symbol: order.symbol.toUpperCase(),
          side: order.side,
          orderType: order.orderType,
          quantity: order.quantity,
          filledQuantity: 0,
          limitPrice: order.limitPrice ?? null,
          stopPrice: order.stopPrice ?? null,
          averageFillPrice: null,
          status: "REJECTED",
          brokerRawStatus: "rejected",
          rejectReason: "Insufficient buying power",
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        orders.set(id, rejected);
        byClient.set(order.clientOrderId, id);
        return rejected;
      }

      const id = `test-ord-${orders.size + 1}`;
      if (order.side === "BUY") cash -= notional;
      else cash += notional;

      const pos = positions.get(order.symbol.toUpperCase()) ?? {
        symbol: order.symbol.toUpperCase(),
        quantity: 0,
        averageEntry: 0,
        marketValue: null,
        unrealizedPl: null,
      };
      if (order.side === "BUY") {
        const newQty = pos.quantity + order.quantity;
        pos.averageEntry =
          newQty === 0
            ? 0
            : (pos.averageEntry * pos.quantity + price * order.quantity) /
              newQty;
        pos.quantity = newQty;
      } else {
        pos.quantity = Math.max(0, pos.quantity - order.quantity);
      }
      positions.set(pos.symbol, pos);

      const filled: BrokerOrder = {
        brokerOrderId: id,
        clientOrderId: order.clientOrderId,
        symbol: order.symbol.toUpperCase(),
        side: order.side,
        orderType: order.orderType,
        quantity: order.quantity,
        filledQuantity: order.quantity,
        limitPrice: order.limitPrice ?? null,
        stopPrice: order.stopPrice ?? null,
        averageFillPrice: price,
        status: "FILLED",
        brokerRawStatus: "filled",
        rejectReason: null,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      orders.set(id, filled);
      byClient.set(order.clientOrderId, id);
      executions.push({
        externalExecutionId: `test-fill-${id}`,
        brokerOrderId: id,
        symbol: filled.symbol,
        side: filled.side,
        quantity: filled.quantity,
        price,
        executedAt: new Date().toISOString(),
      });
      return filled;
    },

    async cancelOrder(_c, brokerOrderId) {
      const o = orders.get(brokerOrderId);
      if (!o) throw new Error("Order not found");
      if (o.status === "FILLED") return o;
      const cancelled = {
        ...o,
        status: "CANCELLED" as const,
        brokerRawStatus: "canceled",
        updatedAt: new Date().toISOString(),
      };
      orders.set(brokerOrderId, cancelled);
      return cancelled;
    },

    async getOrder(_c, brokerOrderId) {
      const o = orders.get(brokerOrderId);
      if (!o) throw new Error("Order not found");
      return o;
    },

    async listOrders() {
      return [...orders.values()];
    },

    async listExecutions() {
      return executions;
    },
  };
}
