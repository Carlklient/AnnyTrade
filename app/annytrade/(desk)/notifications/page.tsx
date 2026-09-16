import type { Metadata } from "next";

import { NotificationsView } from "@/features/annytrade/components/account/NotificationsView";

export const metadata: Metadata = { title: "Notifications" };

export default function AnnyTradeNotificationsPage() {
  return <NotificationsView />;
}
