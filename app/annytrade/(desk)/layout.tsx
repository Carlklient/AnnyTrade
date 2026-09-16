import type { ReactNode } from "react";

import { AppShell } from "@/features/annytrade/components/shell/AppShell";

export default function AnnyTradeDeskLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
