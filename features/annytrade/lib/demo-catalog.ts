/** Shared demo universe symbols — safe for client + server. */
export const DEMO_CATALOG_SYMBOLS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "AMZN",
  "META",
  "GOOGL",
  "SPY",
  "QQQ",
  "IWM",
  "US500",
  "NAS100",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
  "XAUUSD",
  "XAGUSD",
  "WTIUSD",
  "BTCUSD",
  "ETHUSD",
  "SOLUSD",
] as const;

export type DemoCatalogSymbol = (typeof DEMO_CATALOG_SYMBOLS)[number];
