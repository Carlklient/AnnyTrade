import type { Metadata } from "next";

import { AuthView } from "@/features/annytrade/components/auth/AuthView";

export const metadata: Metadata = { title: "Forgot password" };

export default function AnnyTradeForgotPage() {
  return <AuthView variant="forgot" />;
}
