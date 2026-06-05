/**
 * Lightweight observability utilities for PropEase.
 *
 * Provides request-level timing, slow query detection, 
 * and SLO Error Budget tracking.
 */

interface SLOMetrics {
  totalRequests: number;
  totalErrors: number;
  p95Latencies: number[];
}

const sloData: SLOMetrics = {
  totalRequests: 0,
  totalErrors: 0,
  p95Latencies: [],
};

export function getSLOMetrics() {
  const errorRate = sloData.totalRequests > 0 ? (sloData.totalErrors / sloData.totalRequests) * 100 : 0;
  
  // Calculate approximate P95 if we have enough data (keep array bounded)
  const sorted = [...sloData.p95Latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted.length > 0 ? sorted[p95Index] : 0;

  return {
    totalRequests: sloData.totalRequests,
    totalErrors: sloData.totalErrors,
    errorRate: errorRate.toFixed(2) + "%",
    p95Latency: p95.toFixed(1) + "ms",
    errorBudgetRemaining: Math.max(0, 100 - (sloData.totalErrors / Math.max(1, sloData.totalRequests) * 1000)), // arbitrary scale
  };
}

/**
 * Wrap an async function with performance timing and SLO tracking.
 */
export async function withTiming<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  sloData.totalRequests++;

  try {
    const result = await fn();
    const ms = performance.now() - start;
    
    // Maintain a rolling window of 1000 latencies
    sloData.p95Latencies.push(ms);
    if (sloData.p95Latencies.length > 1000) sloData.p95Latencies.shift();

    const msFixed = ms.toFixed(1);
    
    // SLO Alert for P95 latency limit (e.g. 250ms)
    if (ms > 250) {
      console.warn(`[SLO VIOLATION] ${label}: ${msFixed}ms (Goal: < 250ms)`);
    } else {
      console.log(`[PERF] ${label}: ${msFixed}ms`);
    }
    
    return result;
  } catch (err) {
    sloData.totalErrors++;
    const ms = (performance.now() - start).toFixed(1);
    console.error(`[PERF FAIL] ${label}: ${ms}ms`, err);
    throw err;
  }
}
