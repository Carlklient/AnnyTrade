"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";

import { annytradeFetch } from "@/features/annytrade/services/client";

type UserRow = {
  id: string;
  emailRedacted: string;
  displayName: string;
  status: string;
  adminRole: string | null;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const res = await annytradeFetch<{ users: UserRow[] }>(
      `/admin/users?${params.toString()}`,
      { method: "GET" },
    );
    setUsers(res.users);
  }, [status, q]);

  useEffect(() => {
    void refresh().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed"),
    );
  }, [refresh]);

  async function suspend(id: string) {
    const reason = window.prompt("Suspension reason?");
    if (!reason) return;
    setBusy(true);
    try {
      await annytradeFetch(`/admin/users/${id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suspend failed");
    } finally {
      setBusy(false);
    }
  }

  async function unsuspend(id: string) {
    const reason = window.prompt("Unsuspend reason?");
    if (!reason) return;
    setBusy(true);
    try {
      await annytradeFetch(`/admin/users/${id}/unsuspend`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unsuspend failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          className="at-input"
          placeholder="Search email/name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="at-input w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>
      {error ? <p className="text-[var(--at-sell)]">{error}</p> : null}
      <div className="overflow-x-auto text-[0.75rem]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[var(--at-text-muted)]">
              <th className="p-2">User</th>
              <th className="p-2">Status</th>
              <th className="p-2">Admin</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                style={{ borderTop: "1px solid var(--at-border)" }}
              >
                <td className="p-2">
                  <div className="font-medium">{u.displayName}</div>
                  <div className="at-mono text-[var(--at-text-muted)]">
                    {u.emailRedacted}
                  </div>
                </td>
                <td className="p-2">{u.status}</td>
                <td className="p-2">{u.adminRole ?? "n/a"}</td>
                <td className="p-2">
                  {u.status === "ACTIVE" ? (
                    <button
                      type="button"
                      className="at-btn at-btn-ghost"
                      disabled={busy}
                      onClick={() => void suspend(u.id)}
                    >
                      Suspend
                    </button>
                  ) : u.status === "SUSPENDED" ? (
                    <button
                      type="button"
                      className="at-btn at-btn-ghost"
                      disabled={busy}
                      onClick={() => void unsuspend(u.id)}
                    >
                      Unsuspend
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
