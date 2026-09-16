export type SpaceIdea = {
  id: string;
  kind: "idea" | "education" | "pattern";
  title: string;
  body: string;
  symbol?: string;
  /** Price level to draw as H-line when applied */
  level?: number;
  bias?: "bullish" | "bearish" | "neutral";
};

/** Curated Space feed content (Octa-style ideas rail for paper desk). */
export function spaceIdeasForSymbol(symbol: string): SpaceIdea[] {
  const sym = symbol.toUpperCase();
  return [
    {
      id: `${sym}-edu-risk`,
      kind: "education",
      title: "Risk on paper first",
      body: "Size small, write the thesis, then place the PAPER order. Live money stays hard blocked on AnnyTrade.",
      symbol: sym,
    },
    {
      id: `${sym}-idea-structure`,
      kind: "idea",
      title: `${sym} structure check`,
      body: "Mark a clear invalidation level on the chart, then decide. Use H-Line for support/resistance practice.",
      symbol: sym,
      bias: "neutral",
    },
    {
      id: `${sym}-pattern-trend`,
      kind: "pattern",
      title: "Trend discipline",
      body: "If price is making higher highs on your timeframe, practice buying dips — still PAPER only.",
      symbol: sym,
      bias: "bullish",
    },
    {
      id: `${sym}-idea-fade`,
      kind: "idea",
      title: "Avoid chasing spikes",
      body: "Wait for a pullback level instead of market-buying the top of a candle. Draw the level, then one-click PAPER.",
      symbol: sym,
      bias: "bearish",
    },
    {
      id: "edu-journal",
      kind: "education",
      title: "Journal every fill",
      body: "After each PAPER fill, note why you entered. Analytics and ledger history are your OctaVision-lite.",
    },
  ];
}
