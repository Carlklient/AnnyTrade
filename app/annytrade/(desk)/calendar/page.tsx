import type { Metadata } from "next";

import { CalendarView } from "@/features/annytrade/components/calendar/CalendarView";

export const metadata: Metadata = { title: "Economic calendar" };

export default function AnnyTradeCalendarPage() {
  return <CalendarView />;
}
