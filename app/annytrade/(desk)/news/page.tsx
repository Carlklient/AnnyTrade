import type { Metadata } from "next";

import { NewsView } from "@/features/annytrade/components/news/NewsView";

export const metadata: Metadata = { title: "Market news" };

export default function AnnyTradeNewsPage() {
  return <NewsView />;
}
