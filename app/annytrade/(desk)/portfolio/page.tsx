import type { Metadata } from "next";

import { PortfolioView } from "@/features/annytrade/components/portfolio/PortfolioView";

export const metadata: Metadata = { title: "Portfolio" };

export default function AnnyTradePortfolioPage() {
  return <PortfolioView />;
}
