/** Decimal helpers for paper trading math (display/calc at 8 dp). */

const SCALE = 8;

export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) throw new Error("Invalid money value");
  const f = 10 ** SCALE;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function parseDecimal(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function requirePositive(n: number, label: string): number {
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid ${label}`);
  }
  return roundMoney(n);
}

export function mul(a: number, b: number): number {
  return roundMoney(a * b);
}

export function add(a: number, b: number): number {
  return roundMoney(a + b);
}

export function sub(a: number, b: number): number {
  return roundMoney(a - b);
}

export function nearlyEqual(a: number, b: number, eps = 1e-8): boolean {
  return Math.abs(a - b) <= eps;
}
