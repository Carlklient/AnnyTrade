export function formatMoney(
  value: number,
  currency = "USD",
  opts?: { signed?: boolean; compact?: boolean },
): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: opts?.compact ? "compact" : "standard",
    maximumFractionDigits: abs < 2 ? 5 : abs < 100 ? 4 : 2,
  }).format(abs);

  if (opts?.signed) {
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
  }
  return value < 0 ? `-${formatted}` : formatted;
}

/** Missing / unavailable UI value (no dash glyphs). */
export const EMPTY = "n/a";

/** Strip em/en dashes, middots, and decorative hyphens from user-facing copy. */
export function cleanCopy(text: string): string {
  return text
    .replace(/\u2014/g, ", ")
    .replace(/\u2013/g, ", ")
    .replace(/\u2212/g, "")
    .replace(/\u00b7/g, ",")
    .replace(/\s+-\s+/g, ", ")
    .replace(/([A-Za-z])-([A-Za-z])/g, "$1 $2")
    .replace(/(\d)-([A-Za-z])/g, "$1 $2")
    .replace(/\(\s*-(\d)/g, "($1")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatPct(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatPrice(value: number): string {
  if (value >= 1000)
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (value >= 1)
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 5,
    });
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function formatCompactTime(
  iso: string,
  opts?: { seconds?: boolean },
): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(opts?.seconds ? { second: "2-digit" as const } : {}),
  }).format(new Date(iso));
}

export function formatLiveAge(iso: string, nowMs = Date.now()): string {
  const sec = Math.max(0, Math.floor((nowMs - Date.parse(iso)) / 1000));
  if (!Number.isFinite(sec) || sec < 2) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return formatCompactTime(iso, { seconds: true });
}

export function cnAt(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

export function pnlClass(value: number): string {
  if (value > 0) return "at-up";
  if (value < 0) return "at-down";
  return "";
}
