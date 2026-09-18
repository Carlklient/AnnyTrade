"use client";

import Link from "next/link";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import { formatMoney } from "../../lib/format";

/** Truthful cash paper metrics — no fake CFD margin. */
export function TradingTopMetrics() {
  const { auth, account, refreshPaperAccount } = useAnnyTrade();
  const currency = account.currency || "USD";
  const signedIn = auth.authenticated;
  const equity = signedIn ? account.equity : 0;
  const cash = signedIn ? account.balance : 0;
  const available = signedIn ? account.available : 0;
  const reserved = signedIn ? account.marginUsed : 0;
  const unrealized = signedIn ? account.unrealizedPnl : 0;

  return (
    <div className="at-term-metrics" aria-label="Paper account metrics">
      <Metric label="Equity" value={formatMoney(equity, currency)} />
      <Metric label="Cash" value={formatMoney(cash, currency)} />
      <Metric label="Available" value={formatMoney(available, currency)} />
      <Metric label="Reserved" value={formatMoney(reserved, currency)} />
      <Metric
        label="Floating P/L"
        value={formatMoney(unrealized, currency, { signed: true })}
      />
      <Metric label="Leverage" value="1:1 cash" />
      <Link
        href={annytradeRoutes.wallet}
        className="at-btn at-btn-primary at-term-deposit"
        onClick={() => void refreshPaperAccount()}
      >
        Paper top-up
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="at-term-metric">
      <span className="lbl">{label}</span>
      <span className="val at-mono">{value}</span>
    </div>
  );
}
