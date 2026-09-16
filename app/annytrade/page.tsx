import type { Metadata } from "next";

import { LandingPage } from "@/features/annytrade/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "AnnyTrade",
  description:
    "AnnyTrade: multi-market paper trading desk with charts, signals, and portfolio tools. Educational demo; Broker Live disabled.",
};

export default function AnnyTradeIndexPage() {
  return <LandingPage />;
}
