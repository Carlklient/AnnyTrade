export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  emailVerified: boolean;
  createdAt: string;
};

export type PublicProfile = {
  displayName: string;
  timezone: string;
  preferredCurrency: string;
  themePreference: "dark" | "light" | "system";
  defaultMarket: string;
  notifyOrders: boolean;
  notifySignals: boolean;
  notifySecurity: boolean;
  notifyMarketing: boolean;
  notifyPriceAlerts: boolean;
  notifyEmailAlerts: boolean;
};

export type PublicAccount = {
  id: string;
  accountType: "PAPER" | "BROKER_SANDBOX";
  baseCurrency: string;
  status: string;
  label: string;
  ledgerBalance: number;
  createdAt: string;
};

export type PublicWatchlist = {
  id: string;
  name: string;
  sortOrder: number;
  symbols: string[];
};

export type PublicNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type PublicOrder = {
  id: string;
  accountId: string;
  symbol: string;
  side: "BUY" | "SELL";
  orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  quantity: number;
  limitPrice: number | null;
  stopPrice: number | null;
  status:
    | "PENDING"
    | "OPEN"
    | "PARTIALLY_FILLED"
    | "FILLED"
    | "CANCELLED"
    | "REJECTED";
  filledQuantity: number;
  averageFillPrice: number | null;
  submittedAt: string;
  cancelledAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicPosition = {
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  averageEntry: number;
  costBasis: number;
  realizedPnl: number;
  openedAt: string;
  updatedAt: string;
  closedAt: string | null;
  markPrice: number | null;
  unrealizedPnl: number | null;
  marketValue: number | null;
};

export type PaperAccountSummary = {
  accountId: string;
  currency: string;
  paper: true;
  cashBalance: number;
  reserved: number;
  availableCash: number;
  unrealizedPnl: number;
  equity: number | null;
  positions: PublicPosition[];
  costBasis?: number;
  marketValue?: number;
  realizedPnl?: number;
  totalPnl?: number;
  feesPaid?: number;
  dailyPnl?: number | null;
  marksComplete?: boolean;
  unmarkedSymbols?: string[];
};

export type PortfolioAnalyticsResponse = {
  paper: true;
  accountId: string;
  currency: string;
  asOf: string;
  cash: number;
  reserved: number;
  availableCash: number;
  costBasis: number;
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  feesPaid: number;
  equity: number | null;
  dailyPnl: number | null;
  accountGrowthPct: number | null;
  marksComplete: boolean;
  unmarkedSymbols: string[];
  staleMarks: string[];
  allocation: { symbol: string; marketValue: number; pct: number }[];
  exposure: {
    grossMarketValue: number;
    netExposurePct: number | null;
    bySymbol: { symbol: string; marketValue: number; weightPct: number }[];
  };
  drawdown: {
    peakEquity: number | null;
    currentDrawdownPct: number | null;
    maxDrawdownPct: number | null;
    insufficientHistory: boolean;
  };
  tradeStats: {
    tradeCount: number;
    winningTrades: number;
    losingTrades: number;
    breakevenTrades: number;
    winRate: number | null;
    lossRate: number | null;
    averageWin: number | null;
    averageLoss: number | null;
    profitFactor: number | null;
    largestWin: number | null;
    largestLoss: number | null;
    averageDurationHours: number | null;
    bestAsset: string | null;
    worstAsset: string | null;
    tradingVolume: number;
    longPct: number;
    shortPct: number;
    insufficientHistory: boolean;
  };
  bySymbolPnl: { symbol: string; pnl: number }[];
  equityHistory: { asOf: string; equity: number }[];
  series: {
    daily: { label: string; equity: number; pnl: number }[];
    weekly: { label: string; equity: number; pnl: number }[];
    monthly: { label: string; equity: number; pnl: number }[];
  };
  positions: PublicPosition[];
  methodology: Record<string, string>;
};
