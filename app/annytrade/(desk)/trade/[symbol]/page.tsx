import type { Metadata } from "next";

import { TradeView } from "@/features/annytrade/components/trade/TradeView";

type TradePageProps = {
  params: Promise<{ symbol: string }>;
};

export async function generateMetadata({
  params,
}: TradePageProps): Promise<Metadata> {
  const { symbol } = await params;
  return { title: `Trade ${symbol.toUpperCase()}` };
}

export default async function AnnyTradeTradePage({ params }: TradePageProps) {
  const { symbol } = await params;
  return <TradeView symbol={symbol} />;
}
