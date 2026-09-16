import type { Metadata } from "next";

import { AuthView } from "@/features/annytrade/components/auth/AuthView";

export const metadata: Metadata = { title: "Reset password" };

export default function AnnyTradeResetPage() {
  return <AuthView variant="reset" />;
}
