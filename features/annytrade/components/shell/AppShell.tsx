"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { MobileNav } from "./MobileNav";
import { DeskTopNav } from "./DeskTopNav";
import { TradingTopMetrics } from "./TradingTopMetrics";
import "../../styles/desk.css";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isTerminal = pathname.startsWith("/annytrade/trade");

  return (
    <div
      data-annytrade
      data-at-theme={isTerminal ? "terminal" : "light"}
      data-at-desk={isTerminal ? "terminal" : "octa"}
      className="at-shell"
    >
      <DeskTopNav />
      {isTerminal ? <TradingTopMetrics /> : null}
      <div className="at-main">
        <div
          className={
            isTerminal ? "at-content at-content-terminal" : "at-content"
          }
        >
          {children}
        </div>
        <MobileNav />
      </div>
    </div>
  );
}
