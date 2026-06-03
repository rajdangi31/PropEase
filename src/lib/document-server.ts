import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { verifySession } from "./auth-crypto";
import {
  createDocument,
  getDocumentsByTenant,
  getDocumentsForLandlord,
  getDocumentById,
  updateDocumentStatus,
  getTenantActiveLeaseAndProperty,
} from "../db/queries";

const SESSION_COOKIE_NAME = "propease_session";

async function requireAuth() {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) throw new Error("Not authenticated");
  const session = await verifySession(token);
  if (!session) throw new Error("Invalid or expired session");
  return session;
}

async function getBucket() {
  if (import.meta.env?.DEV) {
    const { getPlatformProxy } = await import("wrangler");
    const { env } = await getPlatformProxy();
    return env.BUCKET as any;
  }

  // Retrieve Cloudflare env bindings from the custom server entry context or fallbacks
  let env: any = {};
  try {
    const { getCloudflareEnv } = await import("./cloudflare-env");
    env = getCloudflareEnv();
  } catch (error) {
    // Ignore error if server entry cannot be imported
  }

  // Fallback to H3 event storage if server context doesn't contain BUCKET
  if (!env.BUCKET) {
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
  if (!env.BUCKET) {
    const globalEnv = (typeof process !== "undefined" ? process.env : (globalThis as any)) as any;
    env = globalEnv || {};
  }

  const bucket = env.BUCKET;
  if (!bucket) {
    throw new Error(
      "R2 Bucket binding 'BUCKET' not found in server context, Vinxi event context, process.env, or globalThis.",
    );
  }
  return bucket;
}

// Map file extensions to MIME types
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

export const uploadDocumentFn = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    const session = await requireAuth();

    if (session.role !== "tenant") {
      throw new Error("Only tenants can upload documents.");
    }

    // 1. Resolve tenant's active property and lease details
    const leaseDetails = await getTenantActiveLeaseAndProperty(session.id);
    if (!leaseDetails) {
      throw new Error("You must have an active lease to upload documents.");
    }

    // Extract FormData from ctx.data (sent by the client)
    const formData = ctx.data as unknown as FormData;
    if (!(formData instanceof FormData)) {
      throw new Error("Invalid payload: Expected FormData for file upload");
    }

    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const type = formData.get("type") as string | null;

    if (!file || !name || !type) {
      throw new Error("Missing required file or metadata in FormData");
    }

    // 2. Put file in R2 by streaming it
    const bucket = await getBucket();
    const storageKey = `documents/${crypto.randomUUID()}_${name}`;

    await bucket.put(storageKey, file.stream(), {
      httpMetadata: {
        contentType: file.type || getMimeType(name),
      },
    });

    // 3. Create document record in database
    const doc = await createDocument({
      id: crypto.randomUUID(),
      leaseId: leaseDetails.leaseId,
      tenantId: session.id,
      propertyId: leaseDetails.propertyId,
      name: name,
      storagePath: storageKey,
      uploadedBy: session.id,
      type: type as any,
      status: "pending_review",
    });

    return doc;
  });

export const getMyDocumentsFn = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireAuth();
  if (session.role !== "tenant") {
    throw new Error("Only tenants can fetch their own documents.");
  }
  return getDocumentsByTenant(session.id);
});

export const getTenantDocumentsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async (ctx) => {
    const session = await requireAuth();
    if (session.role !== "landlord" && session.role !== "manager") {
      throw new Error("Only landlords and managers can view tenant documents.");
    }

    if (session.role === "landlord") {
      const { getDb } = await import("../db/index");
      const { properties, units, leases, leaseTenants } = await import("../db/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();

      const links = await db
        .select()
        .from(leaseTenants)
        .innerJoin(leases, eq(leaseTenants.leaseId, leases.id))
        .innerJoin(units, eq(leases.unitId, units.id))
        .innerJoin(properties, eq(units.propertyId, properties.id))
        .where(
          and(eq(leaseTenants.profileId, ctx.data.tenantId), eq(properties.landlordId, session.id)),
        )
        .limit(1);

      if (links.length === 0) {
        throw new Error("Unauthorized: Tenant does not belong to any of your properties.");
      }
    }

    return getDocumentsByTenant(ctx.data.tenantId);
  });

export const updateDocumentStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "approved" | "rejected" }) => d)
  .handler(async (ctx) => {
    const session = await requireAuth();
    if (session.role !== "landlord" && session.role !== "manager") {
      throw new Error("Only landlords and managers can update document status.");
    }

    // Verify document exists
    const doc = await getDocumentById(ctx.data.id);
    if (!doc) {
      throw new Error("Document not found");
    }

    // Verify landlord owns property
    const { getDb } = await import("../db/index");
    const { properties } = await import("../db/schema");
    const { eq, and } = await import("drizzle-orm");
    const db = await getDb();
    const [property] = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, doc.propertyId), eq(properties.landlordId, session.id)))
      .limit(1);

    if (!property && session.role !== "manager") {
      throw new Error("Unauthorized to manage documents for this property.");
    }

    return updateDocumentStatus(ctx.data.id, ctx.data.status);
  });

export const downloadDocumentFn = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async (ctx) => {
    const session = await requireAuth();
    const doc = await getDocumentById(ctx.data.id);
    if (!doc) {
      throw new Error("Document not found");
    }

    // Enforce authorization
    if (session.role === "tenant" && doc.tenantId !== session.id) {
      throw new Error("Unauthorized to access this document.");
    }
    if (session.role === "landlord") {
      const { getDb } = await import("../db/index");
      const { properties } = await import("../db/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      const [property] = await db
        .select()
        .from(properties)
        .where(and(eq(properties.id, doc.propertyId), eq(properties.landlordId, session.id)))
        .limit(1);
      if (!property) {
        throw new Error("Unauthorized to access documents for this property.");
      }
    }

    // Retrieve from R2
    const bucket = await getBucket();
    const object = await bucket.get(doc.storagePath);
    if (!object) {
      throw new Error("Document file not found in storage bucket.");
    }

    // Convert to Response and stream directly to client
    return new Response(object.body as ReadableStream, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${doc.name}"`,
      },
    });
  });

export const getDocumentsForLandlordFn = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireAuth();
  if (session.role !== "landlord" && session.role !== "manager") {
    throw new Error("Only landlords and managers can view the document queue.");
  }
  return getDocumentsForLandlord(session.id);
});
