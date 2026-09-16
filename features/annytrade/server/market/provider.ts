import type {
  Candle,
  CandleInterval,
  Instrument,
  MarketDataSourceMeta,
  MarketHoursStatus,
  Quote,
  QuoteSubscription,
} from "./types";

export type SearchInstrumentsInput = {
  query: string;
  limit?: number;
};

export type GetCandlesInput = {
  symbol: string;
  interval: CandleInterval;
  from?: Date;
  to?: Date;
  limit?: number;
};

/**
 * Internal market-data contract. UI and route handlers depend on this —
 * never on vendor SDKs.
 */
export interface MarketDataProvider {
  readonly meta: MarketDataSourceMeta;

  searchInstruments(input: SearchInstrumentsInput): Promise<Instrument[]>;
  getInstrument(symbol: string): Promise<Instrument | null>;
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getCandles(input: GetCandlesInput): Promise<Candle[]>;
  getMarketStatus(market?: string): Promise<MarketHoursStatus>;

  /**
   * Optional realtime. Providers without streaming resolve via polling
   * inside the subscription manager.
   */
  subscribeQuotes?(
    symbols: string[],
    onQuote: (quote: Quote) => void,
  ): QuoteSubscription;
}
