import type { BrokerProvider } from "../provider";
import type {
  BrokerAccountInfo,
  BrokerCredentials,
  BrokerExecution,
  BrokerOrder,
  BrokerOrderRequest,
  BrokerOrderStatus,
  BrokerOrderSubscription,
  BrokerOrderType,
  BrokerOrderUpdateHandler,
  BrokerPosition,
} from "../types";
import { assertSandboxBaseUrl } from "../kill-switch";

const PAPER_BASE = "https://paper-api.alpaca.markets";
/** Official Alpaca Paper trade_updates stream — never live. */
const PAPER_STREAM = "wss://paper-api.alpaca.markets/stream";

type AlpacaAccount = {
  id: string;
  status: string;
  currency: string;
  cash: string;
  buying_power: string;
  equity: string;
  account_number?: string;
};

type AlpacaPosition = {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  market_value: string;
  unrealized_pl: string;
};

type AlpacaOrder = {
  id: string;
  client_order_id: string;
  symbol: string;
  side: string;
  type: string;
  qty: string;
  filled_qty: string;
  limit_price: string | null;
  stop_price: string | null;
  filled_avg_price: string | null;
  status: string;
  submitted_at: string | null;
  updated_at: string | null;
  rejected_reason?: string | null;
};

type AlpacaFill = {
  id: string;
  order_id: string;
  symbol: string;
  side: string;
  qty: string;
  price: string;
  timestamp: string;
};

async function alpacaFetch<T>(
  path: string,
  credentials: BrokerCredentials,
  init?: RequestInit,
): Promise<T> {
  assertSandboxBaseUrl(PAPER_BASE);
  const url = `${PAPER_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "APCA-API-KEY-ID": credentials.apiKeyId,
      "APCA-API-SECRET-KEY": credentials.apiSecretKey,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Never include secrets; truncate body
    const safe = body.slice(0, 200).replace(/secret|key|token/gi, "[redacted]");
    throw new Error(
      `Alpaca paper API ${res.status}: ${safe || res.statusText}`,
    );
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function mapOrderType(t: string): BrokerOrderType {
  const x = t.toLowerCase();
  if (x === "market") return "MARKET";
  if (x === "limit") return "LIMIT";
  if (x === "stop") return "STOP";
  if (x === "stop_limit") return "STOP_LIMIT";
  return "MARKET";
}

function mapStatus(s: string): BrokerOrderStatus {
  const x = s.toLowerCase();
  if (x === "new" || x === "accepted" || x === "pending_new")
    return "SUBMITTED";
  if (x === "partially_filled") return "PARTIALLY_FILLED";
  if (x === "filled") return "FILLED";
  if (x === "canceled" || x === "cancelled") return "CANCELLED";
  if (x === "expired") return "EXPIRED";
  if (x === "rejected" || x === "suspended") return "REJECTED";
  if (x === "pending_cancel" || x === "pending_replace") return "OPEN";
  return "OPEN";
}

function mapOrder(o: AlpacaOrder): BrokerOrder {
  return {
    brokerOrderId: o.id,
    clientOrderId: o.client_order_id,
    symbol: o.symbol.toUpperCase(),
    side: o.side.toUpperCase() === "SELL" ? "SELL" : "BUY",
    orderType: mapOrderType(o.type),
    quantity: Number(o.qty),
    filledQuantity: Number(o.filled_qty || 0),
    limitPrice: o.limit_price != null ? Number(o.limit_price) : null,
    stopPrice: o.stop_price != null ? Number(o.stop_price) : null,
    averageFillPrice:
      o.filled_avg_price != null ? Number(o.filled_avg_price) : null,
    status: mapStatus(o.status),
    brokerRawStatus: o.status,
    rejectReason: o.rejected_reason ?? null,
    submittedAt: o.submitted_at,
    updatedAt: o.updated_at,
  };
}

function toAlpacaType(t: BrokerOrderType): string {
  switch (t) {
    case "MARKET":
      return "market";
    case "LIMIT":
      return "limit";
    case "STOP":
      return "stop";
    case "STOP_LIMIT":
      return "stop_limit";
  }
}

export function createAlpacaPaperBrokerProvider(): BrokerProvider {
  return {
    meta: {
      providerId: "alpaca_paper",
      providerLabel: "Alpaca Paper (Sandbox)",
      environment: "SANDBOX",
      supportsStreaming: true,
      supportedOrderTypes: ["MARKET", "LIMIT", "STOP", "STOP_LIMIT"],
      supportedAssetsNote:
        "US equities/ETFs on Alpaca paper; crypto/options support depends on Alpaca paper account entitlements.",
      limitations: [
        "Paper only — live-api.alpaca.markets is forbidden",
        "Paper does not simulate dividends",
        "Fills when marketable per Alpaca paper rules",
        "Order stream uses paper trade_updates websocket; reconcile remains authoritative",
      ],
      officialDocsUrl: "https://docs.alpaca.markets/docs/paper-trading",
    },

    async connect(credentials) {
      return this.getAccount(credentials);
    },

    async getAccount(credentials) {
      const a = await alpacaFetch<AlpacaAccount>("/v2/account", credentials);
      const info: BrokerAccountInfo = {
        externalAccountId: a.id,
        status: a.status,
        currency: a.currency || "USD",
        cash: Number(a.cash),
        buyingPower: Number(a.buying_power),
        equity: Number(a.equity),
        liveMoney: false,
        environment: "SANDBOX",
        label: "Broker Paper, Alpaca Sandbox",
      };
      return info;
    },

    async getBuyingPower(credentials) {
      const a = await this.getAccount(credentials);
      return a.buyingPower;
    },

    async getPositions(credentials) {
      const rows = await alpacaFetch<AlpacaPosition[]>(
        "/v2/positions",
        credentials,
      );
      return (rows ?? []).map((p): BrokerPosition => ({
        symbol: p.symbol.toUpperCase(),
        quantity: Number(p.qty),
        averageEntry: Number(p.avg_entry_price),
        marketValue: Number(p.market_value),
        unrealizedPl: Number(p.unrealized_pl),
      }));
    },

    async submitOrder(credentials, order: BrokerOrderRequest) {
      const body: Record<string, unknown> = {
        symbol: order.symbol.toUpperCase(),
        qty: String(order.quantity),
        side: order.side.toLowerCase(),
        type: toAlpacaType(order.orderType),
        time_in_force: order.timeInForce ?? "day",
        client_order_id: order.clientOrderId,
      };
      if (order.limitPrice != null) body.limit_price = String(order.limitPrice);
      if (order.stopPrice != null) body.stop_price = String(order.stopPrice);
      const o = await alpacaFetch<AlpacaOrder>("/v2/orders", credentials, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return mapOrder(o);
    },

    async cancelOrder(credentials, brokerOrderId) {
      await alpacaFetch<void>(`/v2/orders/${brokerOrderId}`, credentials, {
        method: "DELETE",
      });
      // Fetch updated
      return this.getOrder(credentials, brokerOrderId);
    },

    async getOrder(credentials, brokerOrderId) {
      const o = await alpacaFetch<AlpacaOrder>(
        `/v2/orders/${brokerOrderId}`,
        credentials,
      );
      return mapOrder(o);
    },

    async listOrders(credentials, options) {
      const status =
        options?.status === "open"
          ? "open"
          : options?.status === "closed"
            ? "closed"
            : "all";
      const limit = Math.min(options?.limit ?? 50, 100);
      const rows = await alpacaFetch<AlpacaOrder[]>(
        `/v2/orders?status=${status}&limit=${limit}&direction=desc`,
        credentials,
      );
      return (rows ?? []).map(mapOrder);
    },

    async listExecutions(credentials, options) {
      // Alpaca: activities FILL
      const rows = await alpacaFetch<AlpacaFill[]>(
        `/v2/account/activities/FILL?page_size=${Math.min(options?.limit ?? 50, 100)}`,
        credentials,
      );
      let fills = (rows ?? []).map((f): BrokerExecution => ({
        externalExecutionId: f.id,
        brokerOrderId: f.order_id,
        symbol: f.symbol.toUpperCase(),
        side: f.side.toUpperCase() === "SELL" ? "SELL" : "BUY",
        quantity: Number(f.qty),
        price: Number(f.price),
        executedAt: f.timestamp,
      }));
      if (options?.orderId) {
        fills = fills.filter((f) => f.brokerOrderId === options.orderId);
      }
      return fills;
    },

    subscribeOrderUpdates(
      credentials: BrokerCredentials,
      onUpdate: BrokerOrderUpdateHandler,
    ): BrokerOrderSubscription {
      assertSandboxBaseUrl(PAPER_BASE);
      if (typeof WebSocket === "undefined") {
        return { unsubscribe: () => undefined };
      }
      let closed = false;
      const ws = new WebSocket(PAPER_STREAM);
      ws.addEventListener("open", () => {
        if (closed) return;
        ws.send(
          JSON.stringify({
            action: "authenticate",
            data: {
              key_id: credentials.apiKeyId,
              secret_key: credentials.apiSecretKey,
            },
          }),
        );
      });
      ws.addEventListener("message", (ev) => {
        if (closed) return;
        try {
          const msg = JSON.parse(String(ev.data)) as {
            stream?: string;
            data?: { order?: AlpacaOrder };
            action?: string;
          };
          if (msg.stream === "authorization" && msg.data) {
            const auth = msg.data as { status?: string };
            if (auth.status === "authorized") {
              ws.send(
                JSON.stringify({
                  action: "listen",
                  data: { streams: ["trade_updates"] },
                }),
              );
            }
            return;
          }
          if (msg.stream === "trade_updates" && msg.data?.order) {
            onUpdate(mapOrder(msg.data.order));
          }
        } catch {
          // Ignore malformed frames; never log payload (may contain account ids).
        }
      });
      return {
        unsubscribe: () => {
          closed = true;
          try {
            ws.close();
          } catch {
            /* ignore */
          }
        },
      };
    },
  };
}
