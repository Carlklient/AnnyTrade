import type { Metadata } from "next";
import { Suspense } from "react";

import { WalletView } from "@/features/annytrade/components/wallet/WalletView";

export const metadata: Metadata = { title: "Wallet" };

export default function AnnyTradeWalletPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-10 text-center text-sm font-bold">
          Loading wallet…
        </div>
      }
    >
      <WalletView />
    </Suspense>
  );
}
