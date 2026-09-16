import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { fontVariables } from "@/lib/fonts";

import "./globals.css";

export const metadata = {
  title: {
    default: "AnnyTrade",
    template: "%s | AnnyTrade",
  },
  description:
    "Paper trading desk demo: markets, signals, charts, wallet, and analytics. Simulated data only. Broker Live disabled.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontVariables} h-full overflow-x-hidden scroll-smooth`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
