import { getMarketDataProvider } from "./factory";
import { marketDataService } from "./service";
import { normalizeSymbol } from "./normalize";
import type { Quote } from "./types";

type Subscriber = {
  id: string;
  symbols: Set<string>;
  send: (event: string, data: unknown) => void;
};

/**
 * Process-local subscription manager.
 * Multiple UI clients share one poll loop per symbol set.
 * For multi-instance production, move fan-out to Redis pub/sub.
 */
class QuoteSubscriptionManager {
  private subscribers = new Map<string, Subscriber>();
  private latest = new Map<string, Quote>();
  private lastUpdate = new Map<string, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private connectionState: "idle" | "polling" | "error" = "idle";

  subscribe(
    id: string,
    symbols: string[],
    send: (event: string, data: unknown) => void,
  ) {
    const normalized = symbols
      .map(normalizeSymbol)
      .filter(Boolean)
      .slice(0, 25);
    this.subscribers.set(id, {
      id,
      symbols: new Set(normalized),
      send,
    });
    this.ensureLoop();
    // Push last-known immediately
    for (const sym of normalized) {
      const q = this.latest.get(sym);
      if (q) send("quote", q);
    }
    send("status", this.getStatus());
    return () => this.unsubscribe(id);
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id);
    if (this.subscribers.size === 0) this.stopLoop();
  }

  getStatus() {
    const provider = getMarketDataProvider();
    const staleMs = 30_000;
    const now = Date.now();
    const symbols = this.activeSymbols();
    const staleSymbols = symbols.filter((s) => {
      const t = this.lastUpdate.get(s);
      return !t || now - t > staleMs;
    });
    return {
      connectionState: this.connectionState,
      providerId: provider.meta.providerId,
      freshnessDefault: provider.meta.freshnessDefault,
      mode: provider.meta.mode,
      activeSymbols: symbols,
      staleSymbols,
      reconnectAttempt: this.reconnectAttempt,
      note: "SSE fan-out is process-local. Use Redis pub/sub before multi-instance production.",
    };
  }

  private activeSymbols() {
    const set = new Set<string>();
    for (const sub of this.subscribers.values()) {
      for (const s of sub.symbols) set.add(s);
    }
    return [...set];
  }

  private ensureLoop() {
    if (this.timer) return;
    this.connectionState = "polling";
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, 5_000);
  }

  private stopLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.connectionState = "idle";
    this.reconnectAttempt = 0;
  }

  private async tick() {
    const symbols = this.activeSymbols();
    if (symbols.length === 0) return;
    try {
      const quotes = await marketDataService.quotes(symbols);
      this.connectionState = "polling";
      this.reconnectAttempt = 0;
      const now = Date.now();
      for (const quote of quotes) {
        // Mark stale if provider already says so; else check age
        let freshness = quote.freshness;
        if (
          freshness === "LIVE" ||
          freshness === "DELAYED" ||
          freshness === "DEMO"
        ) {
          const ts = quote.timestamp ? Date.parse(quote.timestamp) : now;
          if (
            Number.isFinite(ts) &&
            now - ts > 60_000 &&
            freshness !== "DEMO"
          ) {
            freshness = "STALE";
          }
        }
        const next = { ...quote, freshness };
        this.latest.set(quote.symbol, next);
        this.lastUpdate.set(quote.symbol, now);
        this.broadcast(quote.symbol, next);
      }
      this.broadcastStatus();
    } catch {
      this.connectionState = "error";
      this.reconnectAttempt += 1;
      // Backoff by skipping ticks via delayed restart
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      const delay = Math.min(
        30_000,
        1000 * 2 ** Math.min(this.reconnectAttempt, 4),
      );
      setTimeout(() => {
        if (this.subscribers.size > 0) this.ensureLoop();
      }, delay);
      this.broadcastStatus();
    }
  }

  private broadcast(symbol: string, quote: Quote) {
    for (const sub of this.subscribers.values()) {
      if (sub.symbols.has(symbol)) sub.send("quote", quote);
    }
  }

  private broadcastStatus() {
    const status = this.getStatus();
    for (const sub of this.subscribers.values()) {
      sub.send("status", status);
    }
  }
}

export const quoteSubscriptionManager = new QuoteSubscriptionManager();
