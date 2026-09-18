"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import {
  calendarClient,
  type EconomicEventDto,
} from "../../services/news-client";

function formatEventLocal(iso: string, timeZone: string) {
  try {
    const d = new Date(iso);
    return {
      date: new Intl.DateTimeFormat(undefined, {
        timeZone,
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(d),
      time: new Intl.DateTimeFormat(undefined, {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
      }).format(d),
    };
  } catch {
    return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
  }
}

export function CalendarView() {
  const { auth } = useAnnyTrade();
  const tz = auth.profile?.timezone || "UTC";
  const [events, setEvents] = useState<EconomicEventDto[]>([]);
  const [country, setCountry] = useState("all");
  const [impact, setImpact] = useState("all");
  const [metaLabel, setMetaLabel] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await calendarClient.list({
        country: country === "all" ? undefined : country,
        importance: impact === "all" ? undefined : impact,
      });
      setEvents(res.events);
      setMetaLabel(`${res.meta.providerId}, ${res.meta.mode}`);
      setNote(res.timezoneNote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [country, impact]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => events, [events]);

  return (
    <div className="space-y-4">
      <div>
        <p className="at-label">Macro, {metaLabel || "…"}</p>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--at-font-display)" }}
        >
          Economic calendar
        </h1>
        <p className="mt-2 text-[0.8125rem] font-bold text-[var(--at-text)]">
          Times shown in {tz}. Provider fields only. No invented actuals.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="at-input w-auto"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="all">All countries</option>
          {["United States", "Euro Area", "United Kingdom", "Japan"].map(
            (c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ),
          )}
        </select>
        <select
          className="at-input w-auto"
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
        >
          <option value="all">All impact</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button
          type="button"
          className="at-btn at-btn-ghost"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="text-[0.8125rem] text-[var(--at-sell)]">{error}</p>
      ) : null}

      <div className="at-card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[0.8125rem]">
          <thead>
            <tr
              className="border-b font-bold text-[var(--at-text)]"
              style={{ borderColor: "var(--at-border)" }}
            >
              {[
                "Date",
                "Time",
                "Country",
                "Ccy",
                "Event",
                "Impact",
                "Previous",
                "Forecast",
                "Actual",
              ].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const local = formatEventLocal(e.time, tz);
              return (
                <tr
                  key={e.id}
                  className="border-b last:border-0"
                  style={{ borderColor: "var(--at-border)" }}
                >
                  <td className="px-3 py-3">{local.date}</td>
                  <td className="at-mono px-3 py-3">{local.time}</td>
                  <td className="px-3 py-3">{e.country ?? "n/a"}</td>
                  <td className="px-3 py-3 font-semibold">
                    {e.currency ?? "n/a"}
                  </td>
                  <td className="px-3 py-3">{e.event}</td>
                  <td className="px-3 py-3">
                    <span className="at-badge capitalize">{e.importance}</span>
                  </td>
                  <td className="at-mono px-3 py-3">{e.previous ?? "n/a"}</td>
                  <td className="at-mono px-3 py-3">{e.forecast ?? "n/a"}</td>
                  <td className="at-mono px-3 py-3">{e.actual ?? "n/a"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-[0.8125rem] font-bold text-[var(--at-text)]">
            No events for this range/filter.
          </p>
        ) : null}
      </div>
      {note ? (
        <p className="text-[0.7rem] font-bold text-[var(--at-text)]">{note}</p>
      ) : null}
    </div>
  );
}
