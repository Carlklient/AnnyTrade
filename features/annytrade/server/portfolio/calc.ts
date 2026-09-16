import { add, mul, roundMoney, sub } from "../trading/money";

export type MarkedPosition = {
  symbol: string;
  quantity: number;
  averageEntry: number;
  costBasis: number;
  realizedPnl: number;
  markPrice: number | null;
  markFreshness?: string | null;
};

export type PortfolioTotals = {
  cash: number;
  reserved: number;
  availableCash: number;
  costBasis: number;
  marketValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  feesPaid: number;
  equity: number | null;
  marksComplete: boolean;
  unmarkedSymbols: string[];
  allocation: { symbol: string; marketValue: number; pct: number }[];
  exposure: {
    grossMarketValue: number;
    netExposurePct: number | null;
    bySymbol: { symbol: string; marketValue: number; weightPct: number }[];
  };
};

/**
 * Equity = cash + market value of open positions.
 * Cash already reflects purchase debits / sale credits / fees.
 * Unrealized = marketValue - costBasis for marked lots.
 * Never invents mark prices — unmarked lots are excluded from MV/unrealized
 * and marksComplete becomes false.
 */
export function computePortfolioTotals(input: {
  cash: number;
  reserved: number;
  positions: MarkedPosition[];
  feesPaid: number;
  realizedPnl: number;
}): PortfolioTotals {
  const unmarkedSymbols: string[] = [];
  let costBasis = 0;
  let marketValue = 0;
  let unrealizedPnl = 0;

  for (const p of input.positions) {
    if (p.quantity <= 0) continue;
    costBasis = add(costBasis, p.costBasis);
    if (p.markPrice == null || !Number.isFinite(p.markPrice)) {
      unmarkedSymbols.push(p.symbol);
      continue;
    }
    const mv = mul(p.quantity, p.markPrice);
    marketValue = add(marketValue, mv);
    unrealizedPnl = add(
      unrealizedPnl,
      mul(sub(p.markPrice, p.averageEntry), p.quantity),
    );
  }

  const marksComplete = unmarkedSymbols.length === 0;
  const totalPnl = add(input.realizedPnl, unrealizedPnl);
  const equity = marksComplete ? roundMoney(input.cash + marketValue) : null;

  const allocation =
    marketValue > 0
      ? input.positions
          .filter((p) => p.quantity > 0 && p.markPrice != null)
          .map((p) => {
            const mv = mul(p.quantity, p.markPrice!);
            return {
              symbol: p.symbol,
              marketValue: mv,
              pct: roundMoney((mv / marketValue) * 100),
            };
          })
          .sort((a, b) => b.marketValue - a.marketValue)
      : [];

  const netExposurePct =
    equity != null && equity !== 0
      ? roundMoney((marketValue / Math.abs(equity)) * 100)
      : null;

  return {
    cash: roundMoney(input.cash),
    reserved: roundMoney(input.reserved),
    availableCash: roundMoney(Math.max(0, input.cash - input.reserved)),
    costBasis: roundMoney(costBasis),
    marketValue: roundMoney(marketValue),
    unrealizedPnl: roundMoney(unrealizedPnl),
    realizedPnl: roundMoney(input.realizedPnl),
    totalPnl: roundMoney(totalPnl),
    feesPaid: roundMoney(input.feesPaid),
    equity,
    marksComplete,
    unmarkedSymbols,
    allocation,
    exposure: {
      grossMarketValue: roundMoney(marketValue),
      netExposurePct,
      bySymbol: allocation.map((a) => ({
        symbol: a.symbol,
        marketValue: a.marketValue,
        weightPct: a.pct,
      })),
    },
  };
}

export type EquityPoint = { asOf: string; equity: number };

export type DrawdownStats = {
  peakEquity: number | null;
  currentDrawdownPct: number | null;
  maxDrawdownPct: number | null;
  insufficientHistory: boolean;
};

export function computeDrawdown(series: EquityPoint[]): DrawdownStats {
  if (series.length < 2) {
    return {
      peakEquity: series[0]?.equity ?? null,
      currentDrawdownPct: null,
      maxDrawdownPct: null,
      insufficientHistory: true,
    };
  }
  let peak = series[0]!.equity;
  let maxDd = 0;
  for (const p of series) {
    if (p.equity > peak) peak = p.equity;
    if (peak > 0) {
      const dd = ((peak - p.equity) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    }
  }
  const last = series[series.length - 1]!.equity;
  const currentDd = peak > 0 ? ((peak - last) / peak) * 100 : 0;
  return {
    peakEquity: roundMoney(peak),
    currentDrawdownPct: roundMoney(currentDd),
    maxDrawdownPct: roundMoney(maxDd),
    insufficientHistory: false,
  };
}

export function computeGrowthPct(
  equity: number | null,
  initialBalance: number,
): number | null {
  if (equity == null || initialBalance <= 0) return null;
  return roundMoney(((equity - initialBalance) / initialBalance) * 100);
}

export function dailyPnlFromSnapshots(
  todayEquity: number | null,
  priorEquity: number | null,
): number | null {
  if (todayEquity == null || priorEquity == null) return null;
  return roundMoney(todayEquity - priorEquity);
}

export function bucketSeries(
  points: EquityPoint[],
  mode: "daily" | "weekly" | "monthly",
): { label: string; equity: number; pnl: number }[] {
  if (points.length === 0) return [];
  const buckets = new Map<string, EquityPoint>();
  for (const p of points) {
    const asOf = normalizeAsOf(p.asOf);
    if (!asOf) continue;
    const d = new Date(asOf + "T00:00:00Z");
    if (Number.isNaN(d.getTime())) continue;
    let key: string;
    if (mode === "daily") {
      key = asOf;
    } else if (mode === "weekly") {
      const day = d.getUTCDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() + mondayOffset);
      key = monday.toISOString().slice(0, 10);
    } else {
      key = asOf.slice(0, 7);
    }
    buckets.set(key, { asOf, equity: p.equity });
  }
  const keys = [...buckets.keys()].sort();
  const out: { label: string; equity: number; pnl: number }[] = [];
  let prev: number | null = null;
  for (const key of keys) {
    const eq = buckets.get(key)!.equity;
    out.push({
      label: key,
      equity: eq,
      pnl: prev == null ? 0 : roundMoney(eq - prev),
    });
    prev = eq;
  }
  return out;
}

/** Normalize DATE / Date / ISO strings to YYYY-MM-DD. */
export function normalizeAsOf(value: string | Date): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}
