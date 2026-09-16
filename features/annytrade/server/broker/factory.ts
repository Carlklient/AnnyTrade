import type { BrokerProvider } from "./provider";
import { createAlpacaPaperBrokerProvider } from "./providers/alpaca-paper";
import { createTestBrokerProvider } from "./providers/test";
import type { BrokerCredentials } from "./types";

let cached: BrokerProvider | null = null;

export function resetBrokerProviderCache() {
  cached = null;
}

export type BrokerCredentialStatus = {
  providerRequested: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  hasEncryptionKey: boolean;
  ordersEnabled: boolean;
  activeProviderId: string | null;
  environment: "SANDBOX";
  credentialRequired: boolean;
  liveMoneyForbidden: true;
};

export function getBrokerCredentialStatus(): BrokerCredentialStatus {
  const requested = (
    process.env.ANNYTRADE_BROKER_PROVIDER ?? "alpaca_paper"
  ).toLowerCase();
  const hasApiKey = Boolean(process.env.ANNYTRADE_BROKER_API_KEY_ID);
  const hasApiSecret = Boolean(process.env.ANNYTRADE_BROKER_API_SECRET_KEY);
  const hasEncryptionKey = Boolean(
    process.env.ANNYTRADE_BROKER_ENCRYPTION_KEY ||
    process.env.ANNYTRADE_SECRET_ENCRYPTION_KEY,
  );
  const ordersEnabled = process.env.ANNYTRADE_BROKER_ORDERS_ENABLED === "true";
  const provider = tryGetBrokerProvider();
  return {
    providerRequested: requested,
    hasApiKey,
    hasApiSecret,
    hasEncryptionKey,
    ordersEnabled,
    activeProviderId: provider?.meta.providerId ?? null,
    environment: "SANDBOX",
    credentialRequired: !(hasApiKey && hasApiSecret) && requested !== "test",
    liveMoneyForbidden: true,
  };
}

export function tryGetBrokerProvider(): BrokerProvider | null {
  if (cached) return cached;
  const requested = (
    process.env.ANNYTRADE_BROKER_PROVIDER ?? "alpaca_paper"
  ).toLowerCase();

  if (requested === "test") {
    cached = createTestBrokerProvider();
    return cached;
  }

  if (
    requested === "alpaca_paper" ||
    requested === "alpaca" ||
    requested === "auto"
  ) {
    const key = process.env.ANNYTRADE_BROKER_API_KEY_ID;
    const secret = process.env.ANNYTRADE_BROKER_API_SECRET_KEY;
    if (!key || !secret) {
      return null;
    }
    cached = createAlpacaPaperBrokerProvider();
    return cached;
  }

  return null;
}

export function getBrokerProviderOrThrow(): BrokerProvider {
  const p = tryGetBrokerProvider();
  if (!p) {
    throw new BrokerCredentialsRequiredError();
  }
  return p;
}

export function envBrokerCredentials(): BrokerCredentials | null {
  const apiKeyId = process.env.ANNYTRADE_BROKER_API_KEY_ID;
  const apiSecretKey = process.env.ANNYTRADE_BROKER_API_SECRET_KEY;
  if (!apiKeyId || !apiSecretKey) return null;
  return { apiKeyId, apiSecretKey };
}

export class BrokerCredentialsRequiredError extends Error {
  readonly code = "BROKER_CREDENTIALS_REQUIRED";
  constructor() {
    super(
      "Broker sandbox credentials required (ANNYTRADE_BROKER_API_KEY_ID / ANNYTRADE_BROKER_API_SECRET_KEY)",
    );
    this.name = "BrokerCredentialsRequiredError";
  }
}
