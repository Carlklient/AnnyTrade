import { cn } from "@/lib/utils";

type ClassValue = string | false | null | undefined;

/**
 * Layout helpers — return class names composed from design utilities.
 * Not React components; safe for Server and Client Components.
 */

export function container(
  variant: "default" | "narrow" | "wide" | "prose" = "default",
  ...extra: ClassValue[]
) {
  const map = {
    default: "u-container",
    narrow: "u-container-narrow",
    wide: "u-container-wide",
    prose: "u-container-prose",
  } as const;

  return cn(map[variant], ...extra);
}

export function section(
  size: "sm" | "md" | "lg" = "md",
  ...extra: ClassValue[]
) {
  const map = {
    sm: "u-section-sm",
    md: "u-section",
    lg: "u-section-lg",
  } as const;

  return cn(map[size], ...extra);
}

export function screen(centered = false, ...extra: ClassValue[]) {
  return cn(centered ? "u-screen-center" : "u-screen", ...extra);
}

export function stack(
  gap: 4 | 8 | 16 | 24 | 32 | 48 = 16,
  ...extra: ClassValue[]
) {
  return cn(`u-stack-${gap}`, ...extra);
}

export function inline(gap: 8 | 16 | 24 = 16, ...extra: ClassValue[]) {
  return cn(`u-inline-${gap}`, ...extra);
}

export function center(
  axis: "both" | "x" | "y" = "both",
  ...extra: ClassValue[]
) {
  const map = {
    both: "u-center",
    x: "u-center-x",
    y: "u-center-y",
  } as const;

  return cn(map[axis], ...extra);
}

export function overflow(
  mode: "hidden" | "auto" | "x" | "y" | "truncate" = "hidden",
  ...extra: ClassValue[]
) {
  const map = {
    hidden: "u-overflow-hidden",
    auto: "u-overflow-auto",
    x: "u-overflow-x-auto",
    y: "u-overflow-y-auto",
    truncate: "u-truncate",
  } as const;

  return cn(map[mode], ...extra);
}

export const layout = {
  container,
  section,
  screen,
  stack,
  inline,
  center,
  overflow,
} as const;
