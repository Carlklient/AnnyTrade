/**
 * In-process metrics foundation (Phase 10).
 * Suitable for single-instance / export snapshots; not a full Prometheus stack.
 */

type Counter = { name: string; value: number; labels?: Record<string, string> };
type Histogram = {
  name: string;
  count: number;
  sumMs: number;
  maxMs: number;
  labels?: Record<string, string>;
};

const counters = new Map<string, Counter>();
const histograms = new Map<string, Histogram>();
const gauges = new Map<string, number>();

function key(name: string, labels?: Record<string, string>) {
  if (!labels) return name;
  return `${name}|${Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(",")}`;
}

export function incrMetric(
  name: string,
  by = 1,
  labels?: Record<string, string>,
): void {
  const k = key(name, labels);
  const cur = counters.get(k);
  if (cur) cur.value += by;
  else counters.set(k, { name, value: by, labels });
}

export function observeLatencyMs(
  name: string,
  ms: number,
  labels?: Record<string, string>,
): void {
  const k = key(name, labels);
  const cur = histograms.get(k);
  if (cur) {
    cur.count += 1;
    cur.sumMs += ms;
    cur.maxMs = Math.max(cur.maxMs, ms);
  } else {
    histograms.set(k, { name, count: 1, sumMs: ms, maxMs: ms, labels });
  }
}

export function setGauge(name: string, value: number): void {
  gauges.set(name, value);
}

export function getMetricsSnapshot() {
  return {
    asOf: new Date().toISOString(),
    counters: [...counters.values()],
    histograms: [...histograms.values()].map((h) => ({
      ...h,
      avgMs: h.count ? h.sumMs / h.count : 0,
    })),
    gauges: Object.fromEntries(gauges),
    notes: [
      "In-process foundation — multi-instance requires shared metrics backend",
      "Gauges: market_feed_ok, broker_connected, db_ok, queue_depth, active_subscriptions",
    ],
  };
}

export function resetMetricsForTests() {
  counters.clear();
  histograms.clear();
  gauges.clear();
}
