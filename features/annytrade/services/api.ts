import {
  assetsByClass,
  generateCandles,
  getAsset,
  getOrderBook,
  mockAccounts,
  mockAnalytics,
  mockCalendar,
  mockClosedPositions,
  mockNews,
  mockNotifications,
  mockOrders,
  mockPositions,
  mockSignals,
  mockTransactions,
  mockUser,
  mockWallet,
} from "../data/mock";
import type {
  AccountMode,
  Asset,
  AssetClass,
  AnalyticsSummary,
  EconomicEvent,
  NewsArticle,
  NotificationItem,
  Order,
  OrderBook,
  Position,
  PriceData,
  Signal,
  TradingAccount,
  Transaction,
  User,
  Wallet,
} from "../types";

/** Data access layer — swap implementations when live APIs are connected. */
export const annytradeApi = {
  getUser(): User {
    return mockUser;
  },
  getAccount(mode: AccountMode): TradingAccount {
    return mockAccounts[mode];
  },
  listAssets(assetClass?: AssetClass | "all"): Asset[] {
    return assetsByClass(assetClass);
  },
  getAsset(symbol: string): Asset | undefined {
    return getAsset(symbol);
  },
  getPriceData(symbol: string, timeframe = "H1"): PriceData | undefined {
    const asset = getAsset(symbol);
    if (!asset) return undefined;
    return {
      symbol: asset.symbol,
      timeframe,
      candles: generateCandles(asset.price),
    };
  },
  getOrderBook(symbol: string): OrderBook | undefined {
    const asset = getAsset(symbol);
    if (!asset) return undefined;
    return getOrderBook(asset);
  },
  listPositions(): Position[] {
    return mockPositions;
  },
  listClosedPositions(): Position[] {
    return mockClosedPositions;
  },
  listOrders(): Order[] {
    return mockOrders;
  },
  listSignals(): Signal[] {
    return mockSignals;
  },
  getSignal(id: string): Signal | undefined {
    return mockSignals.find((s) => s.id === id);
  },
  getWallet(): Wallet {
    return mockWallet;
  },
  listTransactions(): Transaction[] {
    return mockTransactions;
  },
  listNotifications(): NotificationItem[] {
    return mockNotifications;
  },
  listNews(): NewsArticle[] {
    return mockNews;
  },
  listCalendar(): EconomicEvent[] {
    return mockCalendar;
  },
  getAnalytics(): AnalyticsSummary {
    return mockAnalytics;
  },
};
