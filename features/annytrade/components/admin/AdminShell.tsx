"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { annytradeFetch } from "../../services/client";
import { annytradeRoutes } from "../../lib/routes";

const ADMIN_LINKS = [
  { href: "/annytrade/admin", label: "Overview" },
  { href: "/annytrade/admin/users", label: "Users" },
  { href: "/annytrade/admin/health", label: "Health" },
  { href: "/annytrade/admin/reconcile", label: "Reconcile" },
  { href: "/annytrade/admin/audit", label: "Audit" },
  { href: "/annytrade/admin/metrics", label: "Metrics" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void annytradeFetch<{ admin: { role: string } }>("/admin/me", {
      method: "GET",
    })
      .then((r) => {
        if (cancelled) return;
        setAllowed(true);
        setRole(r.admin.role);
      })
      .catch((err) => {
        if (cancelled) return;
        setAllowed(false);
        setError(err instanceof Error ? err.message : "Forbidden");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (allowed === null) {
    return (
      <div className="p-6 text-[0.875rem] font-bold text-[#020617]">
        Checking admin authorization…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <h1 className="text-xl font-semibold">Admin access denied</h1>
        <p className="mt-2 text-[0.8125rem] font-bold text-[#020617]">
          {error ??
            "You are not an assigned admin. UI hiding is not security. API calls are authorized server-side."}
        </p>
        <Link
          href={annytradeRoutes.dashboard}
          className="mt-4 inline-block text-[var(--at-accent)]"
        >
          Back to desk
        </Link>
      </div>
    );
  }

  return (
    <div
      data-annytrade
      className="min-h-screen bg-[var(--at-bg)] text-[var(--at-text)]"
    >
      <header
        className="border-b px-4 py-3"
        style={{ borderColor: "var(--at-border)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[0.65rem] font-bold tracking-wide text-[#020617] uppercase">
              AnnyTrade operations
            </p>
            <h1 className="text-lg font-semibold">Admin, {role}</h1>
          </div>
          <p className="text-[0.7rem] text-[var(--at-live)]">
            BROKER_LIVE disabled
          </p>
        </div>
        <nav className="mx-auto mt-2 flex max-w-6xl flex-wrap gap-3 text-[0.75rem]">
          {ADMIN_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[var(--at-accent)]"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={annytradeRoutes.dashboard}
            className="font-bold text-[#020617]"
          >
            Desk
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
