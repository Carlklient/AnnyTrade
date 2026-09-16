"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { THEME } from "@/constants";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={THEME.defaultTheme}
      enableSystem
      disableTransitionOnChange
      storageKey={THEME.storageKey}
      themes={[...THEME.colorSchemes]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
