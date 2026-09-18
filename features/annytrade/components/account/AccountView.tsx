"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeFetch } from "../../services/client";
import { annytradeRoutes } from "../../lib/routes";
import { ModeSwitch } from "../shell/ModeSwitch";
import { SymbolAlertsPanel } from "../alerts/SymbolAlertsPanel";
import { BrokerSandboxPanel } from "../broker/BrokerSandboxPanel";
import type { PublicAccount, PublicWatchlist } from "../../types/backend";
import { WatchlistQuotesPanel } from "./WatchlistQuotesPanel";

export function AccountView() {
  const {
    user,
    account,
    mode,
    auth,
    authLoading,
    logout,
    refreshAuth,
    setActiveAccountId,
    activeAccountId,
    refreshPaperAccount,
  } = useAnnyTrade();
  const [draftName, setDraftName] = useState(user.name);
  const [draftTimezone, setDraftTimezone] = useState("UTC");
  const [draftPrefs, setDraftPrefs] = useState({
    notifyOrders: true,
    notifySignals: true,
    notifySecurity: true,
    notifyMarketing: false,
    notifyPriceAlerts: true,
    notifyEmailAlerts: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<PublicAccount[]>([]);
  const [watchlists, setWatchlists] = useState<PublicWatchlist[]>([]);

  // Keep editable drafts aligned when auth profile arrives.
  const profileName = auth.profile?.displayName;
  const profileTimezone = auth.profile?.timezone;
  useEffect(() => {
    if (!auth.profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync drafts from server profile
    setDraftName(profileName ?? user.name);
    setDraftTimezone(profileTimezone ?? "UTC");
    setDraftPrefs({
      notifyOrders: auth.profile.notifyOrders,
      notifySignals: auth.profile.notifySignals,
      notifySecurity: auth.profile.notifySecurity,
      notifyMarketing: auth.profile.notifyMarketing,
      notifyPriceAlerts: auth.profile.notifyPriceAlerts ?? true,
      notifyEmailAlerts: auth.profile.notifyEmailAlerts ?? false,
    });
  }, [auth.profile, profileName, profileTimezone, user.name]);

  useEffect(() => {
    if (!auth.authenticated) return;
    let cancelled = false;
    void (async () => {
      try {
        const [a, w] = await Promise.all([
          annytradeFetch<{ accounts: PublicAccount[] }>("/accounts"),
          annytradeFetch<{ watchlists: PublicWatchlist[] }>("/watchlists"),
        ]);
        if (!cancelled) {
          setAccounts(a.accounts);
          setWatchlists(w.watchlists);
        }
      } catch {
        // keep empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.authenticated]);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    try {
      await annytradeFetch("/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: draftName,
          timezone: draftTimezone,
          ...draftPrefs,
        }),
      });
      await refreshAuth();
      setMessage("Profile saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return <div className="at-card at-card-body">Loading account…</div>;
  }

  if (!auth.authenticated) {
    return (
      <div className="space-y-4">
        <div>
          <p className="at-label">Settings</p>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            Account
          </h1>
        </div>
        <div className="at-card">
          <div className="at-card-body space-y-3 text-[0.875rem]">
            <p className="font-bold text-[var(--at-text)]">
              You are browsing the <strong>public product demo</strong>. Market
              prices and balances shown on other screens are simulated. Sign in
              to persist profile, watchlists, paper accounts, and notifications.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={annytradeRoutes.auth.login}
                className="at-btn at-btn-primary"
              >
                Sign in
              </Link>
              <Link
                href={annytradeRoutes.auth.register}
                className="at-btn at-btn-ghost"
              >
                Create paper account
              </Link>
            </div>
            <p className="text-[0.75rem] font-bold text-[var(--at-text)]">
              Guest session still uses mock desk data: {user.email}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="at-label">Settings</p>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            Account
          </h1>
        </div>
        <button
          type="button"
          className="at-btn at-btn-ghost"
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </div>

      {message ? (
        <p className="text-[0.8125rem] font-bold text-[var(--at-text)]">{message}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">Profile</h2>
          </div>
          <div className="at-card-body space-y-3 text-[0.8125rem]">
            <label className="block">
              <span className="at-label mb-1 block">Display name</span>
              <input
                className="at-input"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="at-label mb-1 block">Timezone</span>
              <input
                className="at-input"
                value={draftTimezone}
                onChange={(e) => setDraftTimezone(e.target.value)}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="at-label">Notification preferences</legend>
              {(
                [
                  ["notifyPriceAlerts", "Price alerts (in-app)"],
                  ["notifyOrders", "Order events"],
                  ["notifySignals", "Signal updates"],
                  ["notifySecurity", "Security"],
                  ["notifyMarketing", "Marketing"],
                  [
                    "notifyEmailAlerts",
                    "Email alerts (requires Resend + opt-in)",
                  ],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-[0.8125rem]"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(draftPrefs[key])}
                    onChange={(e) =>
                      setDraftPrefs((p) => ({ ...p, [key]: e.target.checked }))
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <Row label="Email" value={user.email} />
            <Row
              label="Email verified"
              value={auth.backendUser?.emailVerified ? "Yes" : "Pending"}
            />
            <Row label="Status" value={auth.backendUser?.status ?? "ACTIVE"} />
            <button
              type="button"
              className="at-btn at-btn-primary"
              disabled={saving}
              onClick={() => void saveProfile()}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </section>

        <section className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">Trading preferences</h2>
          </div>
          <div className="at-card-body space-y-3 text-[0.8125rem]">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-[var(--at-text)]">
                Paper / Preview UI
              </span>
              <ModeSwitch />
            </div>
            <Row
              label="UI posture"
              value={mode === "live" ? "Preview UI" : "Paper"}
            />
            <p className="text-[0.7rem] font-bold text-[var(--at-text)]">
              Preview UI only changes layout chrome. Paper ledger funds are not
              real money. Market quotes may be DEMO or a live vendor feed.
            </p>
            <Row label="Desk account id" value={account.id} />
          </div>
        </section>

        <section className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">Paper accounts</h2>
          </div>
          <ul className="at-card-body space-y-2 text-[0.8125rem]">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0"
                style={{ borderColor: "var(--at-border)" }}
              >
                <span>
                  {a.label}, {a.accountType}
                  {activeAccountId === a.id ? " · active" : ""}
                </span>
                <span className="flex items-center gap-2">
                  <span className="at-mono">
                    {a.ledgerBalance.toLocaleString()} {a.baseCurrency}
                  </span>
                  <button
                    type="button"
                    className="at-btn at-btn-ghost h-8"
                    disabled={activeAccountId === a.id}
                    onClick={() => {
                      setActiveAccountId(a.id);
                      void refreshPaperAccount();
                    }}
                  >
                    Use
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">Sessions &amp; alerts</h2>
          </div>
          <div className="at-card-body space-y-2 text-[0.8125rem]">
            <p className="font-semibold">
              Revoke all other sessions by changing your password via reset, or
              sign out below.
            </p>
            <button
              type="button"
              className="at-btn at-btn-ghost h-9"
              onClick={() => {
                void import("../../lib/notify-client").then((m) =>
                  m.ensureBrowserNotifications().then((ok) =>
                    setMessage(
                      ok
                        ? "Browser notifications enabled"
                        : "Browser notifications unavailable",
                    ),
                  ),
                );
              }}
            >
              Enable browser push
            </button>
            <button
              type="button"
              className="at-btn at-btn-ghost h-9"
              onClick={() => void logout()}
            >
              Sign out this session
            </button>
            <Link
              href={annytradeRoutes.auth.forgot}
              className="at-btn at-btn-ghost h-9"
            >
              Change password (reset email)
            </Link>
          </div>
        </section>

        <section className="at-card lg:col-span-2">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">Broker Paper / Sandbox</h2>
          </div>
          <div className="at-card-body">
            <BrokerSandboxPanel />
          </div>
        </section>

        <section className="at-card lg:col-span-2">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">Price alerts</h2>
            <Link
              href={annytradeRoutes.notifications}
              className="text-[0.75rem] text-[var(--at-accent)]"
            >
              Notifications
            </Link>
          </div>
          <div className="at-card-body">
            <SymbolAlertsPanel symbol="AAPL" />
            <p className="mt-3 text-[0.7rem] font-bold text-[var(--at-text)]">
              Create symbol-specific alerts from the Trade desk Alerts tab.
              Example panel defaults to AAPL.
            </p>
          </div>
        </section>

        <section className="at-card">
          <div className="at-card-header">
            <h2 className="text-sm font-semibold">Watchlists</h2>
          </div>
          <WatchlistQuotesPanel watchlists={watchlists} />
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-start justify-between gap-4 border-b pb-2 last:border-0"
      style={{ borderColor: "var(--at-border)" }}
    >
      <span className="font-bold text-[var(--at-text)]">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
