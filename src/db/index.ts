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

  // In a Vite environment with the Cloudflare plugin, or via wrangler in Prod, 
  // bindings are usually exposed on process.env or globalThis
  const env = (typeof process !== "undefined" ? process.env : (globalThis as any)) as any;
  const d1 = env?.DB as any | undefined;
  
  if (!d1) {
    throw new Error(
      "D1 Database binding 'DB' not found in process.env or globalThis. " +
      "Make sure you are running via wrangler or the cloudflare vite plugin."
    );
  }

  return drizzle(d1, { schema });
}
