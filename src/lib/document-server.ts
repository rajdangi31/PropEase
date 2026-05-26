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

  const env = (typeof process !== "undefined" ? process.env : (globalThis as any)) as any;
  const bucket = env?.BUCKET;
  if (!bucket) {
    throw new Error("R2 Bucket binding 'BUCKET' not found.");
  }
  return bucket;
}

// Map file extensions to MIME types
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "doc": return "application/msword";
    case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt": return "text/plain";
    default: return "application/octet-stream";
  }
}

export const uploadDocumentFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    name: string;
    type: "lease_doc" | "id_proof" | "income_proof" | "inspection_report";
    content: string; // Base64 content
  }) => d)
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    const data = ctx.data;

    if (session.role !== "tenant") {
      throw new Error("Only tenants can upload documents.");
    }

    // 1. Resolve tenant's active property and lease details
    const leaseDetails = await getTenantActiveLeaseAndProperty(session.id);
    if (!leaseDetails) {
      throw new Error("You must have an active lease to upload documents.");
    }

    // 2. Put file in R2
    const bucket = await getBucket();
    const storageKey = `documents/${crypto.randomUUID()}_${data.name}`;
    
    // Convert base64 to binary buffer/Uint8Array
    const binaryString = atob(data.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    await bucket.put(storageKey, bytes.buffer, {
      httpMetadata: {
        contentType: getMimeType(data.name),
      },
    });

    // 3. Create document record in database
    const doc = await createDocument({
      id: crypto.randomUUID(),
      leaseId: leaseDetails.leaseId,
      tenantId: session.id,
      propertyId: leaseDetails.propertyId,
      name: data.name,
      storagePath: storageKey,
      uploadedBy: session.id,
      type: data.type,
      status: "pending_review",
    });

    return doc;
  });

export const getMyDocumentsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    if (session.role !== "tenant") {
      throw new Error("Only tenants can fetch their own documents.");
    }
    return getDocumentsByTenant(session.id);
  });

export const getTenantDocumentsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { tenantId: string }) => d)
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    if (session.role !== "landlord" && session.role !== "manager") {
      throw new Error("Only landlords and managers can view tenant documents.");
    }
    return getDocumentsByTenant(ctx.data.tenantId);
  });

export const updateDocumentStatusFn = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "approved" | "rejected" }) => d)
  .handler(async (ctx: any) => {
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
  .handler(async (ctx: any) => {
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

    const arr = await object.arrayBuffer();
    const uint8 = new Uint8Array(arr);
    
    // Convert to Base64 in a chunk-safe manner to prevent stack overflow on large files
    let binary = "";
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    return {
      name: doc.name,
      contentType: object.httpMetadata?.contentType || "application/octet-stream",
      content: base64,
    };
  });
