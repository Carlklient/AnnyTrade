"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CandlestickChart,
  LayoutDashboard,
  LineChart,
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
};

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      style={{
        height: "var(--at-mobile-nav-h)",
        background: "color-mix(in srgb, var(--at-surface) 94%, transparent)",
        borderColor: "var(--at-border)",
        backdropFilter: "blur(14px)",
      }}
      aria-label="Primary"
    >
      <ul className="grid h-full grid-cols-5 gap-1">
        {mobileNav.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active =
            item.match === "exact"
              ? pathname === item.href
              : item.href.includes("/trade/")
                ? pathname.startsWith("/annytrade/trade")
                : pathname.startsWith(item.href);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={cnAt(
                  "flex h-full flex-col items-center justify-center gap-0.5 rounded-[8px] text-[0.625rem] font-bold",
                  active ? "text-[var(--at-accent)]" : "text-[var(--at-text)]",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
