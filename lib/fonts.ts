import { JetBrains_Mono, Plus_Jakarta_Sans, Syne } from "next/font/google";

/**
 * Brand fonts via next/font.
 * Face variables are mapped to semantic slots in styles/tokens.css.
 */

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-face",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-face",
  display: "swap",
});

const fontDisplay = Syne({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

export const fonts = {
  sans: fontSans,
  mono: fontMono,
  display: fontDisplay,
  heading: fontDisplay,
} as const;

/** Class string applying all font CSS variables on `<html>`. */
export const fontVariables = [
  fontSans.variable,
  fontMono.variable,
  fontDisplay.variable,
].join(" ");
