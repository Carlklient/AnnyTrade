import type {
  Asset,
  AssetClass,
  Candle,
  EconomicEvent,
  NewsArticle,
  NotificationItem,
  Order,
  OrderBook,
  Position,
  Signal,
  TradingAccount,
  Transaction,
  User,
  Wallet,
  AnalyticsSummary,
} from "../types";

function spark(seed: number, len = 24): number[] {
  const out: number[] = [];
  let v = 50 + (seed % 20);
  for (let i = 0; i < len; i++) {
    v += Math.sin(seed + i * 0.7) * 2.2 + ((seed * (i + 3)) % 7) * 0.15 - 0.5;
    out.push(Number(v.toFixed(2)));
  }
  return out;
}

function asset(
  partial: Omit<Asset, "sparkline" | "spread" | "changeAbs"> & {
    sparkline?: number[];
  },
): Asset {
  const spread = Number(
    (partial.ask - partial.bid).toFixed(partial.price > 50 ? 2 : 5),
  );
  return {
    ...partial,
    spread,
    changeAbs: Number(((partial.price * partial.changePct) / 100).toFixed(5)),
    sparkline: partial.sparkline ?? spark(partial.symbol.charCodeAt(0)),
  };
}

export const mockUser: User = {
  id: "usr_anny_01",
  name: "Aanu Demo",
  email: "demo@annytrade.app",
  avatarInitials: "AD",
  accountLevel: "Pro",
  kycStatus: "Verified",
  twoFactorEnabled: true,
  preferredMarkets: ["forex", "indices", "commodities"],
  experience: "intermediate",
  riskPreference: "balanced",
};

export const mockAccounts: Record<"demo" | "live", TradingAccount> = {
  demo: {
    id: "AT-DEMO-88421",
    mode: "demo",
    currency: "USD",
    leverage: 100,
    balance: 100_000,
    available: 86_420.55,
    equity: 101_842.33,
    unrealizedPnl: 1842.33,
    dailyPnl: 624.18,
    marginUsed: 13_579.45,
    freeMargin: 88_262.88,
  },
  live: {
    id: "AT-LIVE-10293",
    mode: "live",
    currency: "USD",
    leverage: 50,
    balance: 12_450.0,
    available: 9_820.4,
    equity: 12_918.22,
    unrealizedPnl: 468.22,
    dailyPnl: -82.4,
    marginUsed: 2_629.6,
    freeMargin: 10_288.62,
  },
};

export const mockAssets: Asset[] = [
  asset({
    id: "eurusd",
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    class: "forex",
    price: 1.08452,
    bid: 1.08448,
    ask: 1.08456,
    changePct: 0.18,
    high: 1.0861,
    low: 1.0819,
    volume: 184_220,
    status: "open",
    favorite: true,
  }),
  asset({
    id: "gbpusd",
    symbol: "GBPUSD",
    name: "British Pound / US Dollar",
    class: "forex",
    price: 1.27341,
    bid: 1.27335,
    ask: 1.27347,
    changePct: -0.22,
    high: 1.2778,
    low: 1.2712,
    volume: 142_880,
    status: "open",
    favorite: true,
  }),
  asset({
    id: "usdjpy",
    symbol: "USDJPY",
    name: "US Dollar / Japanese Yen",
    class: "forex",
    price: 149.862,
    bid: 149.855,
    ask: 149.869,
    changePct: 0.41,
    high: 150.12,
    low: 149.02,
    volume: 201_440,
    status: "open",
    favorite: false,
  }),
  asset({
    id: "btc",
    symbol: "BTCUSD",
    name: "Bitcoin",
    class: "crypto",
    price: 68420.5,
    bid: 68412.0,
    ask: 68429.0,
    changePct: 1.64,
    high: 69210,
    low: 67140,
    volume: 42_180,
    status: "open",
    favorite: true,
  }),
  asset({
    id: "eth",
    symbol: "ETHUSD",
    name: "Ethereum",
    class: "crypto",
    price: 3428.6,
    bid: 3427.9,
    ask: 3429.3,
    changePct: -0.85,
    high: 3512,
    low: 3398,
    volume: 68_920,
    status: "open",
    favorite: false,
  }),
  asset({
    id: "aapl",
    symbol: "AAPL",
    name: "Apple Inc.",
    class: "stocks",
    price: 214.32,
    bid: 214.28,
    ask: 214.36,
    changePct: 0.92,
    high: 216.1,
    low: 211.8,
    volume: 51_200_000,
    status: "open",
    favorite: false,
  }),
  asset({
    id: "nvda",
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    class: "stocks",
    price: 128.74,
    bid: 128.7,
    ask: 128.78,
    changePct: 2.18,
    high: 130.4,
    low: 125.9,
    volume: 98_400_000,
    status: "open",
    favorite: true,
  }),
  asset({
    id: "us500",
    symbol: "US500",
    name: "S&P 500 Index",
    class: "indices",
    price: 5624.8,
    bid: 5624.2,
    ask: 5625.4,
    changePct: 0.34,
    high: 5648,
    low: 5591,
    volume: 12_400,
    status: "open",
    favorite: true,
  }),
  asset({
    id: "nas100",
    symbol: "NAS100",
    name: "Nasdaq 100",
    class: "indices",
    price: 19842.5,
    bid: 19840.0,
    ask: 19845.0,
    changePct: 0.61,
    high: 19980,
    low: 19690,
    volume: 9_880,
    status: "open",
    favorite: false,
  }),
  asset({
    id: "xauusd",
    symbol: "XAUUSD",
    name: "Gold",
    class: "commodities",
    price: 2384.6,
    bid: 2384.2,
    ask: 2385.0,
    changePct: -0.28,
    high: 2401,
    low: 2372,
    volume: 88_420,
    status: "open",
    favorite: true,
  }),
  asset({
    id: "usoil",
    symbol: "USOIL",
    name: "Crude Oil WTI",
    class: "commodities",
    price: 78.42,
    bid: 78.38,
    ask: 78.46,
    changePct: 1.12,
    high: 79.1,
    low: 76.9,
    volume: 64_200,
    status: "open",
    favorite: false,
  }),
  asset({
    id: "spy",
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    class: "etfs",
    price: 561.18,
    bid: 561.12,
    ask: 561.24,
    changePct: 0.31,
    high: 563.5,
    low: 557.8,
    volume: 42_100_000,
    status: "open",
    favorite: false,
  }),
  asset({
    id: "qqq",
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    class: "etfs",
    price: 486.9,
    bid: 486.82,
    ask: 486.98,
    changePct: 0.55,
    high: 490.2,
    low: 482.4,
    volume: 28_600_000,
    status: "open",
    favorite: false,
  }),
  asset({
    id: "tsla",
    symbol: "TSLA",
    name: "Tesla Inc.",
    class: "stocks",
    price: 248.6,
    bid: 248.5,
    ask: 248.7,
    changePct: -1.42,
    high: 255.2,
    low: 246.1,
    volume: 72_300_000,
    status: "open",
    favorite: false,
  }),
];

export function getAsset(symbol: string): Asset | undefined {
  return mockAssets.find(
    (a) =>
      a.symbol.toLowerCase() === symbol.toLowerCase() ||
      a.id === symbol.toLowerCase(),
  );
}

export function assetsByClass(assetClass?: AssetClass | "all"): Asset[] {
  if (!assetClass || assetClass === "all") return mockAssets;
  return mockAssets.filter((a) => a.class === assetClass);
}

export function generateCandles(base: number, count = 80): Candle[] {
  const candles: Candle[] = [];
  let price = base * 0.985;
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const drift = (Math.sin(i / 6) + Math.cos(i / 11)) * base * 0.0012;
    const noise = ((i * 17) % 9) * base * 0.00015;
    const open = price;
    const close = open + drift + noise - base * 0.0002;
    const high = Math.max(open, close) + base * 0.0008;
    const low = Math.min(open, close) - base * 0.0007;
    candles.push({
      time: new Date(now - i * 60 * 60 * 1000).toISOString(),
      open: Number(open.toFixed(5)),
      high: Number(high.toFixed(5)),
      low: Number(low.toFixed(5)),
      close: Number(close.toFixed(5)),
      volume: 800 + ((i * 37) % 400),
    });
    price = close;
  }
  return candles;
}

export function getOrderBook(asset: Asset): OrderBook {
  const mid = asset.price;
  const step = asset.price > 100 ? 0.05 : asset.price > 10 ? 0.01 : 0.0001;
  const asks = Array.from({ length: 8 }, (_, i) => {
    const price = Number((mid + step * (i + 1)).toFixed(5));
    const size = Number((0.4 + ((i * 3) % 5) * 0.35).toFixed(2));
    return { price, size, total: 0 };
  });
  const bids = Array.from({ length: 8 }, (_, i) => {
    const price = Number((mid - step * (i + 1)).toFixed(5));
    const size = Number((0.5 + ((i * 5) % 4) * 0.4).toFixed(2));
    return { price, size, total: 0 };
  });
  let askTotal = 0;
  asks.forEach((l) => {
    askTotal += l.size;
    l.total = Number(askTotal.toFixed(2));
  });
  let bidTotal = 0;
  bids.forEach((l) => {
    bidTotal += l.size;
    l.total = Number(bidTotal.toFixed(2));
  });
  return { asks, bids };
}

export const mockPositions: Position[] = [
  {
    id: "pos_1",
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    side: "buy",
    size: 1.2,
    leverage: 100,
    entryPrice: 1.0812,
    currentPrice: 1.08452,
    stopLoss: 1.076,
    takeProfit: 1.092,
    unrealizedPnl: 398.4,
    unrealizedPnlPct: 0.31,
    margin: 1300,
    openedAt: "2026-09-08T14:22:00.000Z",
    status: "open",
  },
  {
    id: "pos_2",
    symbol: "XAUUSD",
    name: "Gold",
    side: "sell",
    size: 0.4,
    leverage: 50,
    entryPrice: 2398.2,
    currentPrice: 2384.6,
    stopLoss: 2412,
    takeProfit: 2360,
    unrealizedPnl: 544.0,
    unrealizedPnlPct: 0.57,
    margin: 1918,
    openedAt: "2026-09-07T09:10:00.000Z",
    status: "open",
  },
  {
    id: "pos_3",
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    side: "buy",
    size: 20,
    leverage: 5,
    entryPrice: 124.1,
    currentPrice: 128.74,
    stopLoss: 118,
    takeProfit: 138,
    unrealizedPnl: 92.8,
    unrealizedPnlPct: 3.74,
    margin: 512,
    openedAt: "2026-09-09T11:05:00.000Z",
    status: "open",
  },
  {
    id: "pos_4",
    symbol: "TSLA",
    name: "Tesla Inc.",
    side: "sell",
    size: 15,
    leverage: 5,
    entryPrice: 252.0,
    currentPrice: 248.6,
    unrealizedPnl: 51.0,
    unrealizedPnlPct: 1.35,
    margin: 745,
    openedAt: "2026-09-06T16:40:00.000Z",
    status: "open",
  },
];

export const mockOrders: Order[] = [
  {
    id: "ord_1",
    symbol: "GBPUSD",
    side: "buy",
    type: "limit",
    size: 0.8,
    price: 1.268,
    stopLoss: 1.262,
    takeProfit: 1.282,
    status: "pending",
    createdAt: "2026-09-09T08:14:00.000Z",
  },
  {
    id: "ord_2",
    symbol: "BTCUSD",
    side: "sell",
    type: "stop",
    size: 0.05,
    price: 70200,
    status: "pending",
    createdAt: "2026-09-09T10:02:00.000Z",
  },
  {
    id: "ord_3",
    symbol: "US500",
    side: "buy",
    type: "market",
    size: 1,
    status: "filled",
    createdAt: "2026-09-08T15:30:00.000Z",
    filledAt: "2026-09-08T15:30:01.000Z",
  },
  {
    id: "ord_4",
    symbol: "ETHUSD",
    side: "buy",
    type: "limit",
    size: 1.5,
    price: 3200,
    status: "rejected",
    createdAt: "2026-09-07T19:20:00.000Z",
    rejectReason: "Insufficient free margin",
  },
];

export const mockClosedPositions: Position[] = [
  {
    id: "pos_c1",
    symbol: "USOIL",
    name: "Crude Oil WTI",
    side: "buy",
    size: 2,
    leverage: 20,
    entryPrice: 76.1,
    currentPrice: 78.42,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
    margin: 0,
    openedAt: "2026-09-02T12:00:00.000Z",
    closedAt: "2026-09-05T16:20:00.000Z",
    status: "closed",
    realizedPnl: 464,
  },
  {
    id: "pos_c2",
    symbol: "AAPL",
    name: "Apple Inc.",
    side: "buy",
    size: 10,
    leverage: 5,
    entryPrice: 218.4,
    currentPrice: 214.32,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0,
    margin: 0,
    openedAt: "2026-08-28T14:00:00.000Z",
    closedAt: "2026-09-03T18:10:00.000Z",
    status: "closed",
    realizedPnl: -40.8,
  },
];

export const mockSignals: Signal[] = [
  {
    id: "sig_1",
    symbol: "EURUSD",
    assetName: "Euro / US Dollar",
    assetClass: "forex",
    direction: "BUY",
    entry: 1.082,
    stopLoss: 1.0765,
    takeProfits: [1.088, 1.092, 1.098],
    timeframe: "H4",
    confidence: 78,
    strength: "High",
    strategy: "Range Break Desk",
    issuedAt: "2026-09-09T07:30:00.000Z",
    status: "Active",
    riskReward: 2.4,
    reasoning:
      "Price reclaimed the prior session mid-range with declining sell volume. Invalidation sits below the London low.",
  },
  {
    id: "sig_2",
    symbol: "XAUUSD",
    assetName: "Gold",
    assetClass: "commodities",
    direction: "SELL",
    entry: 2395,
    stopLoss: 2418,
    takeProfits: [2370, 2355],
    timeframe: "H1",
    confidence: 71,
    strength: "Medium",
    strategy: "Macro Overlay",
    issuedAt: "2026-09-08T13:15:00.000Z",
    status: "Won",
    riskReward: 1.9,
    reasoning:
      "Failed break of resistance into softer real-yield impulse. Targets align with weekly value area.",
  },
  {
    id: "sig_3",
    symbol: "NVDA",
    assetName: "NVIDIA Corp.",
    assetClass: "stocks",
    direction: "BUY",
    entry: 122.5,
    stopLoss: 116.8,
    takeProfits: [132, 138],
    timeframe: "D1",
    confidence: 66,
    strength: "Medium",
    strategy: "Momentum Core",
    issuedAt: "2026-09-06T15:00:00.000Z",
    status: "Active",
    riskReward: 2.1,
    reasoning:
      "Higher low structure after sector rotation. Not a guarantee, size for volatility.",
  },
  {
    id: "sig_4",
    symbol: "BTCUSD",
    assetName: "Bitcoin",
    assetClass: "crypto",
    direction: "SELL",
    entry: 69500,
    stopLoss: 71200,
    takeProfits: [67000],
    timeframe: "H4",
    confidence: 58,
    strength: "Low",
    strategy: "Liquidity Sweep",
    issuedAt: "2026-09-04T22:40:00.000Z",
    status: "Expired",
    riskReward: 1.5,
    reasoning:
      "Setup invalidated after time stop. Signals expire; they are not financial advice.",
  },
];

export const mockWallet: Wallet = {
  balances: [
    { currency: "USD", available: 86420.55, trading: 13579.45, total: 100000 },
    { currency: "EUR", available: 4200, trading: 800, total: 5000 },
    { currency: "GBP", available: 1800, trading: 200, total: 2000 },
  ],
  fundingMethods: [
    { id: "card", name: "Visa / Mastercard", type: "card" },
    { id: "wire", name: "Bank wire", type: "bank" },
    { id: "crypto", name: "Crypto transfer", type: "crypto" },
  ],
};

export const mockTransactions: Transaction[] = [
  {
    id: "tx_1",
    type: "deposit",
    amount: 5000,
    currency: "USD",
    status: "Completed",
    method: "Bank wire",
    createdAt: "2026-09-01T10:00:00.000Z",
    completedAt: "2026-09-01T14:20:00.000Z",
  },
  {
    id: "tx_2",
    type: "withdrawal",
    amount: 1200,
    currency: "USD",
    status: "Processing",
    method: "Visa / Mastercard",
    createdAt: "2026-09-08T09:12:00.000Z",
    note: "Under review, simulated portfolio flow",
  },
  {
    id: "tx_3",
    type: "transfer",
    amount: 2500,
    currency: "USD",
    status: "Completed",
    method: "Wallet to Trading",
    createdAt: "2026-09-07T16:40:00.000Z",
    completedAt: "2026-09-07T16:40:02.000Z",
  },
  {
    id: "tx_4",
    type: "deposit",
    amount: 800,
    currency: "USD",
    status: "Pending",
    method: "Crypto transfer",
    createdAt: "2026-09-09T11:05:00.000Z",
  },
  {
    id: "tx_5",
    type: "withdrawal",
    amount: 300,
    currency: "EUR",
    status: "Failed",
    method: "Bank wire",
    createdAt: "2026-09-03T08:00:00.000Z",
    note: "Beneficiary details mismatch (simulated)",
  },
];

export const mockNotifications: NotificationItem[] = [
  {
    id: "n1",
    kind: "order",
    title: "Order filled",
    body: "Market buy US500 1.0 lot filled at 5618.4",
    createdAt: "2026-09-08T15:30:01.000Z",
    read: false,
  },
  {
    id: "n2",
    kind: "signal",
    title: "New signal, EURUSD BUY",
    body: "Range Break Desk published an H4 setup. Review risk before acting.",
    createdAt: "2026-09-09T07:30:00.000Z",
    read: false,
  },
  {
    id: "n3",
    kind: "margin",
    title: "Margin usage elevated",
    body: "Demo account margin utilization above 13%. Simulated alert only.",
    createdAt: "2026-09-09T12:10:00.000Z",
    read: true,
  },
  {
    id: "n4",
    kind: "news",
    title: "High impact CPI preview",
    body: "US CPI lands tomorrow 12:30 UTC, expect FX volatility.",
    createdAt: "2026-09-08T18:00:00.000Z",
    read: true,
  },
  {
    id: "n5",
    kind: "security",
    title: "New device signed in",
    body: "Chrome on Windows, Lagos region (demo session).",
    createdAt: "2026-09-07T21:44:00.000Z",
    read: true,
  },
];

export const mockNews: NewsArticle[] = [
  {
    id: "news_1",
    title: "Dollar firm ahead of inflation print",
    summary:
      "Traders trim EUR exposure into the US CPI window while yields remain sticky.",
    category: "Forex",
    tags: ["USD", "EURUSD", "CPI"],
    impact: "high",
    publishedAt: "2026-09-09T06:20:00.000Z",
    bookmarked: true,
    featured: true,
  },
  {
    id: "news_2",
    title: "Gold consolidates after weekly high rejection",
    summary:
      "XAUUSD fades from resistance as real yields firm. Range traders watch 2370.",
    category: "Commodities",
    tags: ["XAUUSD", "Yields"],
    impact: "medium",
    publishedAt: "2026-09-08T20:10:00.000Z",
    bookmarked: false,
  },
  {
    id: "news_3",
    title: "Chip names lead Nasdaq rebound",
    summary:
      "NVDA and peers lift NAS100 as breadth improves into the US cash open.",
    category: "Equities",
    tags: ["NVDA", "NAS100"],
    impact: "medium",
    publishedAt: "2026-09-09T14:05:00.000Z",
    bookmarked: false,
    featured: true,
  },
  {
    id: "news_4",
    title: "Bitcoin liquidity thins into weekend",
    summary:
      "BTCUSD spreads widen slightly; weekend flows remain simulated in this demo.",
    category: "Crypto",
    tags: ["BTCUSD"],
    impact: "low",
    publishedAt: "2026-09-07T11:30:00.000Z",
    bookmarked: false,
  },
];

export const mockCalendar: EconomicEvent[] = [
  {
    id: "ec1",
    date: "2026-09-09",
    time: "12:30",
    country: "United States",
    currency: "USD",
    event: "CPI m/m",
    importance: "high",
    previous: "0.2%",
    forecast: "0.2%",
    actual: null,
  },
  {
    id: "ec2",
    date: "2026-09-09",
    time: "09:00",
    country: "Eurozone",
    currency: "EUR",
    event: "GDP q/q",
    importance: "medium",
    previous: "0.2%",
    forecast: "0.3%",
    actual: "0.3%",
  },
  {
    id: "ec3",
    date: "2026-09-10",
    time: "11:00",
    country: "United Kingdom",
    currency: "GBP",
    event: "Industrial Production",
    importance: "medium",
    previous: "0.1%",
    forecast: "0.0%",
    actual: null,
  },
  {
    id: "ec4",
    date: "2026-09-10",
    time: "23:50",
    country: "Japan",
    currency: "JPY",
    event: "Trade Balance",
    importance: "low",
    previous: "¥-0.58T",
    forecast: "¥-0.40T",
    actual: null,
  },
  {
    id: "ec5",
    date: "2026-09-11",
    time: "14:00",
    country: "United States",
    currency: "USD",
    event: "FOMC Member Speech",
    importance: "high",
    previous: "n/a",
    forecast: "n/a",
    actual: null,
  },
];

export const mockAnalytics: AnalyticsSummary = {
  accountGrowthPct: 8.4,
  totalPnl: 8420.55,
  winRate: 57.2,
  lossRate: 42.8,
  profitFactor: 1.64,
  averageWin: 286.4,
  averageLoss: -174.2,
  maxDrawdown: -6.8,
  bestAsset: "XAUUSD",
  worstAsset: "TSLA",
  tradingVolume: 42_800_000,
  averageDurationHours: 18.6,
  longPct: 62,
  shortPct: 38,
  daily: [
    { label: "Mon", pnl: 220 },
    { label: "Tue", pnl: -80 },
    { label: "Wed", pnl: 410 },
    { label: "Thu", pnl: 160 },
    { label: "Fri", pnl: -40 },
  ],
  weekly: [
    { label: "W1", pnl: 620 },
    { label: "W2", pnl: -180 },
    { label: "W3", pnl: 940 },
    { label: "W4", pnl: 410 },
  ],
  monthly: [
    { label: "May", pnl: 1200 },
    { label: "Jun", pnl: -420 },
    { label: "Jul", pnl: 1880 },
    { label: "Aug", pnl: 960 },
    { label: "Sep", pnl: 624 },
  ],
  byMarket: [
    { market: "Forex", pnl: 2140 },
    { market: "Commodities", pnl: 1880 },
    { market: "Indices", pnl: 920 },
    { market: "Stocks", pnl: 640 },
    { market: "Crypto", pnl: -260 },
  ],
  allocation: [
    { label: "Forex", pct: 34 },
    { label: "Indices", pct: 22 },
    { label: "Commodities", pct: 18 },
    { label: "Stocks", pct: 16 },
    { label: "Crypto", pct: 10 },
  ],
};

export const ASSET_CLASS_LABELS: Record<AssetClass | "all", string> = {
  all: "All markets",
  forex: "Forex",
  crypto: "Crypto",
  stocks: "Stocks",
  indices: "Indices",
  commodities: "Commodities",
  etfs: "ETFs",
};
