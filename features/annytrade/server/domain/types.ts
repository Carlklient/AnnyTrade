export type UserStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";

export type DbUser = {
  id: string;
  email: string;
  email_normalized: string;
  password_hash: string;
  display_name: string;
  status: UserStatus;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
};

export type DbProfile = {
  user_id: string;
  display_name: string;
  timezone: string;
  preferred_currency: string;
  theme_preference: "dark" | "light" | "system";
  default_market: string;
  notify_orders: boolean;
  notify_signals: boolean;
  notify_security: boolean;
  notify_marketing: boolean;
  notify_price_alerts: boolean;
  notify_email_alerts: boolean;
  created_at: Date;
  updated_at: Date;
};

export type PublicProfile = {
  displayName: string;
  timezone: string;
  preferredCurrency: string;
  themePreference: "dark" | "light" | "system";
  defaultMarket: string;
  notifyOrders: boolean;
  notifySignals: boolean;
  notifySecurity: boolean;
  notifyMarketing: boolean;
  notifyPriceAlerts: boolean;
  notifyEmailAlerts: boolean;
};

export type DbTradingAccount = {
  id: string;
  user_id: string;
  account_type: "PAPER" | "BROKER_SANDBOX";
  base_currency: string;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  label: string;
  created_at: Date;
  updated_at: Date;
};

export type PublicAccount = {
  id: string;
  accountType: "PAPER" | "BROKER_SANDBOX";
  baseCurrency: string;
  status: string;
  label: string;
  ledgerBalance: number;
  createdAt: string;
};

export type DbWatchlist = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export type DbWatchlistItem = {
  id: string;
  watchlist_id: string;
  symbol: string;
  sort_order: number;
  created_at: Date;
};

export type PublicWatchlist = {
  id: string;
  name: string;
  sortOrder: number;
  symbols: string[];
};

export type DbNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read_at: Date | null;
  created_at: Date;
};

export type PublicNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    status: user.status,
    emailVerified: user.email_verified,
    createdAt: user.created_at.toISOString(),
  };
}

export function toPublicProfile(profile: DbProfile): PublicProfile {
  return {
    displayName: profile.display_name,
    timezone: profile.timezone,
    preferredCurrency: profile.preferred_currency,
    themePreference: profile.theme_preference,
    defaultMarket: profile.default_market,
    notifyOrders: profile.notify_orders,
    notifySignals: profile.notify_signals,
    notifySecurity: profile.notify_security,
    notifyMarketing: profile.notify_marketing,
    notifyPriceAlerts: profile.notify_price_alerts ?? true,
    notifyEmailAlerts: profile.notify_email_alerts ?? false,
  };
}

export function toPublicNotification(n: DbNotification): PublicNotification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: Boolean(n.read_at),
    createdAt: n.created_at.toISOString(),
  };
}

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
export type OrderStatus =
  "PENDING" | "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" | "REJECTED";

export type DbOrder = {
  id: string;
  account_id: string;
  user_id: string;
  symbol: string;
  side: OrderSide;
  order_type: OrderType;
  quantity: string;
  limit_price: string | null;
  stop_price: string | null;
  status: OrderStatus;
  filled_quantity: string;
  average_fill_price: string | null;
  submitted_at: Date;
  cancelled_at: Date | null;
  reject_reason: string | null;
  idempotency_key: string | null;
  activated_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type DbExecution = {
  id: string;
  order_id: string;
  account_id: string;
  user_id: string;
  symbol: string;
  side: OrderSide;
  quantity: string;
  price: string;
  fee: string;
  executed_at: Date;
  external_execution_id: string | null;
  created_at: Date;
};

export type DbPosition = {
  id: string;
  account_id: string;
  user_id: string;
  symbol: string;
  quantity: string;
  average_entry: string;
  cost_basis: string;
  realized_pnl: string;
  opened_at: Date;
  updated_at: Date;
  closed_at: Date | null;
};

export type PublicOrder = {
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  limitPrice: number | null;
  stopPrice: number | null;
  status: OrderStatus;
  filledQuantity: number;
  averageFillPrice: number | null;
  submittedAt: string;
  cancelledAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicExecution = {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  fee: number;
  executedAt: string;
};

export type PublicPosition = {
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  averageEntry: number;
  costBasis: number;
  realizedPnl: number;
  openedAt: string;
  updatedAt: string;
  closedAt: string | null;
  /** Mark-to-market fields (computed, not authoritative). */
  markPrice: number | null;
  unrealizedPnl: number | null;
  marketValue: number | null;
};

export function toPublicOrder(o: DbOrder): PublicOrder {
  return {
    id: o.id,
    accountId: o.account_id,
    symbol: o.symbol,
    side: o.side,
    orderType: o.order_type,
    quantity: Number(o.quantity),
    limitPrice: o.limit_price == null ? null : Number(o.limit_price),
    stopPrice: o.stop_price == null ? null : Number(o.stop_price),
    status: o.status,
    filledQuantity: Number(o.filled_quantity),
    averageFillPrice:
      o.average_fill_price == null ? null : Number(o.average_fill_price),
    submittedAt: o.submitted_at.toISOString(),
    cancelledAt: o.cancelled_at?.toISOString() ?? null,
    rejectReason: o.reject_reason,
    createdAt: o.created_at.toISOString(),
    updatedAt: o.updated_at.toISOString(),
  };
}

export function toPublicExecution(e: DbExecution): PublicExecution {
  return {
    id: e.id,
    orderId: e.order_id,
    symbol: e.symbol,
    side: e.side,
    quantity: Number(e.quantity),
    price: Number(e.price),
    fee: Number(e.fee),
    executedAt: e.executed_at.toISOString(),
  };
}

export function toPublicPosition(
  p: DbPosition,
  mark?: { markPrice: number | null },
): PublicPosition {
  const quantity = Number(p.quantity);
  const averageEntry = Number(p.average_entry);
  const markPrice = mark?.markPrice ?? null;
  const unrealizedPnl =
    markPrice != null && quantity > 0
      ? (markPrice - averageEntry) * quantity
      : null;
  return {
    id: p.id,
    accountId: p.account_id,
    symbol: p.symbol,
    quantity,
    averageEntry,
    costBasis: Number(p.cost_basis),
    realizedPnl: Number(p.realized_pnl),
    openedAt: p.opened_at.toISOString(),
    updatedAt: p.updated_at.toISOString(),
    closedAt: p.closed_at?.toISOString() ?? null,
    markPrice,
    unrealizedPnl,
    marketValue: markPrice != null ? markPrice * quantity : null,
  };
}
