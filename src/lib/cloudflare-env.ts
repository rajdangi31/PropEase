let storage: any = null;

/**
 * Initializes the AsyncLocalStorage dynamically on the server.
 * This prevents static bundler errors in browser environments.
 */
export async function initCloudflareEnvStorage() {
  if (typeof window === "undefined") {
    try {
      const { AsyncLocalStorage } = await import("node:async_hooks");
      if (AsyncLocalStorage) {
        storage = new AsyncLocalStorage();
      }
    } catch (e) {
      console.warn("Failed to initialize AsyncLocalStorage:", e);
    }
  }
}

/**
 * Helper to retrieve the Cloudflare environment bindings.
 */
export function getCloudflareEnv() {
  if (storage) {
    const store = storage.getStore();
    if (store) return store;
  }

  // Fallback to process.env or globalThis
  return (typeof process !== "undefined" ? process.env : (globalThis as any)) || {};
}

/**
 * Executes a callback with the given env store.
 */
export function runWithEnv(env: any, callback: () => any) {
  if (storage) {
    return storage.run(env, callback);
  }
  return callback();
}
