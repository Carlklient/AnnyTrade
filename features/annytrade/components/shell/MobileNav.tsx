"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CandlestickChart,
  LayoutDashboard,
  LineChart,
  Newspaper,
  Radar,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { mobileNav } from "../../lib/routes";
import { cnAt } from "../../lib/format";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  CandlestickChart,
  LineChart,
  Briefcase,
  Wallet,
  Radar,
  Newspaper,
};

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      style={{
        height: "var(--at-mobile-nav-h)",
        background: "color-mix(in srgb, var(--at-surface) 94%, transparent)",
        borderColor: "var(--at-border)",
        backdropFilter: "blur(14px)",
      }}
      aria-label="Primary"
    >
      <ul className="flex h-full items-stretch gap-0.5 overflow-x-auto">
        {mobileNav.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active =
            item.match === "exact"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="min-w-[4.25rem] flex-1">
              <Link
                href={item.href}
                className={cnAt(
                  "flex h-full flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[0.58rem] font-bold",
                  active ? "text-[var(--at-accent)]" : "text-[#020617]",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
