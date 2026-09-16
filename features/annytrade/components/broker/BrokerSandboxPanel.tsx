"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeFetch } from "../../services/client";
import { annytradeRoutes } from "../../lib/routes";
import { formatMoney } from "../../lib/format";

type BrokerStatus = {
  paperLabel: string;
  brokerLabel: string;
  liveMoney: false;
  environment: "SANDBOX";
  ordersEnabled: boolean;
  killSwitchActive: boolean;
  credentials: {
    required: boolean;
    hasApiKey: boolean;
    hasApiSecret: boolean;
    hasEncryptionKey: boolean;
    keyHint: string | null;
  };
  connection: {
    id: string;
    provider: string;
    status: string;
    externalAccountId: string | null;
    lastSyncedAt: string | null;
    lastError: string | null;
  } | null;
  provider: {
    id: string;
    label: string;
    limitations: string[];
    supportedOrderTypes: string[];
    supportedAssetsNote: string;
    officialDocsUrl: string;
  } | null;
  message: string;
  paperEnginePreserved?: boolean;
};

export function BrokerSandboxPanel() {
  const { auth } = useAnnyTrade();
  const [status, setStatus] = useState<BrokerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accountCash, setAccountCash] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!auth.authenticated) return;
    try {
      const s = await annytradeFetch<BrokerStatus>("/broker/status", {
        method: "GET",
      });
      setStatus(s);
      setError(null);
      if (!s.credentials.required) {
        try {
          const a = await annytradeFetch<{
            account: { cash: number; buyingPower: number; label: string };
          }>("/broker/account", { method: "GET" });
          setAccountCash(a.account.cash);
        } catch {
          setAccountCash(null);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load broker status",
      );
    }
  }, [auth.authenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      await annytradeFetch("/broker/connect", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  }

  async function reconcile() {
    setBusy(true);
    try {
      await annytradeFetch("/broker/reconcile", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconcile failed");
    } finally {
      setBusy(false);
    }
  }

  if (!auth.authenticated) {
    return (
      <p className="text-[0.8125rem] font-bold text-[#020617]">
        Sign in to manage Broker Paper / Sandbox.{" "}
        <Link
          href={annytradeRoutes.auth.login}
          className="text-[var(--at-accent)]"
        >
          Login
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-3 text-[0.8125rem]">
      <div className="flex flex-wrap gap-2">
        <span className="at-badge">INTERNAL_PAPER</span>
        <span className="at-badge">BROKER_SANDBOX</span>
        <span className="at-badge" style={{ color: "var(--at-live)" }}>
          BROKER_LIVE, DISABLED
        </span>
      </div>

      {error ? <p className="text-[var(--at-sell)]">{error}</p> : null}

      {status ? (
        <>
          <p>
            <strong>Status:</strong>{" "}
            {status.connection?.status ?? "DISCONNECTED"}{" "}
            {status.connection?.lastError ? (
              <span>({status.connection.lastError})</span>
            ) : null}
            {status.message ? ` ${status.message}` : null}
          </p>
          <p>
            <strong>Kill switch:</strong>{" "}
            {status.killSwitchActive
              ? "ACTIVE (orders disabled)"
              : "orders enabled (sandbox only)"}
          </p>
          {status.credentials.required ? (
            <p
              className="rounded-[8px] border px-3 py-2 font-bold text-[#020617]"
              style={{ borderColor: "var(--at-border)" }}
            >
              Broker sandbox credentials are not configured. Architecture is
              ready. Connection is not faked. Set{" "}
              <code className="at-mono">ANNYTRADE_BROKER_API_KEY_ID</code> /{" "}
              <code className="at-mono">ANNYTRADE_BROKER_API_SECRET_KEY</code>{" "}
              for Alpaca Paper.
            </p>
          ) : (
            <p>
              Key hint {status.credentials.keyHint ?? "env"}, Cash{" "}
              {accountCash == null ? "…" : formatMoney(accountCash, "USD")}
            </p>
          )}
          {status.provider ? (
            <div className="text-[0.75rem] font-bold text-[#020617]">
              <p>{status.provider.label}</p>
              <p>{status.provider.supportedAssetsNote}</p>
              <p>
                Order types: {status.provider.supportedOrderTypes.join(", ")}
              </p>
              <ul className="mt-1 list-inside list-disc">
                {status.provider.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <a
                href={status.provider.officialDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--at-accent)]"
              >
                Official docs
              </a>
            </div>
          ) : null}
        </>
      ) : (
        <p className="font-bold text-[#020617]">Loading broker status…</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="at-btn at-btn-primary"
          disabled={busy || Boolean(status?.credentials.required)}
          onClick={() => void connect()}
        >
          Connect sandbox
        </button>
        <button
          type="button"
          className="at-btn at-btn-ghost"
          disabled={busy || Boolean(status?.credentials.required)}
          onClick={() => void reconcile()}
        >
          Reconcile
        </button>
        <button
          type="button"
          className="at-btn at-btn-ghost"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </div>
      <p className="text-[0.7rem] font-bold text-[#020617]">
        AnnyTrade PAPER engine is preserved and separate. Broker balances never
        mix with internal paper ledger.
      </p>
    </div>
  );
}
