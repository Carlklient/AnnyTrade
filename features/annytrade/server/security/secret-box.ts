import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const SCRYPT_SALT = "annytrade-broker-v1";

function deriveKey(raw: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return scryptSync(raw, SCRYPT_SALT, 32);
}

function primaryMaterial(): string | null {
  return (
    process.env.ANNYTRADE_BROKER_ENCRYPTION_KEY ||
    process.env.ANNYTRADE_SECRET_ENCRYPTION_KEY ||
    null
  );
}

function keyMaterials(): string[] {
  const list: string[] = [];
  const primary = primaryMaterial();
  const previous = process.env.ANNYTRADE_BROKER_ENCRYPTION_KEY_PREVIOUS;
  if (primary) list.push(primary);
  if (previous) list.push(previous);
  return list;
}

function getMasterKey(): Buffer {
  const raw = primaryMaterial();
  if (!raw) {
    throw new Error(
      "ANNYTRADE_BROKER_ENCRYPTION_KEY required to store broker credentials",
    );
  }
  return deriveKey(raw);
}

/** Encrypt plaintext for at-rest storage. Never log plaintext or ciphertext dumps. */
export function encryptSecret(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

/**
 * Decrypt with primary key, then previous key (rotation window).
 */
export function decryptSecret(payload: string): string {
  const [ver, ivB64, tagB64, dataB64] = payload.split(":");
  if (ver !== "v1" || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid ciphertext");
  }
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const materials = keyMaterials();
  if (!materials.length) {
    throw new Error(
      "ANNYTRADE_BROKER_ENCRYPTION_KEY required to store broker credentials",
    );
  }
  let lastErr: unknown;
  for (const material of materials) {
    try {
      const decipher = createDecipheriv(ALGO, deriveKey(material), iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString(
        "utf8",
      );
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Decrypt failed");
}

/** Re-seal under the current primary key after rotation. */
export function rewrapSecret(ciphertext: string): string {
  return encryptSecret(decryptSecret(ciphertext));
}

export function hintKeyId(apiKey: string): string {
  if (apiKey.length <= 4) return "****";
  return `…${apiKey.slice(-4)}`;
}

export function canEncryptBrokerSecrets(): boolean {
  return Boolean(primaryMaterial());
}

export function encryptionRotationStatus() {
  return {
    hasPrimary: Boolean(primaryMaterial()),
    hasPrevious: Boolean(process.env.ANNYTRADE_BROKER_ENCRYPTION_KEY_PREVIOUS),
    fingerprint: primaryMaterial()
      ? createHash("sha256")
          .update(deriveKey(primaryMaterial()!))
          .digest("hex")
          .slice(0, 12)
      : null,
    strategy:
      "1) Set PREVIOUS=old key 2) Set primary=new key 3) rewrap stored ciphertext 4) remove PREVIOUS",
  };
}
