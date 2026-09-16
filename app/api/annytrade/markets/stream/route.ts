import type { NextRequest } from "next/server";

import {
  clientKey,
  rateLimit,
} from "@/features/annytrade/server/security/rate-limit";
import { quoteSubscriptionManager } from "@/features/annytrade/server/market/subscriptions";
import { normalizeSymbol } from "@/features/annytrade/server/market/normalize";

/**
 * SSE fan-out for quotes.
 *
 * Why SSE (not browser WebSocket to vendor):
 * - Keeps provider API keys server-side
 * - Fits serverless/edge-friendly long-poll streaming via ReadableStream
 * - One upstream poll loop shared via QuoteSubscriptionManager
 *
 * Multi-instance: replace process-local manager with Redis pub/sub later.
 */
export async function GET(request: NextRequest) {
  const limited = rateLimit({
    key: clientKey(request, "markets-stream"),
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return new Response("Too many stream connections", { status: 429 });
  }

  const symbolsParam = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map(normalizeSymbol)
    .filter(Boolean)
    .slice(0, 25);

  if (symbols.length === 0) {
    return new Response("symbols required", { status: 400 });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const id = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          // closed
        }
      };

      cleanup = quoteSubscriptionManager.subscribe(id, symbols, send);
      send("connected", { symbols, transport: "sse" });

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // closed
        }
      }, 15_000);

      request.signal.addEventListener("abort", () => {
        if (heartbeat) clearInterval(heartbeat);
        cleanup?.();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
