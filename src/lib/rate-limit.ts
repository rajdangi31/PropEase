/**
 * Simple in-memory sliding-window rate limiter for Cloudflare Workers.
 *
 * Each Worker isolate maintains its own window map. Counters reset on
 * cold starts, which is acceptable for ~500 users. For stronger guarantees,
 * use Cloudflare Rate Limiting Rules in the dashboard.
 */

const windows = new Map<string, { count: number; resetAt: number }>();

// Periodically purge expired entries to prevent memory leaks
const PURGE_INTERVAL_MS = 60_000;
let lastPurge = Date.now();

function purgeExpired() {
  const now = Date.now();
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  for (const [key, entry] of windows) {
    if (now > entry.resetAt) windows.delete(key);
  }
}

/**
 * Check if a request is within the rate limit.
 *
 * @param key - Unique identifier (e.g., IP address, email, IP:endpoint)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Window duration in milliseconds
 * @returns true if request is allowed, false if rate-limited
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  purgeExpired();
  const now = Date.now();
  const entry = windows.get(key);

  if (!entry || now > entry.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= maxRequests;
}

/**
 * Convenience: throw an error if rate limit is exceeded.
 */
export function enforceRateLimit(key: string, maxRequests: number, windowMs: number): void {
  if (!checkRateLimit(key, maxRequests, windowMs)) {
    throw new Error("Too many requests. Please try again later.");
  }
}
