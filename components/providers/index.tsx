"use client";

import * as React from "react";

import { HashScroll } from "@/components/providers/HashScroll";
import { ThemeProvider } from "@/components/providers/theme-provider";

type ProvidersProps = {
  children: React.ReactNode;
};

/**
 * Root client providers composition.
 * Add future providers (auth, analytics, query, etc.) here.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <HashScroll />
      {children}
    </ThemeProvider>
  );
}
