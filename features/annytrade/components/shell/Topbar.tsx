"use client";

import Link from "next/link";
import { Bell, Moon, Sun } from "lucide-react";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { annytradeRoutes } from "../../lib/routes";
import { formatMoney, pnlClass } from "../../lib/format";
import { ModeSwitch } from "./ModeSwitch";
import { GlobalSearch } from "./GlobalSearch";
import { AnnyTradeLogo } from "../brand/AnnyTradeLogo";
import { MarketDataBadge } from "../markets/MarketDataBadge";

export function Topbar() {
  const { account, user, unreadNotifications, theme, toggleTheme } =
    useAnnyTrade();

  return (
    <header
      className="sticky top-0 z-20 flex h-[var(--at-topbar-h)] items-center gap-2 border-b px-3 sm:gap-3 sm:px-4"
      style={{
        background: "color-mix(in srgb, var(--at-bg) 82%, transparent)",
        borderColor: "var(--at-border)",
        backdropFilter: "blur(14px)",
      }}
    >
      <Link href={annytradeRoutes.dashboard} className="shrink-0 lg:hidden">
        <AnnyTradeLogo compact />
      </Link>

      <GlobalSearch />
      <GlobalSearch compactTrigger />

      <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
        <MarketDataBadge />

        <ModeSwitch />

        <div className="hidden text-right xl:block">
          <p className="at-label">Paper equity</p>
          <p
            className={`at-mono text-[0.8125rem] font-semibold ${pnlClass(account.unrealizedPnl)}`}
          >
            {formatMoney(account.equity, account.currency)}
          </p>
        </div>

        <button
          type="button"
          className="at-btn at-btn-ghost size-9 shrink-0 p-0"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>

        <Link
          href={annytradeRoutes.notifications}
          className="at-btn at-btn-ghost relative size-9 shrink-0 p-0"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unreadNotifications > 0 ? (
            <span
              className="absolute top-1 right-1 size-1.5 rounded-full"
              style={{ background: "var(--at-accent)" }}
            />
          ) : null}
        </Link>

        <Link
          href={annytradeRoutes.account}
          className="flex shrink-0 items-center gap-2 rounded-[8px] border py-1 pr-1.5 pl-1 sm:pr-2"
          style={{
            borderColor: "var(--at-border)",
            background: "var(--at-surface)",
          }}
        >
          <span
            className="flex size-7 items-center justify-center rounded-[6px] text-[0.65rem] font-bold"
            style={{
              background: "var(--at-surface-3)",
              color: "var(--at-text)",
            }}
          >
            {user.avatarInitials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-[0.75rem] leading-tight font-semibold">
              {user.name}
            </span>
            <span className="at-label text-[0.55rem]">{account.id}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
