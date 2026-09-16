import type { Metadata } from "next";

import { SignalDetailView } from "@/features/annytrade/components/signals/SignalDetailView";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Signal ${id}` };
}

export default async function AnnyTradeSignalDetailPage({ params }: Props) {
  const { id } = await params;
  return <SignalDetailView id={id} />;
}
