import { getDb } from "../db/index";
import { backgroundJobs } from "../db/schema";
import { eq, sql } from "drizzle-orm";

type JobType = "email" | "notification" | "invoice_generation";

export async function enqueueJob(type: JobType, payload: any) {
  const db = await getDb();
  
  await db.insert(backgroundJobs).values({
    id: crypto.randomUUID(),
    type,
    payload: JSON.stringify(payload),
    status: "pending",
  });

  // Try to use Cloudflare's waitUntil to kick off processing immediately if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("./cloudflare-env");
    const ctx = getCloudflareContext?.();
    if (ctx?.waitUntil) {
      ctx.waitUntil(processJobs().catch(console.error));
      return;
    }
  } catch {
    // Not in CF context — fall through
  }

  // Fallback: fire-and-forget in Node/dev
  processJobs().catch(console.error);
}

// Ensure only one processor runs at a time locally, or handle concurrency in DB
let isProcessing = false;

export async function processJobs() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const db = await getDb();
    
    // Simple queue processor locking: fetch up to 5 pending jobs
    const now = Math.floor(Date.now() / 1000);
    const jobs = await db.all(sql`
      SELECT * FROM background_jobs 
      WHERE status = 'pending' AND next_run_at <= ${now}
      LIMIT 5
    `) as any[];

    if (jobs.length === 0) return;

    for (const job of jobs) {
      // Mark as processing
      await db.update(backgroundJobs)
        .set({ status: "processing" })
        .where(eq(backgroundJobs.id, job.id));

      try {
        const payload = JSON.parse(job.payload);
        
        switch (job.type) {
          case "email": {
            const { sendEmail } = await import("./email");
            await sendEmail(payload);
            break;
          }
          case "notification": {
            const { createNotification } = await import("../db/queries");
            await createNotification(payload);
            break;
          }
          case "invoice_generation": {
            const { generateRentInvoices } = await import("../db/queries");
            await generateRentInvoices(payload.landlordId);
            break;
          }
          default:
            throw new Error(`Unknown job type: ${job.type}`);
        }

        // Success
        await db.update(backgroundJobs)
          .set({ status: "completed" })
          .where(eq(backgroundJobs.id, job.id));

      } catch (err: any) {
        console.error(`Job ${job.id} failed:`, err);
        const attempts = job.attempts + 1;
        const maxAttempts = job.max_attempts;

        if (attempts >= maxAttempts) {
          await db.update(backgroundJobs)
            .set({ 
              status: "dead_letter", 
              attempts,
              lastError: err.message || "Unknown error"
            })
            .where(eq(backgroundJobs.id, job.id));
        } else {
          // Exponential backoff: 30s, 120s, 270s...
          const nextRunAt = now + (attempts * attempts * 30);
          await db.update(backgroundJobs)
            .set({ 
              status: "pending", 
              attempts,
              nextRunAt,
              lastError: err.message || "Unknown error"
            })
            .where(eq(backgroundJobs.id, job.id));
        }
      }
    }

    // Recursively process if there might be more
    if (jobs.length === 5) {
      isProcessing = false;
      await processJobs();
    }
  } finally {
    isProcessing = false;
  }
}
