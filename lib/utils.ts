import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional support. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Absolute site URL for a path (uses configured app URL). */
export function absoluteUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://omotundeaanu.com";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${normalized === "/" ? "" : normalized}`;
}

/** Type-safe no-op for exhaustive switch checks. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
