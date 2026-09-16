import type { Metadata } from "next";

import { AuthView } from "@/features/annytrade/components/auth/AuthView";

export const metadata: Metadata = { title: "Verify email" };

export default function AnnyTradeVerifyPage() {
  return <AuthView variant="verify" />;
}
