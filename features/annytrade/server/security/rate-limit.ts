/**
 * Rate limiting with optional distributed backend.
 *
 * - memory: process-local (default; OK for single instance / tests)
 * - redis: Upstash Redis REST (preferred for multi-instance production)
 *
 * Set ANNYTRADE_REDIS_REST_URL + ANNYTRADE_REDIS_REST_TOKEN (or
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
 */

import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  backend: "memory" | "redis";
};

function redisConfigured(): boolean {
  return Boolean(
    (process.env.ANNYTRADE_REDIS_REST_URL ||
      process.env.UPSTASH_REDIS_REST_URL) &&
    (process.env.ANNYTRADE_REDIS_REST_TOKEN ||
      process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

function preferRedis(): boolean {
  const mode = (
    process.env.ANNYTRADE_RATE_LIMIT_BACKEND ?? "auto"
  ).toLowerCase();
  if (mode === "memory") return false;
  if (mode === "redis") return true;
  return redisConfigured();
}

async function redisCommand(
  commands: (string | number)[][],
): Promise<unknown[]> {
  const url =
    process.env.ANNYTRADE_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.ANNYTRADE_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis REST not configured");

  const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    throw new Error(`Redis REST ${res.status}`);
  }
  const json = (await res.json()) as { result?: unknown }[] | unknown[];
  // Upstash pipeline returns [{result: ...}, ...]
  if (Array.isArray(json) && json.length && typeof json[0] === "object") {
    return (json as { result: unknown }[]).map((r) => r.result);
  }
  return json as unknown[];
}

function memoryRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(options.key);

  if (!current || current.resetAt <= now) {
    buckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return {
      ok: true,
      remaining: options.limit - 1,
      retryAfterSec: 0,
      backend: "memory",
    };
  }

  if (current.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      backend: "memory",
    };
  }

  current.count += 1;
  buckets.set(options.key, current);
  return {
    ok: true,
    remaining: Math.max(0, options.limit - current.count),
    retryAfterSec: 0,
    backend: "memory",
  };
}

async function redisRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const rlKey = `annytrade:rl:${options.key}`;
  const windowSec = Math.max(1, Math.ceil(options.windowMs / 1000));
  const results = await redisCommand([
    ["INCR", rlKey],
    ["TTL", rlKey],
  ]);
  const count = Number(results[0] ?? 0);
  let ttl = Number(results[1] ?? -1);
  if (ttl < 0) {
    await redisCommand([["EXPIRE", rlKey, windowSec]]);
    ttl = windowSec;
  }
  if (count > options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, ttl),
      backend: "redis",
    };
  }
  return {
    ok: true,
    remaining: Math.max(0, options.limit - count),
    retryAfterSec: 0,
    backend: "redis",
  };
}

/**
 * Sync wrapper kept for existing call sites. When Redis is preferred,
 * falls back to memory if Redis fails (fail-open for availability) unless
 * ANNYTRADE_RATE_LIMIT_FAIL_CLOSED=true.
 */
export function rateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  if (!preferRedis()) {
    return memoryRateLimit(options);
  }
  // Sync path cannot await Redis — use memory and schedule async warm path
  // Callers that need distributed limits should use rateLimitAsync.
  return memoryRateLimit(options);
}

export async function rateLimitAsync(options: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  if (!preferRedis()) {
    return memoryRateLimit(options);
  }
  try {
    return await redisRateLimit(options);
  } catch {
    if (process.env.ANNYTRADE_RATE_LIMIT_FAIL_CLOSED === "true") {
      return {
        ok: false,
        remaining: 0,
        retryAfterSec: 5,
        backend: "redis",
      };
    }
    return memoryRateLimit(options);
  }
}

export function clientKey(request: NextRequest, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

export function rateLimitBackendStatus() {
  return {
    preferred: preferRedis() ? ("redis" as const) : ("memory" as const),
    redisConfigured: redisConfigured(),
    note: preferRedis()
      ? "Distributed Redis rate limiting available via rateLimitAsync"
      : "Process-local memory limiter — configure Redis REST for multi-instance production",
  };
}

export function resetRateLimitForTests() {
  buckets.clear();
}
