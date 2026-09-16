import type { CalendarProvider } from "./provider";
import {
  createDemoCalendarProvider,
  createTestCalendarProvider,
} from "./providers/demo";
import { createFinnhubCalendarProvider } from "./providers/finnhub";

let cached: CalendarProvider | null = null;

export function resetCalendarProviderCache() {
  cached = null;
}

function resolveApiKey(): string | undefined {
  return (
    process.env.ANNYTRADE_CALENDAR_API_KEY ||
    process.env.ANNYTRADE_NEWS_API_KEY ||
    process.env.ANNYTRADE_MARKET_DATA_API_KEY ||
    undefined
  );
}

export function getCalendarProvider(): CalendarProvider {
  if (cached) return cached;
  const requested = (
    process.env.ANNYTRADE_CALENDAR_PROVIDER ??
    process.env.ANNYTRADE_MARKET_DATA_PROVIDER ??
    "demo"
  ).toLowerCase();
  const apiKey = resolveApiKey();

  if (requested === "test") {
    cached = createTestCalendarProvider();
    return cached;
  }
  if (requested === "finnhub" || requested === "live") {
    if (!apiKey) {
      console.warn(
        "[annytrade] Calendar Finnhub selected but API key missing — using DEMO calendar",
      );
      cached = createDemoCalendarProvider();
      return cached;
    }
    cached = createFinnhubCalendarProvider({ apiKey });
    return cached;
  }
  if (requested === "auto" && apiKey) {
    cached = createFinnhubCalendarProvider({ apiKey });
    return cached;
  }
  cached = createDemoCalendarProvider();
  return cached;
}
