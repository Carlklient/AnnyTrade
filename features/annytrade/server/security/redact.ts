/**
 * Sensitive-data redaction for logs and error reporting.
 * Never log broker secrets, passwords, session tokens, or ciphertext.
 */

const SENSITIVE_KEY =
  /^(password|passwd|secret|token|authorization|api[_-]?key|api[_-]?secret|ciphertext|cookie|session|refresh[_-]?token|private[_-]?key)$/i;

const SENSITIVE_INLINE =
  /(api[_-]?key|api[_-]?secret|password|bearer\s+[a-z0-9._-]+|v1:[a-f0-9]+:)/gi;

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 500)
      return `${value.slice(0, 200)}…[redacted-length:${value.length}]`;
    return value.replace(SENSITIVE_INLINE, "[redacted]");
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = redactValue(v, depth + 1);
      }
    }
    return out;
  }
  return String(value);
}

export function safeLogError(label: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(label, {
      name: error.name,
      message: redactValue(error.message),
      // Stacks may include paths; keep in non-production only
      stack:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.stack?.slice(0, 2000),
    });
    return;
  }
  console.error(label, redactValue(error));
}

export function redactMetadata(
  meta: Record<string, unknown>,
): Record<string, unknown> {
  return redactValue(meta) as Record<string, unknown>;
}
