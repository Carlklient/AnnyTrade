import type {
  CalendarProviderMeta,
  EconomicEvent,
  ListCalendarInput,
} from "./types";

/** Economic calendar provider — independent of market-data provider. */
export interface CalendarProvider {
  readonly meta: CalendarProviderMeta;
  listEvents(input: ListCalendarInput): Promise<EconomicEvent[]>;
}
