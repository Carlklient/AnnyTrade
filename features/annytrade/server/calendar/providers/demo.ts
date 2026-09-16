import type { CalendarProvider } from "../provider";
import type { EconomicEvent, ListCalendarInput } from "../types";

function dayOffset(days: number, hourUtc = 13): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hourUtc, 30, 0, 0);
  return d.toISOString();
}

const DEMO_EVENTS: Omit<EconomicEvent, "id" | "freshness">[] = [
  {
    event: "Consumer Price Index (YoY)",
    country: "United States",
    region: "US",
    currency: "USD",
    time: dayOffset(0, 12),
    importance: "high",
    actual: null,
    forecast: "3.1%",
    previous: "3.2%",
    unit: "%",
  },
  {
    event: "GDP Growth Rate (QoQ)",
    country: "Euro Area",
    region: "EU",
    currency: "EUR",
    time: dayOffset(1, 9),
    importance: "high",
    actual: null,
    forecast: "0.2%",
    previous: "0.1%",
    unit: "%",
  },
  {
    event: "Unemployment Rate",
    country: "United Kingdom",
    region: "GB",
    currency: "GBP",
    time: dayOffset(2, 8),
    importance: "medium",
    actual: null,
    forecast: "4.3%",
    previous: "4.2%",
    unit: "%",
  },
  {
    event: "BoJ Interest Rate Decision",
    country: "Japan",
    region: "JP",
    currency: "JPY",
    time: dayOffset(3, 3),
    importance: "high",
    actual: null,
    forecast: "0.25%",
    previous: "0.25%",
    unit: "%",
  },
  {
    event: "Retail Sales (MoM)",
    country: "United States",
    region: "US",
    currency: "USD",
    time: dayOffset(-1, 12),
    importance: "medium",
    actual: "0.4%",
    forecast: "0.3%",
    previous: "0.1%",
    unit: "%",
  },
];

export function createDemoCalendarProvider(): CalendarProvider {
  return {
    meta: {
      providerId: "demo-calendar",
      providerLabel: "AnnyTrade Demo Calendar",
      mode: "demo",
      notes: "Synthetic macro events when no calendar credential is set.",
    },
    async listEvents(input: ListCalendarInput) {
      const from = input.from.getTime();
      const to = input.to.getTime();
      let events: EconomicEvent[] = DEMO_EVENTS.map((e, i) => ({
        ...e,
        id: `demo-cal-${i}`,
        freshness: "DEMO" as const,
      })).filter((e) => {
        const t = Date.parse(e.time);
        return t >= from && t <= to;
      });
      if (input.country) {
        const c = input.country.toLowerCase();
        events = events.filter(
          (e) =>
            (e.country ?? "").toLowerCase().includes(c) ||
            (e.region ?? "").toLowerCase() === c ||
            (e.currency ?? "").toLowerCase() === c,
        );
      }
      if (input.importance && input.importance !== "unknown") {
        events = events.filter((e) => e.importance === input.importance);
      }
      return events.slice(0, input.limit ?? 100);
    },
  };
}

export function createTestCalendarProvider(): CalendarProvider {
  const demo = createDemoCalendarProvider();
  return {
    ...demo,
    meta: {
      ...demo.meta,
      providerId: "test-calendar",
      mode: "test",
      providerLabel: "AnnyTrade Test Calendar",
    },
  };
}
