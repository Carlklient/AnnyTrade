/**
 * Opt-in Finnhub smoke test — does NOT run in ordinary CI.
 *
 * Usage:
 *   ANNYTRADE_MARKET_DATA_PROVIDER=finnhub \
 *   ANNYTRADE_MARKET_DATA_API_KEY=... \
 *   npm run annytrade:test:market-provider
 */
import { createFinnhubMarketDataProvider } from "../features/annytrade/server/market/providers/finnhub";

async function main() {
  const apiKey = process.env.ANNYTRADE_MARKET_DATA_API_KEY;
  if (!apiKey) {
    console.error(
      "REAL PROVIDER CREDENTIAL REQUIRED: set ANNYTRADE_MARKET_DATA_API_KEY",
    );
    process.exit(2);
  }

  const provider = createFinnhubMarketDataProvider({ apiKey });
  console.log(
    "provider",
    provider.meta.providerId,
    provider.meta.freshnessDefault,
  );

  const search = await provider.searchInstruments({ query: "AAPL", limit: 3 });
  console.log("search", search.map((s) => s.symbol).join(","));

  const quote = await provider.getQuote("AAPL");
  console.log(
    "quote",
    quote.symbol,
    quote.last,
    quote.freshness,
    quote.timestamp,
  );

  const candles = await provider.getCandles({
    symbol: "AAPL",
    interval: "1d",
    limit: 5,
  });
  console.log("candles", candles.length);

  if (!quote.last || candles.length === 0) {
    console.error("Smoke test failed: missing quote or candles");
    process.exit(1);
  }

  console.log("OK — Finnhub smoke passed (no orders executed)");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
