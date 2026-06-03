/**
 * Lightweight observability utilities for PropEase.
 *
 * Provides request-level timing and structured logging for
 * slow query detection and performance monitoring.
 */

/**
 * Wrap an async function with performance timing.
 * Logs execution time to console with a structured label.
 */
export async function withTiming<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const ms = (performance.now() - start).toFixed(1);
    if (Number(ms) > 500) {
      console.warn(`[PERF SLOW] ${label}: ${ms}ms`);
    } else {
      console.log(`[PERF] ${label}: ${ms}ms`);
    }
    return result;
  } catch (err) {
    const ms = (performance.now() - start).toFixed(1);
    console.error(`[PERF FAIL] ${label}: ${ms}ms`, err);
    throw err;
  }
}
