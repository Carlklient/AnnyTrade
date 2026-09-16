type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function dedupe<T>(
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = factory().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  factory: () => Promise<T>,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  return dedupe(key, async () => {
    const value = await factory();
    cacheSet(key, value, ttlMs);
    return value;
  });
}

export function cacheClear(): void {
  store.clear();
  inflight.clear();
}

/** TTLs — not one-size-fits-all */
export const MarketCacheTTL = {
  instrumentMeta: 60 * 60 * 1000,
  search: 60 * 1000,
  quote: 3_000,
  candlesIntraday: 5_000,
  candlesDaily: 5 * 60_000,
  marketStatus: 30_000,
  sourceMeta: 10_000,
} as const;
