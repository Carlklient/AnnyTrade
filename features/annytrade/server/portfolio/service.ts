import { ApiError } from "../http/errors";
import { marketDataService } from "../market/service";
import { referenceLast } from "../trading/pricing";
import { roundMoney } from "../trading/money";
import { getAvailableCash, listAccountsForUser } from "../repos/accounts";
import {
  listClosedPositionsForUser,
  listOpenPositionsForUser,
} from "../repos/positions";
import { listExecutionsForAccount } from "../repos/executions";
import { getInitialBalance, sumFeesPaid } from "../repos/ledger";
import {
  getEquitySnapshotOnOrBefore,
  listEquitySnapshots,
  upsertEquitySnapshot,
} from "../repos/equity-snapshots";
import { toPublicPosition } from "../domain/types";
import {
  bucketSeries,
  computeDrawdown,
  computeGrowthPct,
  computePortfolioTotals,
  dailyPnlFromSnapshots,
  normalizeAsOf,
  type MarkedPosition,
} from "./calc";
import { computeTradeStats, matchFifoTrades } from "./trades";

function utcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function yesterdayUtc(today = utcDateString()): string {
  const d = new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type PortfolioAnalytics = {
  paper: true;
  accountId: string;
  currency: string;
  asOf: string;
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
  dailyPnl: number | null;
  accountGrowthPct: number | null;
  marksComplete: boolean;
  unmarkedSymbols: string[];
  staleMarks: string[];
  allocation: { symbol: string; marketValue: number; pct: number }[];
  exposure: {
    grossMarketValue: number;
    netExposurePct: number | null;
    bySymbol: { symbol: string; marketValue: number; weightPct: number }[];
  };
  drawdown: {
    peakEquity: number | null;
    currentDrawdownPct: number | null;
    maxDrawdownPct: number | null;
    insufficientHistory: boolean;
  };
  tradeStats: ReturnType<typeof computeTradeStats>;
  bySymbolPnl: { symbol: string; pnl: number }[];
  equityHistory: { asOf: string; equity: number }[];
  series: {
    daily: { label: string; equity: number; pnl: number }[];
    weekly: { label: string; equity: number; pnl: number }[];
    monthly: { label: string; equity: number; pnl: number }[];
  };
  positions: ReturnType<typeof toPublicPosition>[];
  methodology: {
    equity: string;
    fillPrices: string;
    returns: string;
    drawdown: string;
    tradeMatching: string;
  };
};

async function resolveAccount(userId: string, accountId?: string) {
  const accounts = await listAccountsForUser(userId);
  const account =
    (accountId ? accounts.find((a) => a.id === accountId) : accounts[0]) ??
    null;
  if (!account || account.user_id !== userId) {
    throw new ApiError(404, "NOT_FOUND", "Paper account not found");
  }
  return account;
}

export async function buildMarkedPositions(
  userId: string,
  accountId: string,
): Promise<{
  marked: MarkedPosition[];
  publicPositions: ReturnType<typeof toPublicPosition>[];
  staleMarks: string[];
}> {
  const open = await listOpenPositionsForUser(userId, accountId);
  const symbols = open.map((p) => p.symbol);
  let quotes: Awaited<ReturnType<typeof marketDataService.quotes>> = [];
  try {
    if (symbols.length > 0) {
      quotes = await marketDataService.quotes(symbols);
    }
  } catch {
    quotes = [];
  }
  const qmap = new Map(quotes.map((q) => [q.symbol, q]));
  const staleMarks: string[] = [];
  const marked: MarkedPosition[] = [];
  const publicPositions: ReturnType<typeof toPublicPosition>[] = [];

  for (const p of open) {
    const q = qmap.get(p.symbol);
    const mark = q ? referenceLast(q) : null;
    if (q && (q.freshness === "STALE" || q.freshness === "UNAVAILABLE")) {
      staleMarks.push(p.symbol);
    }
    // Do not use DEMO marks when claiming LIVE — but DEMO is valid for PAPER calc
    // when provider is demo; still never invent prices when quote missing.
    marked.push({
      symbol: p.symbol,
      quantity: Number(p.quantity),
      averageEntry: Number(p.average_entry),
      costBasis: Number(p.cost_basis),
      realizedPnl: Number(p.realized_pnl),
      markPrice: mark,
      markFreshness: q?.freshness ?? null,
    });
    publicPositions.push(toPublicPosition(p, { markPrice: mark }));
  }

  return { marked, publicPositions, staleMarks };
}

export async function computePaperPortfolio(
  userId: string,
  options?: {
    accountId?: string;
    from?: string;
    to?: string;
    recordSnapshot?: boolean;
  },
): Promise<PortfolioAnalytics> {
  const account = await resolveAccount(userId, options?.accountId);
  const cash = await getAvailableCash(account.id);
  const feesPaid = await sumFeesPaid(account.id);
  const initial = await getInitialBalance(account.id);
  const { marked, publicPositions, staleMarks } = await buildMarkedPositions(
    userId,
    account.id,
  );

  const closed = await listClosedPositionsForUser(userId, account.id, 200);
  const realizedFromOpen = marked.reduce((s, p) => s + p.realizedPnl, 0);
  const realizedFromClosed = closed.reduce(
    (s, p) => s + Number(p.realized_pnl),
    0,
  );
  // Open rows retain cumulative realized from partial sells; closed rows are fully closed.
  // Avoid double-count: open positions keep their realized; closed positions are separate rows.
  const realizedPnl = roundMoney(realizedFromOpen + realizedFromClosed);

  const totals = computePortfolioTotals({
    cash: cash.balance,
    reserved: cash.reserved,
    positions: marked,
    feesPaid,
    realizedPnl,
  });

  const asOf = options?.to ?? utcDateString();
  if (options?.recordSnapshot !== false && totals.equity != null) {
    await upsertEquitySnapshot({
      accountId: account.id,
      userId,
      asOf,
      cashBalance: totals.cash,
      marketValue: totals.marketValue,
      costBasis: totals.costBasis,
      unrealizedPnl: totals.unrealizedPnl,
      realizedPnl: totals.realizedPnl,
      feesPaid: totals.feesPaid,
      equity: totals.equity,
      currency: account.base_currency,
      marksComplete: totals.marksComplete && staleMarks.length === 0,
    });
  }

  const snapshots = await listEquitySnapshots(account.id, {
    from: options?.from,
    to: options?.to ?? asOf,
    limit: 730,
  });
  const equityHistory = snapshots
    .map((s) => {
      const asOf = normalizeAsOf(s.as_of as string | Date);
      if (!asOf) return null;
      return { asOf, equity: Number(s.equity) };
    })
    .filter((p): p is { asOf: string; equity: number } => p != null);
  // Ensure today's point present when equity known
  if (totals.equity != null && !equityHistory.some((p) => p.asOf === asOf)) {
    equityHistory.push({ asOf, equity: totals.equity });
  }

  const prior = await getEquitySnapshotOnOrBefore(
    account.id,
    yesterdayUtc(asOf),
  );
  const dailyPnl = dailyPnlFromSnapshots(
    totals.equity,
    prior ? Number(prior.equity) : null,
  );

  const executions = await listExecutionsForAccount(account.id, {
    from: options?.from ? new Date(options.from) : undefined,
    to: options?.to ? new Date(options.to + "T23:59:59.999Z") : undefined,
    limit: 2000,
  });
  const trades = matchFifoTrades(
    executions.map((e) => ({
      symbol: e.symbol,
      side: e.side,
      quantity: Number(e.quantity),
      price: Number(e.price),
      fee: Number(e.fee),
      executedAt: e.executed_at.toISOString(),
    })),
  );
  const tradeStats = computeTradeStats(trades);
  const drawdown = computeDrawdown(equityHistory);

  const pnlBySymbolMap = new Map<string, number>();
  for (const t of trades) {
    pnlBySymbolMap.set(
      t.symbol,
      roundMoney((pnlBySymbolMap.get(t.symbol) ?? 0) + t.pnl),
    );
  }
  const bySymbolPnl = [...pnlBySymbolMap.entries()]
    .map(([symbol, pnl]) => ({ symbol, pnl }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));

  return {
    paper: true,
    accountId: account.id,
    currency: account.base_currency,
    asOf,
    cash: totals.cash,
    reserved: totals.reserved,
    availableCash: totals.availableCash,
    costBasis: totals.costBasis,
    marketValue: totals.marketValue,
    unrealizedPnl: totals.unrealizedPnl,
    realizedPnl: totals.realizedPnl,
    totalPnl: totals.totalPnl,
    feesPaid: totals.feesPaid,
    equity: totals.equity,
    dailyPnl,
    accountGrowthPct: computeGrowthPct(totals.equity, initial),
    marksComplete: totals.marksComplete,
    unmarkedSymbols: totals.unmarkedSymbols,
    staleMarks,
    allocation: totals.allocation,
    exposure: totals.exposure,
    drawdown,
    tradeStats,
    bySymbolPnl,
    equityHistory,
    series: {
      daily: bucketSeries(equityHistory, "daily"),
      weekly: bucketSeries(equityHistory, "weekly"),
      monthly: bucketSeries(equityHistory, "monthly"),
    },
    positions: publicPositions,
    methodology: {
      equity: "equity = ledger cash + marked open position market value",
      fillPrices:
        "Phase 3 policy: BUY ask / SELL bid (else last); never client prices",
      returns:
        "accountGrowthPct = (equity - INITIAL_BALANCE) / INITIAL_BALANCE; dailyPnl = equity_today - equity_prior_snapshot",
      drawdown:
        "maxDrawdown from equity_snapshots peak-to-trough; insufficient when < 2 points",
      tradeMatching:
        "FIFO buy-lot matching against sells; P&L includes allocated fees; long-only",
    },
  };
}

/** Record snapshot after trading activity when marks are complete. */
export async function recordPaperEquitySnapshot(
  userId: string,
  accountId: string,
): Promise<void> {
  await computePaperPortfolio(userId, {
    accountId,
    recordSnapshot: true,
  });
}
