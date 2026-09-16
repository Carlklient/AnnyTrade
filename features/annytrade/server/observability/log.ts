/**
 * Structured logging for AnnyTrade ops (Phase 10).
 * Never log secrets — callers should pass already-redacted fields.
 */

import { redactValue } from "../security/redact";

export type LogLevel = "debug" | "info" | "warn" | "error";

export function structuredLog(
  level: LogLevel,
  message: string,
  fields?: Record<string, unknown>,
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: "annytrade",
    message,
    ...(fields ? (redactValue(fields) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  debug: (message: string, fields?: Record<string, unknown>) =>
    structuredLog("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) =>
    structuredLog("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) =>
    structuredLog("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) =>
    structuredLog("error", message, fields),
};
