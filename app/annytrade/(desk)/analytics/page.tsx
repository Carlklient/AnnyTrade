import type { Metadata } from "next";

import { AnalyticsView } from "@/features/annytrade/components/analytics/AnalyticsView";

export const metadata: Metadata = { title: "Analytics" };

export default function AnnyTradeAnalyticsPage() {
  return <AnalyticsView />;
}
