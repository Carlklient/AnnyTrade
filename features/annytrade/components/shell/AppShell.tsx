"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useAnnyTrade } from "../../context/AnnyTradeContext";
import { MobileNav } from "./MobileNav";
import { DeskTopNav } from "./DeskTopNav";
import { TradingTopMetrics } from "./TradingTopMetrics";
import "../../styles/desk.css";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme } = useAnnyTrade();
  const isTerminal = pathname.startsWith("/annytrade/trade");
  const deskTheme = isTerminal
    ? "terminal"
    : theme === "dark"
      ? "dark"
      : "light";

  return (
    <div
      data-annytrade
      data-at-theme={deskTheme}
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
