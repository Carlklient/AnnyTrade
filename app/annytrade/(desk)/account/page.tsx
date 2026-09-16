import type { Metadata } from "next";

import { AccountView } from "@/features/annytrade/components/account/AccountView";

export const metadata: Metadata = { title: "Account" };

export default function AnnyTradeAccountPage() {
  return <AccountView />;
}
