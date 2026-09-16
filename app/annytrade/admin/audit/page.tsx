"use client";

import { useEffect, useState } from "react";

import { annytradeFetch } from "@/features/annytrade/services/client";

type AuditRes = {
  events: {
    id: string;
    eventType: string;
    emailRedacted: string | null;
    createdAt: string;
  }[];
};

export default function AdminAuditPage() {
  const [eventType, setEventType] = useState("");
  const [data, setData] = useState<AuditRes | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (eventType) params.set("eventType", eventType);
    void annytradeFetch<AuditRes>(`/admin/audit?${params}`, { method: "GET" })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [eventType]);

  return (
    <div className="space-y-3">
      <input
        className="at-input"
        placeholder="Filter eventType prefix (e.g. auth.login)"
        value={eventType}
        onChange={(e) => setEventType(e.target.value)}
      />
      {error ? <p className="text-[var(--at-sell)]">{error}</p> : null}
      <ul className="space-y-2 text-[0.75rem]">
        {(data?.events ?? []).map((e) => (
          <li
            key={e.id}
            className="rounded-[8px] border px-3 py-2"
            style={{ borderColor: "var(--at-border)" }}
          >
            <span className="at-mono font-medium">{e.eventType}</span>
            <span className="text-[var(--at-text-muted)]">
              {" "}
              · {e.emailRedacted ?? "system"} · {e.createdAt}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
