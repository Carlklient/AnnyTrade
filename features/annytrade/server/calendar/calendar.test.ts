import { describe, expect, it } from "vitest";

import { createDemoCalendarProvider } from "./providers/demo";
import { createFinnhubCalendarProvider } from "./providers/finnhub";

describe("demo calendar", () => {
  it("returns UTC ISO times and filters by importance", async () => {
    const p = createDemoCalendarProvider();
    const from = new Date(Date.now() - 3 * 24 * 3600_000);
    const to = new Date(Date.now() + 10 * 24 * 3600_000);
    const events = await p.listEvents({ from, to });
    expect(events.length).toBeGreaterThan(0);
    expect(
      events.every((e) => e.time.endsWith("Z") || e.time.includes("T")),
    ).toBe(true);
    const high = await p.listEvents({ from, to, importance: "high" });
    expect(high.every((e) => e.importance === "high")).toBe(true);
  });
});

describe("finnhub calendar malformed rows", () => {
  it("skips events without time/name", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          economicCalendar: [
            { event: "", time: "2026-01-01 12:00:00", country: "US" },
            { event: "CPI", time: "bad-time", country: "US" },
            {
              event: "CPI YoY",
              time: "2026-01-15 13:30:00",
              country: "United States",
              impact: "high",
              actual: 3.1,
              estimate: 3.0,
              prev: 3.2,
            },
          ],
        }),
        { status: 200 },
      )) as typeof fetch;
    try {
      const p = createFinnhubCalendarProvider({ apiKey: "test-key" });
      const events = await p.listEvents({
        from: new Date("2026-01-01"),
        to: new Date("2026-01-31"),
      });
      expect(events).toHaveLength(1);
      expect(events[0]!.event).toBe("CPI YoY");
      expect(events[0]!.importance).toBe("high");
      expect(Date.parse(events[0]!.time)).not.toBeNaN();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
