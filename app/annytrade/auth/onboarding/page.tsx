import type { Metadata } from "next";

import { AuthView } from "@/features/annytrade/components/auth/AuthView";

export const metadata: Metadata = { title: "Onboarding" };

export default function AnnyTradeOnboardingPage() {
  return <AuthView variant="onboarding" />;
}
