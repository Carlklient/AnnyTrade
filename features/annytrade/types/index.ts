export type AccountMode = "demo" | "live";

export type AssetClass =
  "forex" | "crypto" | "stocks" | "indices" | "commodities" | "etfs";

export type MarketStatus = "open" | "closed" | "premarket" | "afterhours";

export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop";
export type OrderStatus =
  "pending" | "filled" | "rejected" | "cancelled" | "partial";

export type PositionStatus = "open" | "closed";

export type SignalDirection = "BUY" | "SELL";
export type SignalStatus = "Active" | "Won" | "Lost" | "Expired";

export type TransactionStatus =
  "Completed" | "Pending" | "Processing" | "Failed" | "Reversed";

export type TransactionType =
  "deposit" | "withdrawal" | "transfer" | "trade" | "fee";

export type NotificationKind =
  | "price"
  | "signal"
  | "order"
  | "deposit"
  | "withdrawal"
  | "margin"
  | "news"
  | "security";

export type User = {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  accountLevel: "Standard" | "Pro" | "Elite";
  kycStatus: "Unverified" | "Pending" | "Verified";
  twoFactorEnabled: boolean;
  preferredMarkets: AssetClass[];
  experience: "beginner" | "intermediate" | "advanced";
  riskPreference: "conservative" | "balanced" | "aggressive";
};

export type TradingAccount = {
  id: string;
  mode: AccountMode;
  currency: string;
  leverage: number;
  balance: number;
  available: number;
  equity: number;
  unrealizedPnl: number;
  dailyPnl: number;
  marginUsed: number;
  freeMargin: number;
};

export type Asset = {
  id: string;
  symbol: string;
  name: string;
  class: AssetClass;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  changePct: number;
  changeAbs: number;
  high: number;
  low: number;
  volume: number;
  status: MarketStatus;
  favorite: boolean;
  sparkline: number[];
};

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type PriceData = {
  symbol: string;
  candles: Candle[];
  timeframe: string;
};

export type Position = {
  id: string;
  symbol: string;
  name: string;
  side: OrderSide;
  size: number;
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  margin: number;
  openedAt: string;
  status: PositionStatus;
  closedAt?: string;
  realizedPnl?: number;
};

export type Order = {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  size: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: OrderStatus;
  createdAt: string;
  filledAt?: string;
  rejectReason?: string;
};

export type Signal = {
  id: string;
  symbol: string;
  assetName: string;
  assetClass: AssetClass;
  direction: SignalDirection;
  entry: number;
  stopLoss: number;
  takeProfits: number[];
  timeframe: string;
  confidence: number;
  strength: "Low" | "Medium" | "High";
  strategy: string;
  issuedAt: string;
  status: SignalStatus;
  riskReward: number;
  reasoning: string;
};

export type WalletBalance = {
  currency: string;
  available: number;
  trading: number;
  total: number;
};

export type Wallet = {
  balances: WalletBalance[];
  fundingMethods: { id: string; name: string; type: string }[];
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  method: string;
  createdAt: string;
  completedAt?: string;
  note?: string;
};

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type NewsArticle = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  impact: "low" | "medium" | "high";
  publishedAt: string;
  bookmarked: boolean;
  featured?: boolean;
};

export type EconomicEvent = {
  id: string;
  date: string;
  time: string;
  country: string;
  currency: string;
  event: string;
  importance: "low" | "medium" | "high";
  previous: string;
  forecast: string;
  actual: string | null;
};

export type AnalyticsSummary = {
  accountGrowthPct: number;
  totalPnl: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  bestAsset: string;
  worstAsset: string;
  tradingVolume: number;
  averageDurationHours: number;
  longPct: number;
  shortPct: number;
  daily: { label: string; pnl: number }[];
  weekly: { label: string; pnl: number }[];
  monthly: { label: string; pnl: number }[];
  byMarket: { market: string; pnl: number }[];
  allocation: { label: string; pct: number }[];
};

export type OrderBookLevel = {
  price: number;
  size: number;
  total: number;
};

export type OrderBook = {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
};

export type TradeTicketDraft = {
  side: OrderSide;
  type: OrderType;
  size: number;
  leverage: number;
  limitPrice?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
};
