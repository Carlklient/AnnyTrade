import { ApiError } from "../http/errors";
import { recordAuditEvent } from "../repos/audit";
import { recordExecutionAudit } from "../repos/execution-audit";
import {
  ensureBrokerSandboxAccount,
  getBrokerConnectionForUser,
  getBrokerOrderByClientId,
  getBrokerOrderForUser,
  insertBrokerOrder,
  listBrokerOrdersForUser,
  listBrokerPositionCache,
  touchBrokerSync,
  tryClaimBrokerEvent,
  tryInsertBrokerExecution,
  updateBrokerOrderFromRemote,
  upsertBrokerConnection,
  upsertBrokerPositionCache,
} from "../repos/broker";
import {
  BrokerCredentialsRequiredError,
  envBrokerCredentials,
  getBrokerCredentialStatus,
  getBrokerProviderOrThrow,
  tryGetBrokerProvider,
} from "./factory";
import {
  assertBrokerOrdersAllowed,
  BrokerKillSwitchError,
  brokerOrdersEnabled,
} from "./kill-switch";
import {
  canEncryptBrokerSecrets,
  decryptSecret,
  encryptSecret,
  hintKeyId,
} from "../security/secret-box";
import { createOpaqueToken } from "../security/crypto";
import type { BrokerCredentials, BrokerOrderRequest } from "./types";
import { assertNotDuplicateRecent } from "../execution/duplicate-order";
import {
  assertOrderWithinRiskLimits,
  RiskLimitError,
} from "../execution/risk-limits";
import { emergencyKillSwitchActive } from "../execution/live-guard";
import { assertAccountTradingEnabled } from "../repos/trading-controls";
import { checkBrokerConnectivity } from "../execution/connectivity";
import { raiseOpsAlert } from "../execution/ops-alerts";
import { marketDataService } from "../market/service";
import { assertQuoteFresh, StalePriceError } from "../execution/stale-price";

function redactedAudit(meta: Record<string, unknown>) {
  const copy = { ...meta };
  delete copy.apiKeyId;
  delete copy.apiSecretKey;
  delete copy.apiKey;
  delete copy.secret;
  delete copy.ciphertext;
  return copy;
}

async function resolveCredentials(
  userId: string,
): Promise<{
  credentials: BrokerCredentials;
  connectionId: string;
  providerId: string;
}> {
  const status = getBrokerCredentialStatus();
  const providerId =
    status.activeProviderId ??
    (status.providerRequested === "test" ? "test" : "alpaca_paper");

  // Prefer encrypted user connection; fall back to env platform sandbox keys.
  const conn = await getBrokerConnectionForUser(userId, providerId);
  if (
    conn?.api_key_ciphertext &&
    conn.api_secret_ciphertext &&
    canEncryptBrokerSecrets()
  ) {
    try {
      return {
        credentials: {
          apiKeyId: decryptSecret(conn.api_key_ciphertext),
          apiSecretKey: decryptSecret(conn.api_secret_ciphertext),
        },
        connectionId: conn.id,
        providerId,
      };
    } catch {
      /* fall through to env */
    }
  }

  const envCreds = envBrokerCredentials();
  if (envCreds) {
    const tradingAccountId = await ensureBrokerSandboxAccount(userId);
    const row = await upsertBrokerConnection({
      userId,
      provider: providerId === "test" ? "test" : "alpaca_paper",
      status: "CONNECTED",
      tradingAccountId,
      keyIdHint: hintKeyId(envCreds.apiKeyId),
      lastError: null,
    });
    return {
      credentials: envCreds,
      connectionId: row.id,
      providerId: providerId === "test" ? "test" : "alpaca_paper",
    };
  }

  await upsertBrokerConnection({
    userId,
    provider: "alpaca_paper",
    status: "CREDENTIALS_REQUIRED",
    lastError: "Broker sandbox credentials required",
  });
  throw new BrokerCredentialsRequiredError();
}

export async function getBrokerStatus(userId: string) {
  const credStatus = getBrokerCredentialStatus();
  const provider = tryGetBrokerProvider();
  const conn =
    (await getBrokerConnectionForUser(userId, "alpaca_paper")) ??
    (await getBrokerConnectionForUser(userId, "test"));

  return {
    paperLabel: "AnnyTrade PAPER",
    brokerLabel: "Broker Paper / Sandbox",
    liveLabel: "Broker Live (DISABLED)",
    environments: {
      INTERNAL_PAPER: "AnnyTrade PAPER",
      BROKER_SANDBOX: "Broker Paper / Sandbox",
      BROKER_LIVE: "Broker Live, DISABLED",
    },
    liveMoney: false as const,
    environment: "SANDBOX" as const,
    executionEnvironment: "BROKER_SANDBOX" as const,
    brokerLiveEnabled: false as const,
    ordersEnabled: brokerOrdersEnabled(),
    killSwitchActive: !brokerOrdersEnabled(),
    emergencyKillSwitchActive: emergencyKillSwitchActive(),
    credentials: {
      required: credStatus.credentialRequired,
      hasApiKey: credStatus.hasApiKey,
      hasApiSecret: credStatus.hasApiSecret,
      hasEncryptionKey: credStatus.hasEncryptionKey,
      keyHint: conn?.key_id_hint ?? null,
    },
    connection: conn
      ? {
          id: conn.id,
          provider: conn.provider,
          status: conn.status,
          externalAccountId: conn.external_account_id,
          lastSyncedAt: conn.last_synced_at?.toISOString() ?? null,
          lastError: conn.last_error,
        }
      : null,
    provider: provider
      ? {
          id: provider.meta.providerId,
          label: provider.meta.providerLabel,
          limitations: provider.meta.limitations,
          supportedOrderTypes: provider.meta.supportedOrderTypes,
          supportedAssetsNote: provider.meta.supportedAssetsNote,
          officialDocsUrl: provider.meta.officialDocsUrl,
          supportsStreaming: provider.meta.supportsStreaming,
        }
      : null,
    message: credStatus.credentialRequired
      ? "BROKER SANDBOX CREDENTIALS REQUIRED"
      : conn?.status === "CONNECTED"
        ? "Broker Paper sandbox ready"
        : "Broker foundation ready",
    paperEnginePreserved: true as const,
    frontendAuthoritative: false as const,
  };
}

export async function connectBrokerSandbox(
  userId: string,
  input?: { apiKeyId?: string; apiSecretKey?: string },
) {
  const provider = tryGetBrokerProvider();
  if (!provider && !(input?.apiKeyId && input?.apiSecretKey)) {
    await upsertBrokerConnection({
      userId,
      provider: "alpaca_paper",
      status: "CREDENTIALS_REQUIRED",
      lastError: "No sandbox credentials provided",
    });
    await recordAuditEvent({
      userId,
      eventType: "broker.connect_failed",
      metadata: redactedAudit({ reason: "credentials_required" }),
    });
    throw new ApiError(
      503,
      "BROKER_CREDENTIALS_REQUIRED",
      "Broker sandbox credentials required",
    );
  }

  const active = provider ?? getBrokerProviderOrThrow();
  let credentials: BrokerCredentials;
  if (input?.apiKeyId && input?.apiSecretKey) {
    if (!canEncryptBrokerSecrets()) {
      throw new ApiError(
        503,
        "ENCRYPTION_KEY_REQUIRED",
        "ANNYTRADE_BROKER_ENCRYPTION_KEY required to store user broker credentials",
      );
    }
    credentials = {
      apiKeyId: input.apiKeyId,
      apiSecretKey: input.apiSecretKey,
    };
  } else {
    const envCreds = envBrokerCredentials();
    if (!envCreds) {
      throw new ApiError(
        503,
        "BROKER_CREDENTIALS_REQUIRED",
        "Broker sandbox credentials required",
      );
    }
    credentials = envCreds;
  }

  try {
    const account = await active.connect(credentials);
    if (account.liveMoney !== false || account.environment !== "SANDBOX") {
      throw new Error("Refusing non-sandbox broker account");
    }
    const tradingAccountId = await ensureBrokerSandboxAccount(userId);
    const row = await upsertBrokerConnection({
      userId,
      provider: active.meta.providerId === "test" ? "test" : "alpaca_paper",
      status: "CONNECTED",
      apiKeyCiphertext: input?.apiKeyId
        ? encryptSecret(credentials.apiKeyId)
        : null,
      apiSecretCiphertext: input?.apiSecretKey
        ? encryptSecret(credentials.apiSecretKey)
        : null,
      keyIdHint: hintKeyId(credentials.apiKeyId),
      externalAccountId: account.externalAccountId,
      tradingAccountId,
      lastError: null,
    });
    await touchBrokerSync(row.id, "CONNECTED", null);
    await recordAuditEvent({
      userId,
      eventType: "broker.connected",
      metadata: redactedAudit({
        provider: active.meta.providerId,
        environment: "SANDBOX",
        externalAccountId: account.externalAccountId,
      }),
    });
    return {
      connectionId: row.id,
      account,
      label: "Broker Paper / Sandbox",
      liveMoney: false as const,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 200) : "Connect failed";
    await upsertBrokerConnection({
      userId,
      provider: "alpaca_paper",
      status: "ERROR",
      lastError: message,
    });
    await recordAuditEvent({
      userId,
      eventType: "broker.connect_failed",
      metadata: redactedAudit({ reason: message }),
    });
    throw new ApiError(502, "BROKER_CONNECT_FAILED", message);
  }
}

export async function getBrokerAccountSnapshot(userId: string) {
  const { credentials, connectionId } = await resolveCredentials(userId);
  const provider = getBrokerProviderOrThrow();
  const account = await provider.getAccount(credentials);
  await touchBrokerSync(connectionId, "CONNECTED", null);
  return { account, connectionId, liveMoney: false as const };
}

export async function submitBrokerSandboxOrder(
  userId: string,
  input: Omit<BrokerOrderRequest, "clientOrderId"> & {
    clientOrderId?: string;
  },
) {
  try {
    assertBrokerOrdersAllowed();
  } catch (err) {
    if (err instanceof BrokerKillSwitchError) {
      throw new ApiError(403, "BROKER_KILL_SWITCH", err.message);
    }
    throw err;
  }

  const { credentials, connectionId } = await resolveCredentials(userId);
  const provider = getBrokerProviderOrThrow();
  const connRow = await getBrokerConnectionForUser(
    userId,
    provider.meta.providerId === "test" ? "test" : "alpaca_paper",
  );
  if (connRow?.trading_account_id) {
    await assertAccountTradingEnabled(connRow.trading_account_id);
  }

  const clientOrderId = input.clientOrderId ?? `at-${createOpaqueToken(12)}`;
  const symbol = input.symbol.toUpperCase();

  const connectivity = await checkBrokerConnectivity({
    provider,
    credentials,
    userId,
    connectionId,
  });
  if (!connectivity.ok) {
    throw new ApiError(
      503,
      "BROKER_CONNECTIVITY",
      connectivity.error ?? "Broker connectivity check failed",
    );
  }

  let estimatedNotional: number | null = null;
  try {
    const quote = await marketDataService.quote(symbol);
    assertQuoteFresh({ quoteTimestamp: quote.timestamp });
    const raw =
      input.limitPrice ??
      (quote.last != null ? Number(quote.last) : null) ??
      (quote.bid != null ? Number(quote.bid) : null) ??
      (quote.ask != null ? Number(quote.ask) : null);
    if (raw != null && Number.isFinite(raw)) {
      estimatedNotional = raw * input.quantity;
    }
  } catch (err) {
    if (err instanceof StalePriceError) {
      throw new ApiError(409, err.code, err.message);
    }
    throw new ApiError(
      503,
      "MARKET_DATA_UNAVAILABLE",
      err instanceof Error ? err.message : "Quote unavailable for risk checks",
    );
  }

  try {
    assertOrderWithinRiskLimits({
      quantity: input.quantity,
      estimatedNotionalUsd: estimatedNotional,
    });
    assertNotDuplicateRecent({
      accountId: connectionId,
      symbol,
      side: input.side,
      orderType: input.orderType,
      quantity: input.quantity,
      limitPrice: input.limitPrice ?? null,
      stopPrice: input.stopPrice ?? null,
    });
  } catch (err) {
    if (err instanceof RiskLimitError) {
      throw new ApiError(403, err.code, err.message);
    }
    if (err && typeof err === "object" && "code" in err) {
      const e = err as { code: string; message: string };
      if (e.code === "DUPLICATE_ORDER") {
        throw new ApiError(409, e.code, e.message);
      }
    }
    throw err;
  }

  await reconcileBrokerSandbox(userId).catch(async (err) => {
    await raiseOpsAlert({
      alertType: "reconciliation_mismatch",
      severity: "WARNING",
      message: `Pre-order reconcile failed: ${err instanceof Error ? err.message : "unknown"}`,
      userId,
      connectionId,
    });
  });

  // Idempotency: return existing local order if client id already used
  const existing = await getBrokerOrderByClientId(connectionId, clientOrderId);
  if (existing?.broker_order_id) {
    return { order: existing, replayed: true as const };
  }

  const local = await insertBrokerOrder({
    connectionId,
    userId,
    clientOrderId,
    symbol,
    side: input.side,
    orderType: input.orderType,
    quantity: input.quantity,
    limitPrice: input.limitPrice,
    stopPrice: input.stopPrice,
    timeInForce: input.timeInForce,
  });

  if (local.broker_order_id) {
    return { order: local, replayed: true as const };
  }

  try {
    const remote = await provider.submitOrder(credentials, {
      ...input,
      clientOrderId,
      symbol,
    });
    const updated = await updateBrokerOrderFromRemote({
      id: local.id,
      brokerOrderId: remote.brokerOrderId,
      status: remote.status,
      filledQuantity: remote.filledQuantity,
      averageFillPrice: remote.averageFillPrice,
      brokerRawStatus: remote.brokerRawStatus,
      rejectReason: remote.rejectReason,
    });
    await recordAuditEvent({
      userId,
      eventType: "broker.order.submitted",
      metadata: redactedAudit({
        clientOrderId,
        brokerOrderId: remote.brokerOrderId,
        symbol: remote.symbol,
        status: remote.status,
        sandbox: true,
        environment: "BROKER_SANDBOX",
      }),
    });
    await recordExecutionAudit({
      userId,
      eventType: "broker.order.submitted",
      environment: "BROKER_SANDBOX",
      metadata: {
        clientOrderId,
        brokerOrderId: remote.brokerOrderId,
        symbol: remote.symbol,
        status: remote.status,
      },
    });
    await reconcileBrokerSandbox(userId).catch(() => undefined);
    return { order: updated, replayed: false as const };
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 200) : "Submit failed";
    const updated = await updateBrokerOrderFromRemote({
      id: local.id,
      brokerOrderId: local.broker_order_id ?? `error-${local.id}`,
      status: "ERROR",
      filledQuantity: 0,
      averageFillPrice: null,
      brokerRawStatus: "error",
      rejectReason: message,
    });
    await recordAuditEvent({
      userId,
      eventType: "broker.order.rejected",
      metadata: redactedAudit({ clientOrderId, reason: message }),
    });
    await raiseOpsAlert({
      alertType: "repeated_rejection",
      severity: "WARNING",
      message: `Broker sandbox order rejected/error: ${message}`,
      userId,
      connectionId,
      metadata: { clientOrderId, symbol },
    });
    return { order: updated, replayed: false as const };
  }
}

export async function cancelBrokerSandboxOrder(
  userId: string,
  orderId: string,
) {
  try {
    assertBrokerOrdersAllowed();
  } catch (err) {
    if (err instanceof BrokerKillSwitchError) {
      throw new ApiError(403, "BROKER_KILL_SWITCH", err.message);
    }
    throw err;
  }

  const local = await getBrokerOrderForUser(userId, orderId);
  if (!local) throw new ApiError(404, "NOT_FOUND", "Broker order not found");
  if (!local.broker_order_id) {
    throw new ApiError(
      400,
      "VALIDATION",
      "Order not yet acknowledged by broker",
    );
  }

  const { credentials, connectionId } = await resolveCredentials(userId);
  const provider = getBrokerProviderOrThrow();
  const remote = await provider.cancelOrder(credentials, local.broker_order_id);
  const updated = await updateBrokerOrderFromRemote({
    id: local.id,
    brokerOrderId: remote.brokerOrderId,
    status: remote.status,
    filledQuantity: remote.filledQuantity,
    averageFillPrice: remote.averageFillPrice,
    brokerRawStatus: remote.brokerRawStatus,
    rejectReason: remote.rejectReason,
  });
  await recordAuditEvent({
    userId,
    eventType: "broker.order.cancelled",
    metadata: redactedAudit({
      orderId,
      brokerOrderId: remote.brokerOrderId,
      connectionId,
    }),
  });
  return updated;
}

export async function reconcileBrokerSandbox(userId: string) {
  const { credentials, connectionId } = await resolveCredentials(userId);
  const provider = getBrokerProviderOrThrow();

  const remoteOrders = await provider.listOrders(credentials, {
    status: "all",
    limit: 50,
  });
  const localOrders = await listBrokerOrdersForUser(userId, 100);
  const byBrokerId = new Map(
    localOrders
      .filter((o) => o.broker_order_id)
      .map((o) => [o.broker_order_id!, o]),
  );

  let updated = 0;
  for (const remote of remoteOrders) {
    const eventKey = `order:${remote.brokerOrderId}:${remote.brokerRawStatus}:${remote.filledQuantity}`;
    const claimed = await tryClaimBrokerEvent(connectionId, eventKey);
    if (!claimed) {
      await raiseOpsAlert({
        alertType: "duplicate_event",
        severity: "INFO",
        message: `Duplicate broker event suppressed: ${eventKey.slice(0, 120)}`,
        userId,
        connectionId,
      }).catch(() => undefined);
      continue; // duplicate stream/webhook event
    }

    const local = byBrokerId.get(remote.brokerOrderId);
    if (local) {
      await updateBrokerOrderFromRemote({
        id: local.id,
        brokerOrderId: remote.brokerOrderId,
        status: remote.status,
        filledQuantity: remote.filledQuantity,
        averageFillPrice: remote.averageFillPrice,
        brokerRawStatus: remote.brokerRawStatus,
        rejectReason: remote.rejectReason,
      });
      updated += 1;
    }
  }

  if (provider.listExecutions) {
    const fills = await provider.listExecutions(credentials, { limit: 50 });
    for (const fill of fills) {
      const local = byBrokerId.get(fill.brokerOrderId);
      if (!local) continue;
      await tryInsertBrokerExecution({
        brokerOrderId: local.id,
        connectionId,
        userId,
        externalExecutionId: fill.externalExecutionId,
        symbol: fill.symbol,
        side: fill.side,
        quantity: fill.quantity,
        price: fill.price,
        executedAt: new Date(fill.executedAt),
      });
    }
  }

  const positions = await provider.getPositions(credentials);
  for (const p of positions) {
    await upsertBrokerPositionCache({
      connectionId,
      userId,
      symbol: p.symbol,
      quantity: p.quantity,
      averageEntry: p.averageEntry,
      marketValue: p.marketValue,
      unrealizedPl: p.unrealizedPl,
    });
  }

  const account = await provider.getAccount(credentials);
  await touchBrokerSync(connectionId, "CONNECTED", null);

  // Stuck open orders (> 24h without fill progress) → ops alert
  const stuckCutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const o of localOrders) {
    if (
      (o.status === "SUBMITTED" ||
        o.status === "OPEN" ||
        o.status === "PENDING") &&
      o.created_at.getTime() < stuckCutoff
    ) {
      await raiseOpsAlert({
        alertType: "order_stuck",
        severity: "WARNING",
        message: `Broker order ${o.id} stuck in ${o.status}`,
        userId,
        connectionId,
        metadata: { orderId: o.id, status: o.status },
      }).catch(() => undefined);
    }
  }

  await recordAuditEvent({
    userId,
    eventType: "broker.reconcile",
    metadata: redactedAudit({
      updatedOrders: updated,
      positions: positions.length,
      sandbox: true,
      environment: "BROKER_SANDBOX",
    }),
  });
  await recordExecutionAudit({
    userId,
    eventType: "broker.reconcile",
    environment: "BROKER_SANDBOX",
    metadata: {
      updatedOrders: updated,
      positions: positions.length,
      cash: account.cash,
      equity: account.equity,
    },
  });

  const cachedPositions = await listBrokerPositionCache(connectionId);
  return {
    account,
    updatedOrders: updated,
    positions: cachedPositions.map((p) => ({
      symbol: p.symbol,
      quantity: Number(p.quantity),
      averageEntry: Number(p.average_entry),
      marketValue: p.market_value != null ? Number(p.market_value) : null,
      unrealizedPl: p.unrealized_pl != null ? Number(p.unrealized_pl) : null,
      syncedAt: p.synced_at.toISOString(),
    })),
    orders: await listBrokerOrdersForUser(userId, 50),
    liveMoney: false as const,
    frontendAuthoritative: false as const,
  };
}

export async function listBrokerSandboxOrders(userId: string) {
  return listBrokerOrdersForUser(userId, 50);
}
