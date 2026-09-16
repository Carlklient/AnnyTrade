import { add, mul, roundMoney, sub } from "../trading/money";

export type ExecutionLike = {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  fee: number;
  executedAt: string;
};

export type CompletedTrade = {
  symbol: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  fees: number;
  openedAt: string;
  closedAt: string;
  durationHours: number;
};

type Lot = {
  qty: number;
  price: number;
  feePerUnit: number;
  openedAt: string;
};

/**
 * FIFO matching of BUY lots against SELL executions to form completed trades.
 * P&L = (exit - entry) * qty - allocated fees.
 * Long-only paper model (no short opens).
 */
export function matchFifoTrades(executions: ExecutionLike[]): CompletedTrade[] {
  const bySymbol = new Map<string, ExecutionLike[]>();
  for (const e of executions) {
    const list = bySymbol.get(e.symbol) ?? [];
    list.push(e);
    bySymbol.set(e.symbol, list);
  }

  const trades: CompletedTrade[] = [];

  for (const [symbol, list] of bySymbol) {
    const sorted = [...list].sort(
      (a, b) => Date.parse(a.executedAt) - Date.parse(b.executedAt),
    );
    const lots: Lot[] = [];

    for (const e of sorted) {
      if (e.side === "BUY") {
        const feePerUnit = e.quantity > 0 ? e.fee / e.quantity : 0;
        lots.push({
          qty: e.quantity,
          price: e.price,
          feePerUnit,
          openedAt: e.executedAt,
        });
        continue;
      }

      // SELL
      let remaining = e.quantity;
      const sellFeePerUnit = e.quantity > 0 ? e.fee / e.quantity : 0;
      while (remaining > 1e-10 && lots.length > 0) {
        const lot = lots[0]!;
        const matched = Math.min(lot.qty, remaining);
        const entryFee = mul(matched, lot.feePerUnit);
        const exitFee = mul(matched, sellFeePerUnit);
        const fees = add(entryFee, exitFee);
        const pnl = sub(mul(sub(e.price, lot.price), matched), fees);
        const openedAt = lot.openedAt;
        const closedAt = e.executedAt;
        const durationHours = roundMoney(
          Math.max(
            0,
            (Date.parse(closedAt) - Date.parse(openedAt)) / 3_600_000,
          ),
        );
        trades.push({
          symbol,
          quantity: roundMoney(matched),
          entryPrice: lot.price,
          exitPrice: e.price,
          pnl: roundMoney(pnl),
          fees: roundMoney(fees),
          openedAt,
          closedAt,
          durationHours,
        });
        lot.qty = roundMoney(lot.qty - matched);
        remaining = roundMoney(remaining - matched);
        if (lot.qty <= 1e-10) lots.shift();
      }
    }
  }

  return trades;
}

export type TradeStats = {
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number | null;
  lossRate: number | null;
  averageWin: number | null;
  averageLoss: number | null;
  profitFactor: number | null;
  largestWin: number | null;
  largestLoss: number | null;
  averageDurationHours: number | null;
  bestAsset: string | null;
  worstAsset: string | null;
  tradingVolume: number;
  longPct: number;
  shortPct: number;
  insufficientHistory: boolean;
};

export function computeTradeStats(trades: CompletedTrade[]): TradeStats {
  const volume = trades.reduce(
    (s, t) => add(s, mul(t.exitPrice, t.quantity)),
    0,
  );
  if (trades.length === 0) {
    return {
      tradeCount: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: null,
      lossRate: null,
      averageWin: null,
      averageLoss: null,
      profitFactor: null,
      largestWin: null,
      largestLoss: null,
      averageDurationHours: null,
      bestAsset: null,
      worstAsset: null,
      tradingVolume: 0,
      longPct: 100,
      shortPct: 0,
      insufficientHistory: true,
    };
  }

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const flats = trades.filter((t) => t.pnl === 0);
  const grossWin = wins.reduce((s, t) => add(s, t.pnl), 0);
  const grossLossAbs = losses.reduce((s, t) => add(s, Math.abs(t.pnl)), 0);

  const bySymbol = new Map<string, number>();
  for (const t of trades) {
    bySymbol.set(t.symbol, add(bySymbol.get(t.symbol) ?? 0, t.pnl));
  }
  let bestAsset: string | null = null;
  let worstAsset: string | null = null;
  let best = -Infinity;
  let worst = Infinity;
  for (const [sym, pnl] of bySymbol) {
    if (pnl > best) {
      best = pnl;
      bestAsset = sym;
    }
    if (pnl < worst) {
      worst = pnl;
      worstAsset = sym;
    }
  }

  const avgDuration =
    trades.reduce((s, t) => s + t.durationHours, 0) / trades.length;

  return {
    tradeCount: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakevenTrades: flats.length,
    winRate: roundMoney((wins.length / trades.length) * 100),
    lossRate: roundMoney((losses.length / trades.length) * 100),
    averageWin: wins.length ? roundMoney(grossWin / wins.length) : null,
    averageLoss: losses.length
      ? roundMoney(grossLossAbs / losses.length)
      : null,
    profitFactor:
      grossLossAbs > 0
        ? roundMoney(grossWin / grossLossAbs)
        : wins.length > 0
          ? null // undefined mathematically when no losses — UI should show n/a
          : null,
    largestWin: wins.length
      ? roundMoney(Math.max(...wins.map((t) => t.pnl)))
      : null,
    largestLoss: losses.length
      ? roundMoney(Math.min(...losses.map((t) => t.pnl)))
      : null,
    averageDurationHours: roundMoney(avgDuration),
    bestAsset,
    worstAsset,
    tradingVolume: roundMoney(volume),
    longPct: 100,
    shortPct: 0,
    insufficientHistory: false,
  };
}
