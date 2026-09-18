"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { annytradeRoutes } from "../../lib/routes";

const KEY = "annytrade.desk.tour.v1";

const STEPS = [
  {
    title: "Welcome to the paper desk",
    body: "Everything here is simulated. Live brokerage stays hard-blocked.",
  },
  {
    title: "Pick a market",
    body: "Open Markets, star favorites, then jump into Trade for a symbol.",
  },
  {
    title: "Place a PAPER order",
    body: "Use market/limit/stop, optional TP/SL brackets on BUY, and one-click if you like.",
  },
  {
    title: "Review the book",
    body: "Portfolio, wallet, and analytics reflect your real paper ledger — not mock chrome.",
  },
];

export function DeskTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "done") return;
      setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!open) return null;
  const current = STEPS[step]!;

  function finish() {
    try {
      localStorage.setItem(KEY, "done");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-x-3 bottom-[calc(var(--at-mobile-nav-h)+0.75rem)] z-50 mx-auto max-w-md rounded-[12px] border p-4 shadow-lg lg:bottom-6"
      style={{
        borderColor: "var(--at-border-strong)",
        background: "var(--at-bg-elevated)",
      }}
      role="dialog"
      aria-label="Desk tour"
    >
      <p className="at-label">
        Tour {step + 1}/{STEPS.length}
      </p>
      <h2 className="mt-1 text-base font-semibold">{current.title}</h2>
      <p className="mt-1 text-[0.8125rem] font-semibold leading-relaxed">
        {current.body}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="at-btn at-btn-primary h-9"
            onClick={() => setStep((s) => s + 1)}
          >
            Next
          </button>
        ) : (
          <Link
            href={annytradeRoutes.markets}
            className="at-btn at-btn-primary h-9"
            onClick={finish}
          >
            Open markets
          </Link>
        )}
        <button type="button" className="at-btn at-btn-ghost h-9" onClick={finish}>
          Skip
        </button>
      </div>
    </div>
  );
}
