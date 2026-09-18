"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { annytradeRoutes } from "../../lib/routes";

const KEY = "annytrade.desk.tour.v2";

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
    body: "Use market, limit, or stop — optional TP/SL on buys, plus one-click if you want speed.",
  },
  {
    title: "Review the book",
    body: "Portfolio, wallet, and analytics follow your real paper ledger.",
  },
];

/** First-run coach — desk shell only (never on the marketing landing). */
export function DeskTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "done") return;
      const id = window.setTimeout(() => setOpen(true), 400);
      return () => window.clearTimeout(id);
    } catch {
      /* ignore */
    }
  }, []);

  if (!open) return null;
  const current = STEPS[step]!;
  const last = step >= STEPS.length - 1;

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
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="at-desk-tour-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#020617]/45 backdrop-blur-[2px]"
        aria-label="Dismiss tour"
        onClick={finish}
      />
      <div
        className="relative w-full max-w-[22rem] overflow-hidden rounded-[14px] border shadow-xl"
        style={{
          borderColor: "var(--at-border-strong)",
          background: "var(--at-bg-elevated)",
          color: "var(--at-text)",
        }}
      >
        <div
          className="h-1 w-full"
          style={{
            background: "color-mix(in srgb, var(--at-text) 10%, transparent)",
          }}
        >
          <div
            className="h-full transition-[width] duration-300 ease-out"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              background: "var(--at-accent)",
            }}
          />
        </div>
        <div className="p-5">
          <p className="text-[0.65rem] font-bold tracking-[0.08em] uppercase opacity-70">
            Paper tour · {step + 1} of {STEPS.length}
          </p>
          <h2
            id="at-desk-tour-title"
            className="mt-2 text-[1.05rem] font-semibold tracking-[-0.02em]"
            style={{ fontFamily: "var(--at-font-display)" }}
          >
            {current.title}
          </h2>
          <p className="mt-2 text-[0.8125rem] font-medium leading-relaxed opacity-90">
            {current.body}
          </p>

          <div className="mt-4 flex items-center gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === step ? "1.1rem" : "0.35rem",
                  background:
                    i === step
                      ? "var(--at-accent)"
                      : "color-mix(in srgb, var(--at-text) 18%, transparent)",
                }}
              />
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            {last ? (
              <Link
                href={annytradeRoutes.markets}
                className="at-btn at-btn-primary h-10 flex-1 justify-center"
                onClick={finish}
              >
                Open markets
              </Link>
            ) : (
              <button
                type="button"
                className="at-btn at-btn-primary h-10 flex-1 justify-center"
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </button>
            )}
            <button
              type="button"
              className="at-btn at-btn-ghost h-10 px-4"
              onClick={finish}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
