"use client";

import Link from "next/link";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import { formatMoney } from "../../lib/format";

export function TradingTopMetrics() {
  const { auth, account } = useAnnyTrade();
  const currency = account.currency || "USD";
  const equity = auth.authenticated ? account.equity : 0;
  const cash = auth.authenticated ? account.balance : 0;
  const freeMargin = auth.authenticated ? account.freeMargin : 0;
  const marginUsed = auth.authenticated ? account.marginUsed : 0;
  const unrealized = auth.authenticated ? account.unrealizedPnl : 0;

  return (
    <div className="at-term-metrics" aria-label="Account metrics">
      <Metric label="Margin" value={formatMoney(marginUsed, currency)} />
      <Metric label="Free margin" value={formatMoney(freeMargin, currency)} />
      <Metric label="Margin level" value="n/a" />
      <Metric label="Equity" value={formatMoney(equity, currency)} />
      <Metric label="Cash" value={formatMoney(cash, currency)} />
      <Metric
        label="Floating P/L"
        value={formatMoney(unrealized, currency, { signed: true })}
      />
      <Link
        href={annytradeRoutes.wallet}
        className="at-btn at-btn-primary at-term-deposit"
      >
        Deposit
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
