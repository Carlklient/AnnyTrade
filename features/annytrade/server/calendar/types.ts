export type CalendarImportance = "high" | "medium" | "low" | "unknown";

export type EconomicEvent = {
  id: string;
  event: string;
  country: string | null;
  region: string | null;
  currency: string | null;
  /** ISO timestamp in UTC */
  time: string;
  importance: CalendarImportance;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  unit: string | null;
  freshness: "LIVE" | "DELAYED" | "STALE" | "DEMO" | "UNAVAILABLE";
};

export type CalendarProviderMeta = {
  providerId: string;
  providerLabel: string;
  mode: "demo" | "live" | "test";
  notes: string;
};

export type ListCalendarInput = {
  from: Date;
  to: Date;
  country?: string;
  importance?: CalendarImportance;
  limit?: number;
};
