"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { annytradeRoutes } from "../../lib/routes";

export function BrandMark() {
  return (
    <span className="atl-brand-mark" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M2.5 11.5L6 6.5L9 9.5L13.5 3.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.5 3.5H13.5V6.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

const MENU_LINKS = [
  { href: annytradeRoutes.auth.login, label: "Log in" },
  { href: annytradeRoutes.auth.register, label: "Sign up" },
  { href: annytradeRoutes.dashboard, label: "Open desk" },
  { href: annytradeRoutes.markets, label: "Markets" },
  { href: annytradeRoutes.signals, label: "Signals" },
  { href: annytradeRoutes.portfolio, label: "Portfolio" },
] as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="atl-nav" ref={rootRef}>
      <Link
        href={annytradeRoutes.root}
        className="atl-brand"
        aria-label="AnnyTrade home"
      >
        <BrandMark />
        <span className="atl-brand-name">annytrade</span>
      </Link>
      <div className="atl-nav-actions">
        <Link
          href={annytradeRoutes.auth.login}
          className="atl-btn atl-btn-ghost atl-btn-login atl-nav-desktop"
        >
          Log in
        </Link>
        <Link
          href={annytradeRoutes.auth.register}
          className="atl-btn atl-btn-primary atl-nav-desktop"
        >
          Sign up
        </Link>
        <button
          type="button"
          className="atl-menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <span data-open={open ? "true" : "false"} />
        </button>
      </div>
      {open ? (
        <nav id={menuId} className="atl-menu-panel" aria-label="Site menu">
          {MENU_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="atl-menu-link"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
