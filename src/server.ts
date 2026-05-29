import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { initCloudflareEnvStorage, runWithEnv } from "./lib/cloudflare-env";

// Initialize the storage dynamically at startup
initCloudflareEnvStorage();

export default createServerEntry({
  fetch(...args: any[]) {
    // In Cloudflare Workers, args[1] is the env bindings object
    const env = args[1];
    return runWithEnv(env, () => {
      return (handler as any).fetch(...args);
    });
  },
});
