import { describe, expect, it } from "vitest";

import type { OhlcBar } from "../../lib/indicators";
import {
  analyzeSymbolCandles,
  decodeSignalId,
  encodeSignalId,
  scoreConfidence,
} from "./signal-engine";

function trendingBars(n: number, direction: "up" | "down"): OhlcBar[] {
  return Array.from({ length: n }, (_, i) => {
    const base = direction === "up" ? 100 + i * 0.8 : 200 - i * 0.8;
    return {
      time: new Date(
        Date.UTC(2024, 0, 1 + Math.floor(i / 24), i % 24),
      ).toISOString(),
      open: base,
      high: base + 1,
      low: base - 1,
      close: base + (direction === "up" ? 0.4 : -0.4),
      volume: 10_000 + i * 100,
    };
  });
}

describe("signal confidence methodology", () => {
  it("scores confirming factors deterministically", () => {
    expect(
      scoreConfidence({
        confirming: 4,
        conflicting: 0,
        bias: "Bullish",
        insufficientHistory: false,
      }),
    ).toBe(83); // 35+48
    expect(
      scoreConfidence({
        confirming: 2,
        conflicting: 1,
        bias: "Watch",
        insufficientHistory: false,
      }),
    ).toBe(45); // min(45, 35+24-10=49)
    expect(
      scoreConfidence({
        confirming: 0,
        conflicting: 0,
        bias: "Neutral",
        insufficientHistory: true,
      }),
    ).toBe(0);
  });
});

describe("signal id encode/decode", () => {
  it("round-trips", () => {
    const id = encodeSignalId({
      symbol: "AAPL",
      interval: "1h",
      barTime: "2024-01-01T00:00:00.000Z",
      bias: "Bullish",
    });
    expect(decodeSignalId(id)).toEqual({
      symbol: "AAPL",
      interval: "1h",
      barTime: "2024-01-01T00:00:00.000Z",
      bias: "Bullish",
    });
  });
});

describe("analyzeSymbolCandles", () => {
  it("returns Watch with insufficient history", () => {
    const s = analyzeSymbolCandles({
      symbol: "AAPL",
      interval: "1h",
      bars: trendingBars(20, "up"),
      dataFreshness: "DEMO",
      now: new Date("2024-06-01T00:00:00.000Z"),
    });
    expect(s).not.toBeNull();
    expect(s!.insufficientHistory).toBe(true);
    expect(s!.bias).toBe("Watch");
    expect(s!.reasons.some((r) => r.code === "INSUFFICIENT_HISTORY")).toBe(
      true,
    );
    expect(s!.disclosure.toLowerCase()).toContain("not financial advice");
    expect(s!.title.toLowerCase()).not.toContain("guaranteed");
  });

  it("produces Bullish bias on strong uptrend with reasons", () => {
    const s = analyzeSymbolCandles({
      symbol: "AAPL",
      interval: "1h",
      bars: trendingBars(80, "up"),
      dataFreshness: "DEMO",
      now: new Date("2024-06-01T00:00:00.000Z"),
    });
    expect(s).not.toBeNull();
    expect(s!.insufficientHistory).toBe(false);
    expect(["Bullish", "Watch"]).toContain(s!.bias);
    expect(s!.reasons.length).toBeGreaterThan(2);
    expect(s!.reasons.every((r) => r.detail.length > 0)).toBe(true);
    expect(s!.confidence).toBeGreaterThan(0);
    expect(s!.confidenceMethod.length).toBeGreaterThan(10);
  });

  it("marks Stale on STALE freshness", () => {
    const bars = trendingBars(80, "down");
    const lastTime = Date.parse(bars[bars.length - 1]!.time);
    const s = analyzeSymbolCandles({
      symbol: "MSFT",
      interval: "1d",
      bars,
      dataFreshness: "STALE",
      now: new Date(lastTime + 60_000),
    });
    expect(s!.status).toBe("Stale");
  });

  it("marks Expired when past expiresAt", () => {
    const bars = trendingBars(80, "up");
    const lastTime = Date.parse(bars[bars.length - 1]!.time);
    const s = analyzeSymbolCandles({
      symbol: "AAPL",
      interval: "1h",
      bars,
      dataFreshness: "DEMO",
      now: new Date(lastTime + 10 * 60 * 60_000),
    });
    expect(s!.status).toBe("Expired");
  });

  it("handles missing volume without inventing it", () => {
    const bars = trendingBars(80, "up").map((b) => ({ ...b, volume: 0 }));
    const s = analyzeSymbolCandles({
      symbol: "AAPL",
      interval: "1h",
      bars,
      dataFreshness: "DEMO",
      now: new Date("2024-06-01T00:00:00.000Z"),
    });
    expect(s!.reasons.some((r) => r.code === "VOLUME_UNAVAILABLE")).toBe(true);
    expect(s!.inputs.volume).toBeNull();
  });
});
