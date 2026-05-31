import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { verifySession } from "./auth-crypto";
import {
  getTenantsByLandlord, getMaintenanceByLandlord, getMaintenanceByTenant,
  createMaintenanceRequest, getPaymentsByLandlord, getPaymentsByTenant,
  getNotificationsByUser, getDashboardStats, getTenantDashboard,
  payTenantPayment, getAssignableWorkers, updateMaintenanceRequest,
  getMaintenanceByWorker, getAssignableWorkersForLandlord,
  createMaintenanceLog, getMaintenanceLogsByRequest,
  generateRentInvoices, getLandlordActiveLeases, createManualPayment,
  markNotificationRead, markAllNotificationsRead, broadcastAnnouncement,
  terminateLease, renewLease,
} from "../db/queries";

const SESSION_COOKIE_NAME = "propease_session";

async function requireAuth() {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) throw new Error("Not authenticated");
  const session = await verifySession(token);
  if (!session) throw new Error("Invalid or expired session");
  return session;
}

// ─── Tenants ───────────────────────────────────────────────

export const getMyTenantsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    return getTenantsByLandlord(session.id);
  });

// ─── Maintenance ───────────────────────────────────────────

export const getMyMaintenanceFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    if (session.role === "maintenance" || session.role === "service") {
      return getMaintenanceByWorker(session.id);
    }
    return getMaintenanceByLandlord(session.id);
  });

export const getMyMaintenanceAsTenantFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    return getMaintenanceByTenant(session.id);
  });

export const createMaintenanceRequestFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ title: z.string(), description: z.string(), priority: z.string(), category: z.string() }))
  .handler(async (ctx: any) => {
    const data = ctx.data;
    const session = await requireAuth();
    // Find the tenant's current unit through their active lease
    const { getDb } = await import("../db/index");
    const { leaseTenants, leases } = await import("../db/schema");
    const { eq, and } = await import("drizzle-orm");
    const db = await getDb();

    const links = await db.select().from(leaseTenants).where(eq(leaseTenants.profileId, session.id));
    let unitId = "";
    for (const link of links) {
      const [lease] = await db.select().from(leases)
        .where(and(eq(leases.id, link.leaseId), eq(leases.status, "active"))).limit(1);
      if (lease) { unitId = lease.unitId; break; }
    }
    if (!unitId) throw new Error("No active lease found");

    const request = await createMaintenanceRequest({
      id: crypto.randomUUID(),
      unitId,
      tenantId: session.id,
      title: data.title,
      description: data.description,
      priority: data.priority as any,
      status: "pending",
    });

    try {
      const { getProfileById } = await import("../db/queries");
      const { properties, units } = await import("../db/schema");

      // Fetch tenant and unit details
      const tenant = await getProfileById(session.id);
      const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : "A Tenant";

      const [unit] = await db.select().from(units).where(eq(units.id, unitId)).limit(1);
      if (unit) {
        const [property] = await db.select().from(properties).where(eq(properties.id, unit.propertyId)).limit(1);
        if (property) {
          const landlord = await getProfileById(property.landlordId);
          if (landlord && landlord.email) {
            const subject = `[New Maintenance Request] ${data.title} - Apt ${unit.unitNumber}`;
            const text = `Hello ${landlord.firstName},

A new maintenance request has been submitted by tenant ${tenantName} for Apt ${unit.unitNumber} (${property.name}):

Title: ${data.title}
Priority: ${data.priority}
Description:
${data.description}

Please log in to your dashboard to review and assign this task.

Best regards,
PropEase Notifications`;

            const html = `<p>Hello ${landlord.firstName},</p>
<p>A new maintenance request has been submitted by tenant <strong>${tenantName}</strong> for <strong>Apt ${unit.unitNumber} (${property.name})</strong>:</p>
<table style="border: 1px solid #ccc; padding: 10px; border-collapse: collapse;">
  <tr><td><strong>Title:</strong></td><td>${data.title}</td></tr>
  <tr><td><strong>Priority:</strong></td><td><span style="text-transform: capitalize;">${data.priority}</span></td></tr>
  <tr><td><strong>Description:</strong></td><td>${data.description}</td></tr>
</table>
<p>Please log in to your landlord dashboard to review and assign this task.</p>
<p>Best regards,<br/>PropEase Notifications</p>`;

            const { sendEmail } = await import("./email");
            await sendEmail({ to: landlord.email, subject, html, text });
          }
        }
      }
    } catch (err) {
      console.error("Failed to send maintenance request email:", err);
    }

    return request;
  });

export const getAssignableWorkersFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    if (session.role === "maintenance" || session.role === "service") {
      return [];
    }
    return getAssignableWorkersForLandlord(session.id);
  });

export const updateMaintenanceRequestFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    id: z.string(),
    status: z.enum(["pending", "in_progress", "resolved_pending", "resolved"]).optional(),
    priority: z.enum(["low", "medium", "high", "emergency"]).optional(),
    assignedWorkerId: z.string().nullable().optional(),
  }))
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    const data = ctx.data;

    const { getDb } = await import("../db/index");
    const { maintenanceRequests } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    const [existingRequest] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, data.id)).limit(1);

    if (!existingRequest) {
      throw new Error("Maintenance request not found.");
    }

    const finalStatus = data.status !== undefined ? data.status : existingRequest.status;
    const finalAssignee = data.assignedWorkerId !== undefined ? data.assignedWorkerId : existingRequest.assignedWorkerId;

    if (finalStatus !== "pending" && !finalAssignee) {
      throw new Error("Cannot move maintenance request: No worker is assigned.");
    }

    if (session.role === "maintenance" || session.role === "service") {
      if (data.status === "resolved") {
        throw new Error("Only landlords or managers can set status to Resolved.");
      }
      
      // Strip priority and assignee modifications for workers
      const workerPayload: Record<string, any> = {};
      if (data.status !== undefined) workerPayload.status = data.status;
      return updateMaintenanceRequest(data.id, workerPayload);
    }

    if (session.role !== "landlord" && session.role !== "manager" && session.role !== "admin") {
      throw new Error("Unauthorized");
    }

    // Landlord / admin flow:
    // Only include fields that were actually provided to avoid setting NOT NULL columns to NULL
    const payload: Record<string, any> = {};
    if (data.status !== undefined) payload.status = data.status;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.assignedWorkerId !== undefined) payload.assignedWorkerId = data.assignedWorkerId;

    const result = await updateMaintenanceRequest(data.id, payload);

    // 2. Email assignment notification if changed and not null
    if (
      existingRequest &&
      data.assignedWorkerId !== undefined &&
      data.assignedWorkerId !== null &&
      data.assignedWorkerId !== existingRequest.assignedWorkerId
    ) {
      try {
        const { getProfileById } = await import("../db/queries");
        const worker = await getProfileById(data.assignedWorkerId);
        if (worker && worker.email) {
          const { units, properties } = await import("../db/schema");
          const [unit] = await db.select().from(units).where(eq(units.id, existingRequest.unitId)).limit(1);
          const [property] = unit ? await db.select().from(properties).where(eq(properties.id, unit.propertyId)).limit(1) : [null];
          const unitLabel = unit && property ? `Apt ${unit.unitNumber} (${property.name})` : "Assigned Unit";
          
          const title = existingRequest.title;
          const priority = data.priority || existingRequest.priority;
          const description = existingRequest.description;

          const subject = `[Maintenance Assignment] ${title} - ${unitLabel}`;
          const text = `Hello ${worker.firstName},

You have been assigned to a maintenance request:

Title: ${title}
Location: ${unitLabel}
Priority: ${priority}
Description:
${description}

Please log in to your dashboard to view the request and update its status as you make progress.

Best regards,
PropEase Notifications`;

          const html = `<p>Hello ${worker.firstName},</p>
<p>You have been assigned to the following maintenance request:</p>
<table style="border: 1px solid #ccc; padding: 10px; border-collapse: collapse;">
  <tr><td><strong>Title:</strong></td><td>${title}</td></tr>
  <tr><td><strong>Location:</strong></td><td>${unitLabel}</td></tr>
  <tr><td><strong>Priority:</strong></td><td><span style="text-transform: capitalize;">${priority}</span></td></tr>
  <tr><td><strong>Description:</strong></td><td>${description}</td></tr>
</table>
<p>Please log in to your dashboard to view the request and update its progress status.</p>
<p>Best regards,<br/>PropEase Notifications</p>`;

          const { sendEmail } = await import("./email");
          await sendEmail({ to: worker.email, subject, html, text });
        }
      } catch (err) {
        console.error("Failed to send worker assignment email:", err);
      }
    }

    return result;
  });

// ─── Payments ──────────────────────────────────────────────

export const getMyPaymentsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    return getPaymentsByLandlord(session.id);
  });

export const getMyPaymentsAsTenantFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    return getPaymentsByTenant(session.id);
  });

// ─── Notifications ─────────────────────────────────────────

export const getMyNotificationsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    return getNotificationsByUser(session.id);
  });

export const markNotificationReadFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    return markNotificationRead(ctx.data.id, session.id);
  });

export const markAllNotificationsReadFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const session = await requireAuth();
    return markAllNotificationsRead(session.id);
  });

export const broadcastAnnouncementFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ propertyId: z.string().nullable(), title: z.string(), body: z.string() }))
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    if (session.role !== "landlord") {
      throw new Error("Only landlords can broadcast announcements.");
    }
    const { propertyId, title, body } = ctx.data;
    return broadcastAnnouncement(session.id, propertyId, title, body);
  });

// ─── Dashboard ─────────────────────────────────────────────

export const getDashboardFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    return getDashboardStats(session.id);
  });

// ─── Tenant Dashboard ──────────────────────────────────────

export const getTenantDashboardFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    return getTenantDashboard(session.id);
  });

export const payRentFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ cardNumber: z.string() }))
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    if (session.role !== "tenant") throw new Error("Only tenants can pay rent.");
    const { cardNumber } = ctx.data;
    const cleaned = (cardNumber || "").replace(/\s+/g, "");
    if (cleaned === "4000000000003220") {
      throw new Error("Card declined. Please check your card details and try again.");
    }
    return payTenantPayment(session.id);
  });

export const generateRentInvoicesFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const session = await requireAuth();
    if (session.role !== "landlord") throw new Error("Only landlords can trigger invoice generation.");
    return generateRentInvoices(session.id);
  });

export const getMaintenanceLogsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ requestId: z.string() }))
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    const { requestId } = ctx.data;

    // Check request existence and access permissions
    const { getDb } = await import("../db/index");
    const { maintenanceRequests } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    const [request] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, requestId)).limit(1);

    if (!request) {
      throw new Error("Maintenance request not found");
    }

    if (session.role === "tenant") {
      if (request.tenantId !== session.id) {
        throw new Error("Unauthorized access to maintenance request logs.");
      }
      return getMaintenanceLogsByRequest(requestId, false);
    }

    // Landlords, managers, workers can view logs (including internal notes)
    if (session.role === "landlord") {
      const { properties, units } = await import("../db/schema");
      const [unit] = await db.select().from(units).where(eq(units.id, request.unitId)).limit(1);
      if (!unit) throw new Error("Unit not found");
      const [prop] = await db.select().from(properties).where(eq(properties.id, unit.propertyId)).limit(1);
      if (!prop || prop.landlordId !== session.id) {
        throw new Error("Unauthorized to access logs for this property.");
      }
    }
    if (session.role === "maintenance" || session.role === "service") {
      const { propertyWorkers, units } = await import("../db/schema");
      const [unit] = await db.select().from(units).where(eq(units.id, request.unitId)).limit(1);
      if (!unit) throw new Error("Unit not found");
      const { and } = await import("drizzle-orm");
      const [pw] = await db.select().from(propertyWorkers)
        .where(and(eq(propertyWorkers.propertyId, unit.propertyId), eq(propertyWorkers.profileId, session.id)))
        .limit(1);
      if (!pw && request.assignedWorkerId !== session.id) {
        throw new Error("Unauthorized to access logs for this property.");
      }
    }

    return getMaintenanceLogsByRequest(requestId, true);
  });

export const addMaintenanceLogFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ requestId: z.string(), content: z.string(), isInternal: z.boolean() }))
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    const { requestId, content, isInternal } = ctx.data;

    // Check request existence and access permissions
    const { getDb } = await import("../db/index");
    const { maintenanceRequests } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    const [request] = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, requestId)).limit(1);

    if (!request) {
      throw new Error("Maintenance request not found");
    }

    if (session.role === "tenant") {
      if (request.tenantId !== session.id) {
        throw new Error("Unauthorized access to maintenance request.");
      }
      if (isInternal) {
        throw new Error("Tenants cannot create internal notes.");
      }
    }

    // Landlords, managers, workers checks
    if (session.role === "landlord") {
      const { properties, units } = await import("../db/schema");
      const [unit] = await db.select().from(units).where(eq(units.id, request.unitId)).limit(1);
      if (!unit) throw new Error("Unit not found");
      const [prop] = await db.select().from(properties).where(eq(properties.id, unit.propertyId)).limit(1);
      if (!prop || prop.landlordId !== session.id) {
        throw new Error("Unauthorized to comment on this request.");
      }
    }
    if (session.role === "maintenance" || session.role === "service") {
      const { propertyWorkers, units } = await import("../db/schema");
      const [unit] = await db.select().from(units).where(eq(units.id, request.unitId)).limit(1);
      if (!unit) throw new Error("Unit not found");
      const { and } = await import("drizzle-orm");
      const [pw] = await db.select().from(propertyWorkers)
        .where(and(eq(propertyWorkers.propertyId, unit.propertyId), eq(propertyWorkers.profileId, session.id)))
        .limit(1);
      if (!pw && request.assignedWorkerId !== session.id) {
        throw new Error("Unauthorized to comment on this request.");
      }
    }

    // Add log
    return createMaintenanceLog({
      id: crypto.randomUUID(),
      requestId,
      authorId: session.id,
      content,
      isInternal,
    });
  });

export const getLandlordActiveLeasesFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireAuth();
    if (session.role !== "landlord") throw new Error("Only landlords can view active leases.");
    return getLandlordActiveLeases(session.id);
  });

export const createManualPaymentFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    leaseId: z.string(),
    tenantId: z.string(),
    amount: z.number(),
    category: z.enum(["rent", "deposit", "utility", "late_fee"]),
    paidDate: z.string(),
  }))
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    if (session.role !== "landlord") throw new Error("Only landlords can log manual payments.");
    return createManualPayment(session.id, ctx.data);
  });

export const terminateLeaseFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ leaseId: z.string() }))
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    if (session.role !== "landlord" && session.role !== "manager") {
      throw new Error("Only landlords and managers can terminate leases.");
    }
    return terminateLease(session.id, ctx.data.leaseId);
  });

export const renewLeaseFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ leaseId: z.string(), newEndDate: z.string(), newRent: z.number() }))
  .handler(async (ctx: any) => {
    const session = await requireAuth();
    if (session.role !== "landlord" && session.role !== "manager") {
      throw new Error("Only landlords and managers can renew leases.");
    }
    const { leaseId, newEndDate, newRent } = ctx.data;
    return renewLease(session.id, leaseId, newEndDate, newRent * 100); // Convert dollars to cents
  });
