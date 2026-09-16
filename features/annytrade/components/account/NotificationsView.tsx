"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeApi } from "../../services/api";
import { annytradeFetch } from "../../services/client";
import { annytradeRoutes } from "../../lib/routes";
import { formatCompactTime } from "../../lib/format";
import type { PublicNotification } from "../../types/backend";

export function NotificationsView() {
  const { auth, refreshAuth } = useAnnyTrade();
  const [items, setItems] = useState<PublicNotification[] | null>(null);

  const load = useCallback(async () => {
    if (auth.authenticated) {
      const res = await annytradeFetch<{ notifications: PublicNotification[] }>(
        "/notifications",
      );
      setItems(res.notifications);
      return;
    }
    setItems(
      annytradeApi.listNotifications().map((n) => ({
        id: n.id,
        type: n.kind,
        title: n.title,
        message: n.body,
        read: n.read,
        createdAt: n.createdAt,
      })),
    );
  }, [auth.authenticated]);

  useEffect(() => {
    // Fetch notifications for the signed-in user (or hydrate demo list).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async list hydration
    void load();
  }, [load]);

  async function markAll() {
    if (!auth.authenticated) {
      setItems((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
      return;
    }
    await annytradeFetch("/notifications", {
      method: "PATCH",
      body: JSON.stringify({ action: "mark_all_read" }),
    });
    await load();
    await refreshAuth();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="at-label">Alerts</p>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            Notifications
          </h1>
          {!auth.authenticated ? (
            <p className="mt-1 text-[0.75rem] font-bold text-[#020617]">
              Showing demo notifications.{" "}
              <Link
                href={annytradeRoutes.auth.login}
                className="text-[var(--at-accent)]"
              >
                Sign in
              </Link>{" "}
              for persisted alerts.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="at-btn at-btn-ghost"
          onClick={() => void markAll()}
        >
          Mark all read
        </button>
      </div>

      {items === null ? (
        <p className="text-[0.8125rem] font-bold text-[#020617]">Loading…</p>
      ) : null}

      <ul className="space-y-2">
        {(items ?? []).map((n) => (
          <li key={n.id} className="at-card">
            <div className="at-card-body flex items-start gap-3">
              {!n.read ? (
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ background: "var(--at-accent)" }}
                />
              ) : (
                <span className="mt-1.5 size-2 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="at-badge">{n.type}</span>
                  <span className="text-[0.7rem] font-bold text-[#020617]">
                    {formatCompactTime(n.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold">{n.title}</p>
                <p className="text-[0.8125rem] font-bold text-[#020617]">
                  {n.message}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
