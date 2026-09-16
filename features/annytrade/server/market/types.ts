/**
 * Canonical market-data domain types (provider-agnostic).
 *
 * Numeric representation:
 * - Wire/API and domain use decimal strings for money-like fields when
 *   persisting or crossing service boundaries where precision matters.
 * - Display and charting may convert to number at the edge.
 * - Provider adapters normalize to these shapes; React never sees raw vendor payloads.
 */

export type AssetClass =
  "equity" | "forex" | "crypto" | "index" | "etf" | "commodity" | "other";

export type InstrumentStatus = "active" | "delisted" | "halted" | "unknown";

export type DataFreshness =
  "LIVE" | "DELAYED" | "STALE" | "DEMO" | "UNAVAILABLE";

export type SessionPhase =
  "premarket" | "regular" | "afterhours" | "closed" | "unknown";

export type CandleInterval =
  "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

export type Instrument = {
  id: string;
  symbol: string;
  displaySymbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string | null;
  currency: string | null;
  status: InstrumentStatus;
  timezone: string;
};

export type Quote = {
  instrumentId: string;
  symbol: string;
  bid: string | null;
  ask: string | null;
  last: string | null;
  open: string | null;
  high: string | null;
  low: string | null;
  previousClose: string | null;
  change: string | null;
  changePercent: string | null;
  volume: string | null;
  timestamp: string | null;
  marketStatus: SessionPhase;
  freshness: DataFreshness;
  delayMinutes: number | null;
};

export type Candle = {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string | null;
};

export type MarketHoursStatus = {
  market: string;
  status: SessionPhase;
  opensAt: string | null;
  closesAt: string | null;
  timezone: string;
  freshness: DataFreshness;
};

export type MarketDataSourceMeta = {
  mode: "demo" | "live" | "test";
  providerId: string;
  providerLabel: string;
  freshnessDefault: DataFreshness;
  supportedAssetClasses: AssetClass[];
  supportsRealtime: boolean;
  notes: string;
};

export type QuoteSubscription = {
  unsubscribe: () => void;
};

export class MarketDataError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "MarketDataError";
  }
}
