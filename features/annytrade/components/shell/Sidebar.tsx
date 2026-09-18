"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CandlestickChart,
  LayoutDashboard,
  LineChart,
  Newspaper,
  Radar,
  UserRound,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AnnyTradeLogo } from "../brand/AnnyTradeLogo";
import { primaryNav, annytradeRoutes } from "../../lib/routes";
import { cnAt } from "../../lib/format";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  CandlestickChart,
  LineChart,
  Radar,
  Briefcase,
  Wallet,
  BarChart3,
  CalendarDays,
  Newspaper,
  UserRound,
};

function isActive(pathname: string, href: string, match?: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  if (href.includes("/trade/")) return pathname.startsWith("/annytrade/trade");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="sticky top-0 z-30 hidden h-dvh w-[var(--at-sidebar-w)] shrink-0 flex-col border-r lg:flex"
      style={{
        background: "color-mix(in srgb, var(--at-surface) 88%, transparent)",
        borderColor: "var(--at-border)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex h-[var(--at-topbar-h)] items-center px-4">
        <Link href={annytradeRoutes.root} className="outline-none" aria-label="AnnyTrade home">
          <AnnyTradeLogo />
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-4">
        <p className="at-label px-2.5 py-2">Workspace</p>
        {primaryNav.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active = isActive(pathname, item.href, item.match);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={cnAt(
                "flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[0.8125rem] font-medium transition-colors",
                active
                  ? "text-[var(--at-text)]"
                  : "font-bold text-[#020617] hover:bg-[var(--at-surface-2)] hover:text-[var(--at-text)]",
              )}
              style={
                active
                  ? {
                      background: "var(--at-accent-muted)",
                      boxShadow: "inset 2px 0 0 var(--at-accent)",
                    }
                  : undefined
              }
            >
              <Icon className="size-4 opacity-80" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div
        className="space-y-2 border-t px-3 py-3"
        style={{ borderColor: "var(--at-border)" }}
      >
        <p className="text-[0.7rem] leading-relaxed font-bold text-[#020617]">
          Portfolio demo, simulated market data. Paper accounts persist when
          signed in.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/work/annytrade"
            className="text-[0.75rem] font-medium text-[var(--at-accent)] hover:underline"
          >
            â† Back to portfolio
          </Link>
          <Link
            href={annytradeRoutes.auth.login}
            className="text-[0.7rem] font-bold text-[#020617] hover:font-bold"
          >
            Sign in
          </Link>
        </div>
      </div>
    </aside>
  );
}
