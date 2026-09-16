import type { Metadata } from "next";

import { DashboardView } from "@/features/annytrade/components/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AnnyTradeDashboardPage() {
  return <DashboardView />;
}
