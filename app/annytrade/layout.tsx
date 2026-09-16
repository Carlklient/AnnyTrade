import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AnnyTradeProvider } from "@/features/annytrade/context/AnnyTradeContext";
import "@/features/annytrade/styles/annytrade.css";

export const metadata: Metadata = {
  title: {
    default: "AnnyTrade",
    template: "%s | AnnyTrade",
  },
  description:
    "Premium multi-market trading platform demo: analytics, advanced trading tools, signals, wallet, and portfolio insights. Simulated data only.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AnnyTradeLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <AnnyTradeProvider>{children}</AnnyTradeProvider>;
}
