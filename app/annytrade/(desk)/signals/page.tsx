import type { Metadata } from "next";

import { SignalsView } from "@/features/annytrade/components/signals/SignalsView";

export const metadata: Metadata = {
  title: "Signals",
};

export default function AnnyTradeSignalsPage() {
  return <SignalsView />;
}
