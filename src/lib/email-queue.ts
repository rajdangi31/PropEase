/**
 * Non-blocking email dispatcher (via Background Jobs).
 *
 * Wraps enqueueJob in a fire-and-forget pattern so that HTTP responses
 * are not blocked by external email API calls.
 */
import type { SendEmailOptions } from "./email";
import { enqueueJob } from "./queue-worker";

export function enqueueEmail(opts: SendEmailOptions) {
  enqueueJob("email", opts).catch((err) => {
    console.error(`[EMAIL QUEUE] Failed to enqueue to ${opts.to}:`, err);
  });
}
