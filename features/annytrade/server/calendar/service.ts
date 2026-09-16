import { cached, MarketCacheTTL } from "../market/cache";
import { getCalendarProvider } from "./factory";
import type { ListCalendarInput } from "./types";

export const calendarService = {
  meta() {
    return getCalendarProvider().meta;
  },

  list(input: ListCalendarInput) {
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 300);
    const key = `calendar:${input.from.toISOString()}:${input.to.toISOString()}:${input.country ?? ""}:${input.importance ?? ""}:${limit}`;
    return cached(key, MarketCacheTTL.candlesDaily, () =>
      getCalendarProvider().listEvents({ ...input, limit }),
    );
  },
};
