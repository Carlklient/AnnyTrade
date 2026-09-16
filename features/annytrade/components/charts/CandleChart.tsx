"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
  type MouseEvent,
} from "react";

import type { Candle } from "../../types";
import type { ChartIndicatorBundle } from "../../lib/indicators";
import type { ChartIndicatorFlags } from "../../lib/chart-prefs";
import {
  loadChartDrawings,
  newDrawingId,
  saveChartDrawings,
  type ChartDrawing,
  type ChartDrawTool,
} from "../../lib/chart-drawings";
import { cnAt, formatPrice } from "../../lib/format";

type CandleChartProps = {
  candles: Candle[];
  className?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  lastPrice?: number | null;
  indicators?: ChartIndicatorBundle | null;
  flags?: ChartIndicatorFlags;
  /** Used to persist drawings per symbol */
  symbol?: string;
};

const DEFAULT_FLAGS: ChartIndicatorFlags = {
  sma20: false,
  sma50: false,
  ema20: false,
  ema50: false,
  bb: false,
  rsi: false,
  macd: false,
  atr: false,
  volume: true,
};

export function CandleChart({
  candles,
  className,
  loading,
  error,
  empty,
  lastPrice,
  indicators,
  flags = DEFAULT_FLAGS,
  symbol,
}: CandleChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [viewStart, setViewStart] = useState(0);
  const dragRef = useRef<{ x: number; start: number } | null>(null);
  const [drawTool, setDrawTool] = useState<ChartDrawTool>("none");
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [trendDraft, setTrendDraft] = useState<{
    x0: number;
    price0: number;
  } | null>(null);

  useEffect(() => {
    if (!symbol) {
      setDrawings([]);
      return;
    }
    setDrawings(loadChartDrawings(symbol));
    setTrendDraft(null);
    setDrawTool("none");
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    saveChartDrawings(symbol, drawings);
  }, [symbol, drawings]);

  const maxWindow = Math.min(candles.length, 180);
  const windowSize = Math.min(maxWindow, Math.max(40, candles.length));
  const start = Math.max(
    0,
    Math.min(viewStart, Math.max(0, candles.length - windowSize)),
  );
  const visible = useMemo(
    () => candles.slice(start, start + windowSize),
    [candles, start, windowSize],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 8 : -8;
      setViewStart((s) =>
        Math.max(0, Math.min(candles.length - windowSize, s + delta)),
      );
    },
    [candles.length, windowSize],
  );

  if (loading) {
    return (
      <div
        className={cnAt(
          "flex h-[320px] items-center justify-center text-[0.8125rem] font-bold text-[#020617] sm:h-[380px] lg:h-[420px]",
          className,
        )}
      >
        Loading chart…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cnAt(
          "flex h-[320px] flex-col items-center justify-center gap-1 px-4 text-center text-[0.8125rem] sm:h-[380px] lg:h-[420px]",
          className,
        )}
      >
        <p className="font-semibold text-[var(--at-sell)]">Chart unavailable</p>
        <p className="font-bold text-[#020617]">{error}</p>
      </div>
    );
  }

  if (empty || candles.length === 0 || visible.length === 0) {
    return (
      <div
        className={cnAt(
          "flex h-[320px] items-center justify-center text-[0.8125rem] font-bold text-[#020617] sm:h-[380px] lg:h-[420px]",
          className,
        )}
      >
        No candle data for this range.
      </div>
    );
  }

  const showVol = flags.volume;
  const showRsi = flags.rsi && indicators;
  const showMacd = flags.macd && indicators;
  const paneCount =
    1 + (showVol ? 1 : 0) + (showRsi ? 1 : 0) + (showMacd ? 1 : 0);

  const width = 900;
  const height = 420;
  const pad = { top: 12, right: 56, bottom: 22, left: 8 };
  const priceH =
    height -
    pad.top -
    pad.bottom -
    (showVol ? 56 : 0) -
    (showRsi ? 52 : 0) -
    (showMacd ? 56 : 0);

  const idxOffset = start;
  const highs = visible.map((c) => c.high);
  const lows = visible.map((c) => c.low);
  let max = Math.max(...highs);
  let min = Math.min(...lows);
  if (indicators) {
    for (let i = 0; i < visible.length; i++) {
      const gi = idxOffset + i;
      if (flags.bb) {
        const u = indicators.bb[gi]?.upper;
        const l = indicators.bb[gi]?.lower;
        if (u != null) max = Math.max(max, u);
        if (l != null) min = Math.min(min, l);
      }
      for (const key of ["sma20", "sma50", "ema20", "ema50"] as const) {
        if (!flags[key]) continue;
        const v = indicators[key][gi]?.value;
        if (v != null) {
          max = Math.max(max, v);
          min = Math.min(min, v);
        }
      }
    }
  }
  const range = max - min || 1;
  const innerW = width - pad.left - pad.right;
  const candleW = Math.max(2.5, (innerW / visible.length) * 0.62);
  const yScale = (v: number) => pad.top + ((max - v) / range) * priceH;
  const xCenter = (i: number) =>
    pad.left + (i + 0.5) * (innerW / visible.length);
  const priceFromY = (y: number) => max - ((y - pad.top) / priceH) * range;
  const indexFromX = (x: number) =>
    Math.min(
      visible.length - 1,
      Math.max(0, Math.floor(((x - pad.left) / innerW) * visible.length)),
    );

  const hover = hoverIdx != null ? visible[hoverIdx] : null;
  const hoverGlobal = hoverIdx != null ? idxOffset + hoverIdx : null;
  const mark = lastPrice ?? visible[visible.length - 1]!.close;

  function linePath(
    series: { value: number | null }[] | undefined,
    globalStart: number,
  ): string {
    if (!series) return "";
    let d = "";
    let started = false;
    for (let i = 0; i < visible.length; i++) {
      const v = series[globalStart + i]?.value;
      if (v == null) {
        started = false;
        continue;
      }
      const x = xCenter(i);
      const y = yScale(v);
      d += started ? ` L ${x} ${y}` : `M ${x} ${y}`;
      started = true;
    }
    return d;
  }

  const volMax = Math.max(...visible.map((c) => c.volume || 0), 1);
  const volTop = pad.top + priceH + 8;
  let cursorY = volTop + (showVol ? 56 : 0);

  function handleChartClick(e: MouseEvent<SVGSVGElement>) {
    if (drawTool === "none") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const py = ((e.clientY - rect.top) / rect.height) * height;
    if (py < pad.top || py > pad.top + priceH) return;
    const localIdx = indexFromX(px);
    const globalIdx = idxOffset + localIdx;
    const price = Number(priceFromY(py).toFixed(6));

    if (drawTool === "hline") {
      setDrawings((prev) => [
        ...prev,
        { id: newDrawingId(), type: "hline", price },
      ]);
      setDrawTool("none");
      return;
    }

    if (drawTool === "trend") {
      if (!trendDraft) {
        setTrendDraft({ x0: globalIdx, price0: price });
        return;
      }
      setDrawings((prev) => [
        ...prev,
        {
          id: newDrawingId(),
          type: "trend",
          x0: trendDraft.x0,
          price0: trendDraft.price0,
          x1: globalIdx,
          price1: price,
        },
      ]);
      setTrendDraft(null);
      setDrawTool("none");
    }
  }

  return (
    <div
      className={cnAt("relative w-full overflow-hidden select-none", className)}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
        <span className="at-label mr-1">Draw</span>
        <button
          type="button"
          className="at-btn at-btn-ghost h-7 px-2 text-[0.65rem]"
          data-active={drawTool === "hline" ? "true" : "false"}
          style={
            drawTool === "hline"
              ? { background: "var(--at-accent-muted)", color: "var(--at-accent)" }
              : undefined
          }
          onClick={() => {
            setTrendDraft(null);
            setDrawTool((t) => (t === "hline" ? "none" : "hline"));
          }}
        >
          H-Line
        </button>
        <button
          type="button"
          className="at-btn at-btn-ghost h-7 px-2 text-[0.65rem]"
          style={
            drawTool === "trend"
              ? { background: "var(--at-accent-muted)", color: "var(--at-accent)" }
              : undefined
          }
          onClick={() => {
            setTrendDraft(null);
            setDrawTool((t) => (t === "trend" ? "none" : "trend"));
          }}
        >
          Trend
        </button>
        <button
          type="button"
          className="at-btn at-btn-ghost h-7 px-2 text-[0.65rem]"
          onClick={() => {
            setDrawings([]);
            setTrendDraft(null);
            setDrawTool("none");
          }}
          disabled={drawings.length === 0}
        >
          Clear
        </button>
        {drawTool !== "none" ? (
          <span className="text-[0.65rem] font-semibold text-[#0f172a]">
            {drawTool === "hline"
              ? "Click chart to place horizontal"
              : trendDraft
                ? "Click second point"
                : "Click first point"}
          </span>
        ) : null}
      </div>

      {hover ? (
        <div
          className="pointer-events-none absolute top-10 left-2 z-10 rounded-[6px] border px-2 py-1.5 text-[0.7rem]"
          style={{
            borderColor: "var(--at-border)",
            background: "var(--at-bg-elevated)",
          }}
          role="status"
        >
          <p className="at-mono font-bold text-[#020617]">
            {new Date(hover.time).toLocaleString()}
          </p>
          <p className="at-mono mt-0.5">
            O {formatPrice(hover.open)}, H {formatPrice(hover.high)}, L{" "}
            {formatPrice(hover.low)}, C {formatPrice(hover.close)}
          </p>
          {hover.volume > 0 ? (
            <p className="at-mono font-bold text-[#020617]">
              Vol {hover.volume.toLocaleString()}
            </p>
          ) : null}
          {hoverGlobal != null && indicators && flags.rsi ? (
            <p className="at-mono">
              RSI{" "}
              {indicators.rsi14[hoverGlobal]?.value != null
                ? indicators.rsi14[hoverGlobal]!.value!.toFixed(1)
                : "n/a"}
            </p>
          ) : null}
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[320px] w-full touch-pan-y sm:h-[380px] lg:h-[420px]"
        role="img"
        aria-label={`Candlestick chart with ${paneCount} panes. Use scroll to pan.`}
        style={{ cursor: drawTool === "none" ? undefined : "crosshair" }}
        onWheel={onWheel}
        onClick={handleChartClick}
        onPointerDown={(e) => {
          if (drawTool !== "none") return;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          dragRef.current = { x: e.clientX, start };
        }}
        onPointerMove={(e) => {
          const rect = (
            e.currentTarget as SVGSVGElement
          ).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * width;
          const i = Math.min(
            visible.length - 1,
            Math.max(
              0,
              Math.floor(((px - pad.left) / innerW) * visible.length),
            ),
          );
          setHoverIdx(i);
          if (dragRef.current && drawTool === "none") {
            const dx = e.clientX - dragRef.current.x;
            const shift = Math.round((-dx / rect.width) * visible.length);
            setViewStart(
              Math.max(
                0,
                Math.min(
                  candles.length - windowSize,
                  dragRef.current.start + shift,
                ),
              ),
            );
          }
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerLeave={() => {
          setHoverIdx(null);
          dragRef.current = null;
        }}
      >
        <defs>
          <linearGradient id="atChartFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--at-accent)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--at-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#atChartFade)"
        />

        {[0.25, 0.5, 0.75].map((t) => {
          const y = pad.top + priceH * t;
          return (
            <line
              key={t}
              x1={pad.left}
              x2={width - pad.right}
              y1={y}
              y2={y}
              stroke="var(--at-border)"
              strokeDasharray="3 6"
              opacity={0.7}
            />
          );
        })}

        {flags.bb && indicators
          ? (() => {
              const upper: string[] = [];
              const lower: string[] = [];
              for (let i = 0; i < visible.length; i++) {
                const u = indicators.bb[idxOffset + i]?.upper;
                const l = indicators.bb[idxOffset + i]?.lower;
                if (u != null) upper.push(`${xCenter(i)},${yScale(u)}`);
                if (l != null) lower.push(`${xCenter(i)},${yScale(l)}`);
              }
              if (upper.length < 2) return null;
              return (
                <polygon
                  points={[...upper, ...lower.reverse()].join(" ")}
                  fill="var(--at-accent)"
                  opacity={0.08}
                  aria-hidden
                />
              );
            })()
          : null}

        {flags.sma20 && indicators ? (
          <path
            d={linePath(indicators.sma20, idxOffset)}
            fill="none"
            stroke="var(--at-text-muted)"
            strokeWidth={1.2}
            strokeDasharray="4 3"
          />
        ) : null}
        {flags.sma50 && indicators ? (
          <path
            d={linePath(indicators.sma50, idxOffset)}
            fill="none"
            stroke="var(--at-text-secondary)"
            strokeWidth={1.2}
            strokeDasharray="2 4"
          />
        ) : null}
        {flags.ema20 && indicators ? (
          <path
            d={linePath(indicators.ema20, idxOffset)}
            fill="none"
            stroke="var(--at-accent)"
            strokeWidth={1.4}
          />
        ) : null}
        {flags.ema50 && indicators ? (
          <path
            d={linePath(indicators.ema50, idxOffset)}
            fill="none"
            stroke="#c4a574"
            strokeWidth={1.4}
          />
        ) : null}
        {flags.bb && indicators ? (
          <>
            <path
              d={linePath(
                indicators.bb.map((p) => ({ value: p.upper })),
                idxOffset,
              )}
              fill="none"
              stroke="var(--at-accent)"
              strokeWidth={1}
              opacity={0.5}
            />
            <path
              d={linePath(
                indicators.bb.map((p) => ({ value: p.lower })),
                idxOffset,
              )}
              fill="none"
              stroke="var(--at-accent)"
              strokeWidth={1}
              opacity={0.5}
            />
          </>
        ) : null}

        {visible.map((c, i) => {
          const x = xCenter(i) - candleW / 2;
          const up = c.close >= c.open;
          const color = up ? "var(--at-buy)" : "var(--at-sell)";
          const pattern = up ? undefined : "3 2";
          const yOpen = yScale(c.open);
          const yClose = yScale(c.close);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));
          return (
            <g key={`${c.time}-${i}`}>
              <line
                x1={x + candleW / 2}
                x2={x + candleW / 2}
                y1={yScale(c.high)}
                y2={yScale(c.low)}
                stroke={color}
                strokeWidth={1}
                strokeDasharray={pattern}
                opacity={0.9}
              />
              <rect
                x={x}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={up ? color : "transparent"}
                stroke={color}
                strokeWidth={up ? 0 : 1.2}
                rx={1}
                opacity={0.92}
              />
              {/* hatch for down candles, not color-only */}
              {!up ? (
                <line
                  x1={x}
                  x2={x + candleW}
                  y1={bodyTop + bodyH / 2}
                  y2={bodyTop + bodyH / 2}
                  stroke={color}
                  strokeWidth={1}
                  opacity={0.7}
                />
              ) : null}
            </g>
          );
        })}

        {/* current price marker */}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={yScale(mark)}
          y2={yScale(mark)}
          stroke="var(--at-accent)"
          strokeDasharray="6 4"
          strokeWidth={1.2}
        />
        <rect
          x={width - pad.right + 2}
          y={yScale(mark) - 8}
          width={52}
          height={16}
          rx={3}
          fill="var(--at-accent)"
        />
        <text
          x={width - pad.right + 28}
          y={yScale(mark) + 4}
          textAnchor="middle"
          fontSize="9"
          fill="var(--at-bg)"
          className="at-mono"
        >
          {formatPrice(mark)}
        </text>

        {showVol
          ? visible.map((c, i) => {
              const h = ((c.volume || 0) / volMax) * 44;
              const up = c.close >= c.open;
              return (
                <rect
                  key={`v-${i}`}
                  x={xCenter(i) - candleW / 2}
                  y={volTop + 44 - h}
                  width={candleW}
                  height={Math.max(0.5, h)}
                  fill={up ? "var(--at-buy)" : "var(--at-sell)"}
                  opacity={0.45}
                />
              );
            })
          : null}

        {showRsi && indicators
          ? (() => {
              const top = cursorY + 6;
              const h = 44;
              cursorY = top + h;
              const yR = (v: number) => top + ((100 - v) / 100) * h;
              let d = "";
              let started = false;
              for (let i = 0; i < visible.length; i++) {
                const v = indicators.rsi14[idxOffset + i]?.value;
                if (v == null) {
                  started = false;
                  continue;
                }
                const x = xCenter(i);
                const y = yR(v);
                d += started ? ` L ${x} ${y}` : `M ${x} ${y}`;
                started = true;
              }
              return (
                <g>
                  <text
                    x={pad.left}
                    y={top - 2}
                    fontSize="9"
                    fill="var(--at-text-muted)"
                  >
                    RSI(14)
                  </text>
                  <line
                    x1={pad.left}
                    x2={width - pad.right}
                    y1={yR(70)}
                    y2={yR(70)}
                    stroke="var(--at-border)"
                    strokeDasharray="2 3"
                  />
                  <line
                    x1={pad.left}
                    x2={width - pad.right}
                    y1={yR(30)}
                    y2={yR(30)}
                    stroke="var(--at-border)"
                    strokeDasharray="2 3"
                  />
                  <path d={d} fill="none" stroke="#7aa2c7" strokeWidth={1.3} />
                </g>
              );
            })()
          : null}

        {showMacd && indicators
          ? (() => {
              const top = cursorY + 6;
              const h = 48;
              const histVals = visible
                .map((_, i) => indicators.macd[idxOffset + i]?.histogram)
                .filter((v): v is number => v != null);
              const maxAbs = Math.max(...histVals.map(Math.abs), 1e-9);
              const y0 = top + h / 2;
              const yH = (v: number) => y0 - (v / maxAbs) * (h / 2);
              let macdD = "";
              let sigD = "";
              let mStart = false;
              let sStart = false;
              for (let i = 0; i < visible.length; i++) {
                const m = indicators.macd[idxOffset + i];
                if (m?.macd != null) {
                  const x = xCenter(i);
                  const y = yH(m.macd);
                  macdD += mStart ? ` L ${x} ${y}` : `M ${x} ${y}`;
                  mStart = true;
                } else mStart = false;
                if (m?.signal != null) {
                  const x = xCenter(i);
                  const y = yH(m.signal);
                  sigD += sStart ? ` L ${x} ${y}` : `M ${x} ${y}`;
                  sStart = true;
                } else sStart = false;
              }
              return (
                <g>
                  <text
                    x={pad.left}
                    y={top - 2}
                    fontSize="9"
                    fill="var(--at-text-muted)"
                  >
                    MACD
                  </text>
                  {visible.map((_, i) => {
                    const hVal = indicators.macd[idxOffset + i]?.histogram;
                    if (hVal == null) return null;
                    const y1 = y0;
                    const y2 = yH(hVal);
                    return (
                      <line
                        key={`mh-${i}`}
                        x1={xCenter(i)}
                        x2={xCenter(i)}
                        y1={y1}
                        y2={y2}
                        stroke={hVal >= 0 ? "var(--at-buy)" : "var(--at-sell)"}
                        strokeWidth={Math.max(1, candleW * 0.5)}
                        opacity={0.7}
                      />
                    );
                  })}
                  <path
                    d={macdD}
                    fill="none"
                    stroke="var(--at-accent)"
                    strokeWidth={1.2}
                  />
                  <path
                    d={sigD}
                    fill="none"
                    stroke="#c4a574"
                    strokeWidth={1.1}
                  />
                </g>
              );
            })()
          : null}

        {drawings.map((d) => {
          if (d.type === "hline") {
            const y = yScale(d.price);
            if (y < pad.top || y > pad.top + priceH) return null;
            return (
              <g key={d.id}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke="var(--at-accent)"
                  strokeWidth={1.25}
                  strokeDasharray="5 4"
                />
                <text
                  x={width - pad.right + 4}
                  y={y + 3}
                  fill="var(--at-accent)"
                  fontSize={9}
                  fontWeight={700}
                >
                  {formatPrice(d.price)}
                </text>
              </g>
            );
          }
          const lx0 = d.x0 - idxOffset;
          const lx1 = d.x1 - idxOffset;
          if (
            (lx0 < 0 && lx1 < 0) ||
            (lx0 >= visible.length && lx1 >= visible.length)
          ) {
            return null;
          }
          return (
            <line
              key={d.id}
              x1={xCenter(Math.min(visible.length - 1, Math.max(0, lx0)))}
              y1={yScale(d.price0)}
              x2={xCenter(Math.min(visible.length - 1, Math.max(0, lx1)))}
              y2={yScale(d.price1)}
              stroke="var(--at-accent)"
              strokeWidth={1.5}
            />
          );
        })}
        {trendDraft ? (
          <circle
            cx={xCenter(
              Math.min(
                visible.length - 1,
                Math.max(0, trendDraft.x0 - idxOffset),
              ),
            )}
            cy={yScale(trendDraft.price0)}
            r={3.5}
            fill="var(--at-accent)"
          />
        ) : null}

        {hoverIdx != null ? (
          <line
            x1={xCenter(hoverIdx)}
            x2={xCenter(hoverIdx)}
            y1={pad.top}
            y2={height - pad.bottom}
            stroke="var(--at-text-muted)"
            strokeWidth={1}
            opacity={0.5}
          />
        ) : null}
      </svg>
      <p className="px-3 pb-2 text-[0.65rem] font-bold text-[#020617]">
        Scroll or drag to pan · H-Line / Trend drawings save locally ·
        Educational overlays only
      </p>
    </div>
  );
}
