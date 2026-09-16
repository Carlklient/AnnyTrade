import type { Metadata } from "next";

import { AuthView } from "@/features/annytrade/components/auth/AuthView";

export const metadata: Metadata = { title: "Create account" };

export default function AnnyTradeRegisterPage() {
  return <AuthView variant="register" />;
}
