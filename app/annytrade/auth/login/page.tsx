import type { Metadata } from "next";

import { AuthView } from "@/features/annytrade/components/auth/AuthView";

export const metadata: Metadata = { title: "Sign in" };

export default function AnnyTradeLoginPage() {
  return <AuthView variant="login" />;
}
