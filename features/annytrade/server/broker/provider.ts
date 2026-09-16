import type {
  BrokerAccountInfo,
  BrokerCredentials,
  BrokerExecution,
  BrokerOrder,
  BrokerOrderRequest,
  BrokerOrderSubscription,
  BrokerOrderUpdateHandler,
  BrokerPosition,
  BrokerProviderMeta,
} from "./types";

/**
 * BrokerProvider — vendor-agnostic trading adapter.
 * Phase 7: SANDBOX / paper brokers only. Real-money LIVE must not be implemented here.
 */
export interface BrokerProvider {
  readonly meta: BrokerProviderMeta;

  /** Validate credentials against the official sandbox endpoint. */
  connect(credentials: BrokerCredentials): Promise<BrokerAccountInfo>;

  getAccount(credentials: BrokerCredentials): Promise<BrokerAccountInfo>;
  getBuyingPower(credentials: BrokerCredentials): Promise<number>;
  getPositions(credentials: BrokerCredentials): Promise<BrokerPosition[]>;

  submitOrder(
    credentials: BrokerCredentials,
    order: BrokerOrderRequest,
  ): Promise<BrokerOrder>;

  cancelOrder(
    credentials: BrokerCredentials,
    brokerOrderId: string,
  ): Promise<BrokerOrder>;

  getOrder(
    credentials: BrokerCredentials,
    brokerOrderId: string,
  ): Promise<BrokerOrder>;

  listOrders(
    credentials: BrokerCredentials,
    options?: { status?: "open" | "closed" | "all"; limit?: number },
  ): Promise<BrokerOrder[]>;

  listExecutions?(
    credentials: BrokerCredentials,
    options?: { orderId?: string; limit?: number },
  ): Promise<BrokerExecution[]>;

  /**
   * Optional streaming of order updates (e.g. Alpaca trade updates).
   * Providers without streaming omit this; callers poll + reconcile.
   */
  subscribeOrderUpdates?(
    credentials: BrokerCredentials,
    onUpdate: BrokerOrderUpdateHandler,
  ): BrokerOrderSubscription;
}
