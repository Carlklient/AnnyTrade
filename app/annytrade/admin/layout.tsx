import type { ReactNode } from "react";

import { AdminShell } from "@/features/annytrade/components/admin/AdminShell";

export default function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
