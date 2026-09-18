export type ChartDrawing =
  | { id: string; type: "hline"; price: number }
  | {
      id: string;
      type: "trend";
      x0: number;
      price0: number;
      x1: number;
      price1: number;
    }
  | {
      id: string;
      type: "fib";
      high: number;
      low: number;
    };

export type ChartDrawTool = "none" | "hline" | "trend" | "fib";

const PREFIX = "annytrade.chart.drawings.v1:";

export function loadChartDrawings(symbol: string): ChartDrawing[] {
  if (typeof window === "undefined" || !symbol) return [];
  try {
    const raw = localStorage.getItem(`${PREFIX}${symbol.toUpperCase()}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChartDrawing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChartDrawings(symbol: string, drawings: ChartDrawing[]) {
  if (typeof window === "undefined" || !symbol) return;
  try {
    localStorage.setItem(
      `${PREFIX}${symbol.toUpperCase()}`,
      JSON.stringify(drawings.slice(0, 40)),
    );
  } catch {
    // ignore quota
  }
}

export function newDrawingId() {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
