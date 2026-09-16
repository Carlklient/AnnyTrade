"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeFetch } from "../../services/client";

type Readiness = {
  liveExecutionEnabled: false;
  message: string;
  environments: {
    INTERNAL_PAPER: { label: string; liveMoney: boolean };
    BROKER_SANDBOX: {
      label: string;
      liveMoney: boolean;
      ordersEnabled?: boolean;
    };
    BROKER_LIVE: {
      label: string;
      liveMoney: boolean;
      enabled: false;
      message: string;
    };
  };
  emergencyKillSwitchActive: boolean;
  compliance: { approvedForLive: false; notice: string };
};

export function ExecutionEnvironmentBanner() {
  const { auth } = useAnnyTrade();
  const [ready, setReady] = useState<Readiness | null>(null);

  useEffect(() => {
    if (!auth.authenticated) {
      setReady(null);
      return;
    }
    let cancelled = false;
    void annytradeFetch<Readiness>("/execution/readiness", { method: "GET" })
      .then((r) => {
        if (!cancelled) setReady(r);
      })
      .catch(() => {
        if (!cancelled) setReady(null);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.authenticated]);

  return (
    <div
      className="mb-3 rounded-[8px] border px-3 py-2 text-[0.75rem]"
      style={{
        borderColor: "var(--at-border)",
        background: "var(--at-bg-elevated)",
        color: "var(--at-text-secondary)",
      }}
      role="status"
      aria-label="Execution environments"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="at-badge">INTERNAL_PAPER</span>
        <span className="at-badge">BROKER_SANDBOX</span>
        <span
          className="at-badge"
          style={{
            background: "var(--at-sell-muted)",
            color: "var(--at-live)",
          }}
        >
          BROKER_LIVE, DISABLED
        </span>
      </div>
      <p>
        <strong className="text-[var(--at-text)]">
          Execution environments
        </strong>
        {": "}
        AnnyTrade PAPER and Broker Paper/Sandbox are separate. Real-money Broker
        Live cannot be switched on from the UI.
      </p>
      {ready ? (
        <p className="mt-1 text-[0.7rem] font-bold text-[#020617]">
          {ready.message}
          {ready.emergencyKillSwitchActive
            ? " Emergency kill switch ACTIVE."
            : ""}{" "}
          {ready.compliance.notice}
        </p>
      ) : auth.authenticated ? (
        <p className="mt-1 text-[0.7rem] font-bold text-[#020617]">
          Loading readiness…
        </p>
      ) : null}
    </div>
  );
}
