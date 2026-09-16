export function decimalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return String(n);
}

export function requireFiniteNumber(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid numeric field: ${field}`);
  }
  return n;
}

export function isValidOhlc(candle: {
  open: string;
  high: string;
  low: string;
  close: string;
}): boolean {
  const o = Number(candle.open);
  const h = Number(candle.high);
  const l = Number(candle.low);
  const c = Number(candle.close);
  if (![o, h, l, c].every(Number.isFinite)) return false;
  if (h < Math.max(o, c) || l > Math.min(o, c)) return false;
  return true;
}

export function toIsoTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "number") {
    // Finnhub uses seconds; Polygon often ms
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}
