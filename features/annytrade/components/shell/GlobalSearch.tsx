"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Search, X } from "lucide-react";

import { useInstrumentSearch } from "../../hooks/useInstrumentSearch";
import { annytradeRoutes } from "../../lib/routes";

const SECTION_JUMPS = [
  { label: "Markets", href: annytradeRoutes.markets, keys: ["market", "markets"] },
  { label: "Signals", href: annytradeRoutes.signals, keys: ["signal", "signals"] },
  { label: "News", href: annytradeRoutes.news, keys: ["news"] },
  {
    label: "Portfolio",
    href: annytradeRoutes.portfolio,
    keys: ["portfolio", "position"],
  },
  { label: "Wallet", href: annytradeRoutes.wallet, keys: ["wallet", "cash", "fund"] },
  { label: "Calendar", href: annytradeRoutes.calendar, keys: ["calendar", "event"] },
] as const;

type Row =
  | { kind: "instrument"; id: string; symbol: string; name: string; href: string }
  | { kind: "section"; id: string; label: string; href: string };

export function GlobalSearch({
  compactTrigger = false,
}: {
  compactTrigger?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const { instruments, loading, error } = useInstrumentSearch(query, 8);

  const sectionHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SECTION_JUMPS.filter((s) =>
      s.keys.some((k) => k.startsWith(q) || q.includes(k)),
    ).slice(0, 4);
  }, [query]);

  const rows: Row[] = useMemo(() => {
    const instrumentRows: Row[] = instruments.map((inst) => ({
      kind: "instrument",
      id: `i-${inst.symbol}`,
      symbol: inst.symbol,
      name: inst.name ?? inst.symbol,
      href: annytradeRoutes.trade(inst.symbol),
    }));
    const sectionRows: Row[] = sectionHits.map((s) => ({
      kind: "section",
      id: `s-${s.label}`,
      label: s.label,
      href: s.href,
    }));
    return [...instrumentRows, ...sectionRows];
  }, [instruments, sectionHits]);

  useEffect(() => {
    setHighlight(0);
  }, [query, rows.length]);

  useEffect(() => {
    if (!open && !mobileOpen) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setMobileOpen(false);
      }
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mobileOpen]);

  useEffect(() => {
    if (mobileOpen) {
      inputRef.current?.focus();
    }
  }, [mobileOpen]);

  function go(href: string) {
    setOpen(false);
    setMobileOpen(false);
    setQuery("");
    router.push(href);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(0, rows.length - 1)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[highlight] ?? rows[0];
      if (row) go(row.href);
    }
  }

  const panelOpen = open && query.trim().length > 0;
  const showPanel = panelOpen || (mobileOpen && query.trim().length > 0);

  const panel = (
    <div
      id={listId}
      role="listbox"
      className="absolute top-[calc(100%+0.35rem)] left-0 z-50 w-full min-w-[16rem] overflow-hidden rounded-[10px] border shadow-lg"
      style={{
        background: "var(--at-surface)",
        borderColor: "var(--at-border)",
        boxShadow: "var(--at-shadow)",
      }}
    >
      {loading ? (
        <p className="px-3 py-2.5 text-[0.75rem] font-semibold text-[#020617]">
          Searching…
        </p>
      ) : null}
      {error ? (
        <p className="px-3 py-2.5 text-[0.75rem] font-semibold text-[var(--at-sell)]">
          {error}
        </p>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="px-3 py-2.5 text-[0.75rem] font-semibold text-[#020617]">
          No matches
        </p>
      ) : null}
      <ul className="max-h-72 overflow-y-auto py-1">
        {rows.map((row, idx) => {
          const active = idx === highlight;
          if (row.kind === "instrument") {
            return (
              <li key={row.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[0.8125rem]"
                  style={{
                    background: active ? "var(--at-surface-2)" : "transparent",
                  }}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => go(row.href)}
                >
                  <span className="font-bold text-[#020617]">{row.symbol}</span>
                  <span className="truncate text-[0.7rem] font-semibold text-[#0f172a]">
                    {row.name}
                  </span>
                </button>
              </li>
            );
          }
          return (
            <li key={row.id} role="option" aria-selected={active}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] font-bold text-[#1d4ed8]"
                style={{
                  background: active ? "var(--at-surface-2)" : "transparent",
                }}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => go(row.href)}
              >
                Go to {row.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div
        className="border-t px-3 py-1.5 text-[0.65rem] font-semibold text-[#0f172a]"
        style={{ borderColor: "var(--at-border)" }}
      >
        Enter to open · Esc to close
      </div>
    </div>
  );

  if (compactTrigger) {
    return (
      <div className="relative md:hidden" ref={rootRef}>
        <button
          type="button"
          className="at-btn at-btn-ghost size-9 shrink-0 p-0"
          aria-label="Open search"
          onClick={() => setMobileOpen(true)}
        >
          <Search className="size-4" strokeWidth={1.75} />
        </button>
        {mobileOpen ? (
          <div
            className="fixed inset-x-0 top-[var(--at-topbar-h)] z-50 border-b p-3"
            style={{
              background: "var(--at-bg)",
              borderColor: "var(--at-border)",
            }}
          >
            <div className="relative mx-auto max-w-lg">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#020617]"
                strokeWidth={1.75}
              />
              <input
                ref={inputRef}
                className="at-input w-full pl-8 pr-9"
                placeholder="Search symbols, markets, signals…"
                aria-label="Search"
                aria-controls={listId}
                aria-expanded={showPanel}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onKeyDown={onKeyDown}
                onFocus={() => setOpen(true)}
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 p-1"
                aria-label="Close search"
                onClick={() => {
                  setMobileOpen(false);
                  setQuery("");
                }}
              >
                <X className="size-3.5" />
              </button>
              {showPanel ? panel : null}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative hidden min-w-0 flex-1 md:block md:max-w-sm" ref={rootRef}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#020617]"
        strokeWidth={1.75}
      />
      <input
        className="at-input pl-8"
        placeholder="Search symbols, news, signals…"
        aria-label="Search"
        aria-controls={listId}
        aria-expanded={panelOpen}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {panelOpen ? panel : null}
    </div>
  );
}
