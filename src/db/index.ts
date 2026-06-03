import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let devDb: any = null;

/**
 * Returns the Drizzle ORM database instance for Cloudflare D1.
 */
export async function getDb() {
  if (import.meta.env?.DEV) {
    if (!devDb) {
      const { getPlatformProxy } = await import("wrangler");
      const { env } = await getPlatformProxy();
      devDb = drizzle(env.DB as any, { schema });
    }
    return devDb;
  }

  // Retrieve Cloudflare env bindings from the custom server entry context or fallbacks
  let env: any = {};
  try {
    const { getCloudflareEnv } = await import("../lib/cloudflare-env");
    env = getCloudflareEnv();
  } catch (error) {
    // Ignore error if server entry cannot be imported
  }

  // Fallback to H3 event storage if server context doesn't contain DB
  if (!env.DB) {
    try {
      const storageKey = Symbol.for("tanstack-start:event-storage");
      const eventStorage = (globalThis as any)[storageKey];
      const event = eventStorage?.getStore()?.h3Event;
      if (event) {
        env =
          event.context?.cloudflare?.env ||
          event.node?.req?.runtime?.cloudflare?.env ||
          event.node?.req?.__cloudflare_env ||
          {};
      }
    } catch (error) {
      // Ignore errors if context is accessed outside request lifecycle
    }
  }

  // Fallback to process.env or globalThis if event context is not available
  if (!env.DB) {
    const globalEnv = (typeof process !== "undefined" ? process.env : (globalThis as any)) as any;
    env = globalEnv || {};
  }

  const d1 = env.DB as any | undefined;

  if (!d1) {
    throw new Error(
      "D1 Database binding 'DB' not found in server context, Vinxi event context, process.env, or globalThis. " +
        "Make sure you are running via wrangler or the cloudflare vite plugin.",
    );
  }

  return drizzle(d1, { schema });
}
