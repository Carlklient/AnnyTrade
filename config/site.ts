export const siteConfig = {
  name: "AnnyTrade",
  shortName: "AnnyTrade",
  description:
    "Paper trading desk demo with markets, educational signals, charts, wallet, and analytics. Simulated data only.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://annytrade.vercel.app",
  ogImage: "/opengraph-image",
  locale: "en_US",
  creator: "Omotunde Aanu",
} as const;

export type SiteConfig = typeof siteConfig;
