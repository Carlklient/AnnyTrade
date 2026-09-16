import { describe, expect, it } from "vitest";

import { atr } from "./atr";
import { bollinger } from "./bollinger";
import { ema, emaValues } from "./ema";
import { macd } from "./macd";
import { rsiValues } from "./rsi";
import { sma } from "./sma";
import type { OhlcBar } from "./types";

function barsFromCloses(closes: number[]): OhlcBar[] {
  return closes.map((close, i) => ({
    time: `t${i}`,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1000 + i,
  }));
}

describe("SMA", () => {
  it("matches known 3-period fixture", () => {
    const bars = barsFromCloses([1, 2, 3, 4, 5]);
    const s = sma(bars, 3);
    expect(s.map((p) => p.value)).toEqual([null, null, 2, 3, 4]);
  });
});

describe("EMA", () => {
  it("seeds with SMA then applies α", () => {
    const closes = [
      22, 22.15, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29, 22.15,
      22.39,
    ];
    const e = emaValues(closes, 10);
    const seed = closes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    expect(e[9]).toBeCloseTo(seed, 8);
    const alpha = 2 / 11;
    expect(e[10]).toBeCloseTo(alpha * 22.15 + (1 - alpha) * e[9]!, 8);
    expect(e[11]).toBeCloseTo(alpha * 22.39 + (1 - alpha) * e[10]!, 8);
  });

  it("returns nulls until period filled", () => {
    const bars = barsFromCloses([1, 2, 3]);
    expect(ema(bars, 5).every((p) => p.value == null)).toBe(true);
  });
});

describe("RSI", () => {
  it("Wilder RSI-14 known ascending then mixed fixture", () => {
    // 16 closes → first RSI at index 14 (after 14 changes)
    const closes = [
      44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89,
      46.03, 45.61, 46.28, 46.28, 46.0,
    ];
    const values = rsiValues(closes, 14);
    expect(values[13]).toBeNull();
    expect(values[14]).not.toBeNull();
    expect(values[14]!).toBeGreaterThan(50);
    expect(values[15]!).toBeLessThan(values[14]!);
  });

  it("RSI is 100 when only gains", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 10 + i);
    const values = rsiValues(closes, 14);
    expect(values[14]).toBe(100);
  });
});

describe("MACD", () => {
  it("histogram = macd - signal when both defined", () => {
    const bars = barsFromCloses(
      Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 5) * 5 + i * 0.1),
    );
    const m = macd(bars);
    const last = m[m.length - 1]!;
    expect(last.macd).not.toBeNull();
    expect(last.signal).not.toBeNull();
    expect(last.histogram).toBeCloseTo(last.macd! - last.signal!, 8);
  });
});

describe("Bollinger", () => {
  it("middle equals SMA and bands are ±2σ", () => {
    const bars = barsFromCloses([
      10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17, 19, 18, 20,
      19, 21,
    ]);
    const bb = bollinger(bars, 20, 2);
    const last = bb[19]!;
    expect(last.middle).toBe(15.5); // (10+...+21)/20 = 15.5
    expect(last.upper).toBeGreaterThan(last.middle!);
    expect(last.lower).toBeLessThan(last.middle!);
    expect(last.upper! - last.middle!).toBeCloseTo(
      last.middle! - last.lower!,
      8,
    );
  });
});

describe("ATR", () => {
  it("produces positive ATR after warmup", () => {
    const bars: OhlcBar[] = Array.from({ length: 30 }, (_, i) => ({
      time: `t${i}`,
      open: 100 + i * 0.2,
      high: 101 + i * 0.2,
      low: 99 + i * 0.2,
      close: 100.5 + i * 0.2,
      volume: 1000,
    }));
    const a = atr(bars, 14);
    expect(a[14]!.value).not.toBeNull();
    expect(a[14]!.value!).toBeGreaterThan(0);
    expect(a[29]!.value!).toBeGreaterThan(0);
  });
});
