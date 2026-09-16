/**
 * Canonical broker domain types — AnnyTrade never imports vendor SDKs here.
 * Environment is SANDBOX-only for Phase 7 (no real-money LIVE).
 */

export type BrokerEnvironment = "SANDBOX";

export type BrokerOrderSide = "BUY" | "SELL";
export type BrokerOrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
export type BrokerOrderStatus =
  | "PENDING"
  | "SUBMITTED"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED"
  | "ERROR";

export type BrokerAccountInfo = {
  externalAccountId: string;
  status: string;
  currency: string;
  cash: number;
  buyingPower: number;
  equity: number;
  /** Always false in Phase 7 — sandbox/paper only. */
  liveMoney: false;
  environment: BrokerEnvironment;
  label: string;
};

export type BrokerPosition = {
  symbol: string;
  quantity: number;
  averageEntry: number;
  marketValue: number | null;
  unrealizedPl: number | null;
};

export type BrokerOrderRequest = {
  clientOrderId: string;
  symbol: string;
  side: BrokerOrderSide;
  orderType: BrokerOrderType;
  quantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  timeInForce?: "day" | "gtc" | "ioc";
};

export type BrokerOrder = {
  brokerOrderId: string;
  clientOrderId: string;
  symbol: string;
  side: BrokerOrderSide;
  orderType: BrokerOrderType;
  quantity: number;
  filledQuantity: number;
  limitPrice: number | null;
  stopPrice: number | null;
  averageFillPrice: number | null;
  status: BrokerOrderStatus;
  brokerRawStatus: string;
  rejectReason: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
};

export type BrokerExecution = {
  externalExecutionId: string;
  brokerOrderId: string;
  symbol: string;
  side: BrokerOrderSide;
  quantity: number;
  price: number;
  executedAt: string;
};

export type BrokerProviderMeta = {
  providerId: string;
  providerLabel: string;
  environment: BrokerEnvironment;
  supportsStreaming: boolean;
  supportedOrderTypes: BrokerOrderType[];
  supportedAssetsNote: string;
  limitations: string[];
  officialDocsUrl: string;
};

export type BrokerCredentials = {
  apiKeyId: string;
  apiSecretKey: string;
};

export type BrokerOrderUpdateHandler = (order: BrokerOrder) => void;

export type BrokerOrderSubscription = {
  unsubscribe: () => void;
};
