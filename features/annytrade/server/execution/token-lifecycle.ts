/**
 * Secure broker token / credential lifecycle (Phase 8).
 * Secrets stay server-side; rotation metadata only is exposed.
 */

import {
  encryptSecret,
  decryptSecret,
  hintKeyId,
} from "../security/secret-box";
import type { BrokerCredentials } from "../broker/types";

export type BrokerTokenRecord = {
  apiKeyCiphertext: string;
  apiSecretCiphertext: string;
  keyIdHint: string;
  rotatedAt: string;
  expiresAt: string | null;
};

export function sealBrokerCredentials(
  credentials: BrokerCredentials,
  options?: { expiresAt?: Date | null },
): BrokerTokenRecord {
  return {
    apiKeyCiphertext: encryptSecret(credentials.apiKeyId),
    apiSecretCiphertext: encryptSecret(credentials.apiSecretKey),
    keyIdHint: hintKeyId(credentials.apiKeyId),
    rotatedAt: new Date().toISOString(),
    expiresAt: options?.expiresAt?.toISOString() ?? null,
  };
}

export function openBrokerCredentials(record: {
  apiKeyCiphertext: string;
  apiSecretCiphertext: string;
}): BrokerCredentials {
  return {
    apiKeyId: decryptSecret(record.apiKeyCiphertext),
    apiSecretKey: decryptSecret(record.apiSecretCiphertext),
  };
}

export function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) && Date.now() > t;
}

/** Public status — never returns ciphertext or plaintext secrets. */
export function tokenLifecycleStatus(input: {
  keyIdHint: string | null;
  rotatedAt: string | null;
  expiresAt: string | null;
  hasCiphertext: boolean;
}) {
  return {
    hasStoredCredentials: input.hasCiphertext,
    keyIdHint: input.keyIdHint,
    rotatedAt: input.rotatedAt,
    expiresAt: input.expiresAt,
    expired: isTokenExpired(input.expiresAt),
    secretsExposedToClient: false as const,
  };
}
