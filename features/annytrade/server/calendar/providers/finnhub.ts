import type { CalendarProvider } from "../provider";
import type {
  CalendarImportance,
  EconomicEvent,
  ListCalendarInput,
} from "../types";
import { MarketDataError } from "../../market/types";
import { providerRateLimit } from "../../market/provider-rate-limit";

type FinnhubCalendarConfig = { apiKey: string; baseUrl?: string };

type FinnhubEconRow = {
  country?: string;
  event?: string;
  time?: string;
  impact?: string;
  actual?: number | string | null;
  estimate?: number | string | null;
  prev?: number | string | null;
  unit?: string | null;
};

async function finnhubGet<T>(
  path: string,
  apiKey: string,
  baseUrl: string,
): Promise<T> {
  const limited = providerRateLimit({
    key: "finnhub-calendar",
    limit: 30,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    throw new MarketDataError(
      "RATE_LIMITED",
      `Calendar provider rate limit; retry in ${limited.retryAfterSec}s`,
      429,
    );
  }
  const url = new URL(path, baseUrl);
  url.searchParams.set("token", apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) {
      throw new MarketDataError(
        "PROVIDER_AUTH",
        "Calendar provider auth failed",
        res.status,
      );
    }
    if (res.status === 429) {
      throw new MarketDataError(
        "RATE_LIMITED",
        "Calendar provider rate limited",
        429,
      );
    }
    if (!res.ok) {
      throw new MarketDataError(
        "PROVIDER_ERROR",
        `Calendar provider error (${res.status})`,
        502,
      );
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof MarketDataError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new MarketDataError("TIMEOUT", "Calendar provider timeout", 504);
    }
    throw new MarketDataError(
      "PROVIDER_ERROR",
      "Calendar provider request failed",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

function mapImpact(impact: string | undefined): CalendarImportance {
  const i = (impact ?? "").toLowerCase();
  if (i === "high" || i === "3") return "high";
  if (i === "medium" || i === "2") return "medium";
  if (i === "low" || i === "1") return "low";
  return "unknown";
}

function fmtVal(v: number | string | null | undefined): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

function mapRow(raw: FinnhubEconRow, idx: number): EconomicEvent | null {
  const event = (raw.event ?? "").trim();
  if (!event) return null;
  const timeRaw = (raw.time ?? "").trim();
  // Finnhub often returns "2024-01-15 13:30:00" (UTC-ish) — normalize to ISO
  if (!timeRaw) return null;
  const parsed = Date.parse(
    timeRaw.includes("T") ? timeRaw : timeRaw.replace(" ", "T") + "Z",
  );
  if (!Number.isFinite(parsed)) return null;
  const time = new Date(parsed).toISOString();

  return {
    id: `fh-econ-${idx}-${parsed}-${event.slice(0, 24)}`,
    event: event.slice(0, 200),
    country: raw.country ?? null,
    region: raw.country ?? null,
    currency: null,
    time,
    importance: mapImpact(raw.impact),
    actual: fmtVal(raw.actual),
    forecast: fmtVal(raw.estimate),
    previous: fmtVal(raw.prev),
    unit: raw.unit != null ? String(raw.unit) : null,
    freshness: "DELAYED",
  };
}

export function createFinnhubCalendarProvider(
  config: FinnhubCalendarConfig,
): CalendarProvider {
  const baseUrl = config.baseUrl ?? "https://finnhub.io/api/v1/";
  return {
    meta: {
      providerId: "finnhub-calendar",
      providerLabel: "Finnhub Economic Calendar",
      mode: "live",
      notes: "Events as supplied by Finnhub; times normalized to UTC ISO.",
    },
    async listEvents(input: ListCalendarInput) {
      const fromStr = input.from.toISOString().slice(0, 10);
      const toStr = input.to.toISOString().slice(0, 10);
      const payload = await finnhubGet<{ economicCalendar?: FinnhubEconRow[] }>(
        `calendar/economic?from=${fromStr}&to=${toStr}`,
        config.apiKey,
        baseUrl,
      );
      const rows = Array.isArray(payload?.economicCalendar)
        ? payload.economicCalendar
        : Array.isArray(payload)
          ? (payload as FinnhubEconRow[])
          : [];
      let events = rows
        .map((r, i) => mapRow(r, i))
        .filter((e): e is EconomicEvent => e != null);
      if (input.country) {
        const c = input.country.toLowerCase();
        events = events.filter((e) =>
          (e.country ?? "").toLowerCase().includes(c),
        );
      }
      if (input.importance && input.importance !== "unknown") {
        events = events.filter((e) => e.importance === input.importance);
      }
      return events.slice(0, input.limit ?? 200);
    },
  };
}
