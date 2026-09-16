import type { Metadata } from "next";

import { MarketsView } from "@/features/annytrade/components/markets/MarketsView";

export const metadata: Metadata = {
  title: "Markets",
};

export default function AnnyTradeMarketsPage() {
  return <MarketsView />;
}
