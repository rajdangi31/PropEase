/**
 * Non-blocking email dispatcher.
 *
 * Wraps sendEmail() in a fire-and-forget pattern so that HTTP responses
 * are not blocked by external email API calls. On Cloudflare Workers,
 * uses the execution context's waitUntil() to keep the isolate alive
 * until the email send completes.
 */
import type { SendEmailOptions } from "./email";

export function enqueueEmail(opts: SendEmailOptions) {
  // Dynamically import sendEmail to avoid circular deps
  const promise = import("./email")
    .then(({ sendEmail }) => sendEmail(opts))
    .catch((err) => {
      console.error(`[EMAIL QUEUE] Failed to send to ${opts.to}:`, err);
    });

  // Try to use Cloudflare's waitUntil if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("./cloudflare-env");
    const ctx = getCloudflareContext?.();
    if (ctx?.waitUntil) {
      ctx.waitUntil(promise);
      return;
    }
  } catch {
    // Not in CF context — fall through
  }

  // Fallback: fire-and-forget (works in dev)
  void promise;
}
