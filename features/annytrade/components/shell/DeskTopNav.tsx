"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, UserRound } from "lucide-react";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import { formatMoney } from "../../lib/format";

const NAV = [
  {
    href: annytradeRoutes.dashboard,
    label: "Dashboard",
    match: "exact" as const,
  },
  { href: annytradeRoutes.trade(), label: "Trading", match: "prefix" as const },
  { href: annytradeRoutes.signals, label: "Signals", match: "prefix" as const },
  { href: annytradeRoutes.markets, label: "Markets", match: "prefix" as const },
  { href: annytradeRoutes.wallet, label: "Wallet", match: "prefix" as const },
  { href: annytradeRoutes.news, label: "News", match: "prefix" as const },
];

function active(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  if (href.includes("/trade")) return pathname.startsWith("/annytrade/trade");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DeskTopNav() {
  const pathname = usePathname();
  const { auth, account, user } = useAnnyTrade();

  return (
    <header className="at-desk-nav">
      <Link
        href={annytradeRoutes.root}
        className="flex shrink-0 items-center gap-2 no-underline"
        style={{ color: "var(--at-text)" }}
        aria-label="AnnyTrade home"
      >
        <span
          className="grid size-7 place-items-center rounded-[8px] text-white"
          style={{ background: "var(--at-accent)" }}
          aria-hidden
        >
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
        <span
          className="text-[1.15rem] font-bold tracking-[-0.04em]"
          style={{
            fontFamily: "var(--at-font-display)",
            color: "var(--at-accent)",
          }}
        >
          annytrade
        </span>
      </Link>

      <nav className="at-desk-nav-links" aria-label="Primary">
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="at-desk-nav-link"
            data-active={
              active(pathname, item.href, item.match) ? "true" : "false"
            }
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {auth.authenticated ? (
          <span className="hidden text-right text-[0.75rem] sm:block">
            <span className="block font-bold text-[var(--at-text)]">Practice</span>
            <span className="at-mono font-bold">
              {formatMoney(account.equity, account.currency)}
            </span>
          </span>
        ) : null}
        <Link
          href={annytradeRoutes.wallet}
          className="at-btn at-btn-primary h-9 px-4"
        >
          Deposit
        </Link>
        <Link
          href={
            auth.authenticated
              ? annytradeRoutes.account
              : annytradeRoutes.auth.login
          }
          className="at-btn at-btn-ghost size-9 p-0"
          aria-label="Account"
        >
          {auth.authenticated ? (
            <span className="text-[0.65rem] font-bold">
              {user.avatarInitials}
            </span>
          ) : (
            <UserRound className="size-4" />
          )}
        </Link>
        <Link
          href={annytradeRoutes.account}
          className="at-btn at-btn-ghost size-9 p-0 md:hidden"
          aria-label="Menu"
        >
          <Menu className="size-4" />
        </Link>
      </div>
    </header>
  );
}
