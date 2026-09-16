"use client";

import { useEffect, useState } from "react";

import { annytradeFetch } from "@/features/annytrade/services/client";

export default function AdminReconcilePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void annytradeFetch<Record<string, unknown>>("/admin/reconcile", {
      method: "GET",
    })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  if (error) return <p className="text-[var(--at-sell)]">{error}</p>;
  if (!data) return <p>Loading…</p>;

  return (
    <div className="space-y-2">
      <p className="text-[0.8125rem] text-[var(--at-text-secondary)]">
        Reconciliation dashboard: broker mirrors vs ops alerts. No casual
        rewrite of fills.
      </p>
      <pre
        className="at-mono overflow-x-auto rounded-[8px] border p-3 text-[0.7rem]"
        style={{ borderColor: "var(--at-border)" }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
