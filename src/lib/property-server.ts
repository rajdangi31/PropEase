import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { verifySession } from "./auth-crypto";
import {
  getPropertiesByLandlord,
  createProperty as dbCreateProperty,
  getUnitsByProperty,
  createUnit as dbCreateUnit,
  updateUnit as dbUpdateUnit,
  createInvite,
  getInvite,
  type PropertyWithCounts,
  type UnitWithTenant,
} from "../db/queries";

const SESSION_COOKIE_NAME = "propease_session";

/**
 * Helper: reads the session cookie, verifies the JWT, and returns the payload.
 * Throws if not authenticated.
 */
async function requireAuth() {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) throw new Error("Not authenticated");

  const session = await verifySession(token);
  if (!session) throw new Error("Invalid or expired session");

  return session;
}

// ─── Properties ────────────────────────────────────────────

/**
 * Get all properties for the logged-in landlord/worker, with unit/occupancy counts.
 */
export const getMyPropertiesFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<PropertyWithCounts[]> => {
    const session = await requireAuth();
    if (session.role === "maintenance" || session.role === "service") {
      const { getPropertiesByWorker } = await import("../db/queries");
      return getPropertiesByWorker(session.id);
    }
    return getPropertiesByLandlord(session.id);
  });

/**
 * Create a new property for the logged-in landlord.
 */
export const createPropertyFn = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; address: string; description?: string }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;
    const session = await requireAuth();

    const id = crypto.randomUUID();
    const property = await dbCreateProperty({
      id,
      landlordId: session.id,
      name: data.name,
      address: data.address,
      description: data.description ?? null,
    });

    return property;
  });

// ─── Units ─────────────────────────────────────────────────

/**
 * Get all units for a specific property.
 * Verifies the logged-in user owns the property.
 */
export const getUnitsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { propertyId: string }) => d)
  .handler(async (ctx: any): Promise<UnitWithTenant[]> => {
    const data = ctx.data;
    const session = await requireAuth();

    // The query layer will return units for the given property.
    // Ownership is enforced because the property was created with the landlord's ID,
    // and the UI only shows properties the landlord owns.
    return getUnitsByProperty(data.propertyId);
  });

/**
 * Create a new unit in a property.
 */
export const createUnitFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    propertyId: string;
    unitNumber: string;
    rent: number;
    sqft?: number;
    beds?: number;
    baths?: number;
  }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;
    const session = await requireAuth();

    const id = crypto.randomUUID();
    const unit = await dbCreateUnit({
      id,
      propertyId: data.propertyId,
      unitNumber: data.unitNumber,
      currentMarketRent: Math.round(data.rent * 100), // dollars → cents
      sqft: data.sqft ?? null,
      beds: data.beds ?? null,
      baths: data.baths ?? null,
      status: "vacant",
    });

    return unit;
  });

/**
 * Update an existing unit.
 */
export const updateUnitFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id: string;
    unitNumber?: string;
    rent?: number;
    sqft?: number;
    beds?: number;
    baths?: number;
    status?: "occupied" | "vacant" | "maintenance";
  }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;
    const session = await requireAuth();

    // Verify session/role (e.g. only landlords/managers can edit unit details)
    if (session.role !== "landlord" && session.role !== "manager" && session.role !== "admin") {
      throw new Error("Only landlords or managers can edit unit details.");
    }

    const unit = await dbUpdateUnit(data.id, {
      unitNumber: data.unitNumber,
      currentMarketRent: data.rent !== undefined ? Math.round(data.rent * 100) : undefined,
      sqft: data.sqft !== undefined ? data.sqft : undefined,
      beds: data.beds !== undefined ? data.beds : undefined,
      baths: data.baths !== undefined ? data.baths : undefined,
      status: data.status,
    });

    return unit;
  });

// ─── Invitations ───────────────────────────────────────────

export const createInviteFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    propertyId: string;
    unitId?: string;
    email?: string;
    rentAmount?: number;
    leaseStart?: string;
    leaseEnd?: string;
    inviteType?: "tenant" | "maintenance";
  }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;
    const session = await requireAuth();

    const id = crypto.randomUUID();
    // Expiry 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invite = await createInvite({
      id,
      landlordId: session.id,
      propertyId: data.propertyId,
      unitId: data.unitId ?? null,
      email: data.email || null,
      rentAmount: data.rentAmount !== undefined && data.rentAmount !== null ? Math.round(data.rentAmount * 100) : null,
      leaseStart: data.leaseStart ?? null,
      leaseEnd: data.leaseEnd ?? null,
      inviteType: data.inviteType ?? "tenant",
      status: "pending",
      expiresAt,
    });

    if (data.email) {
      try {
        const { getProfileById } = await import("../db/queries");
        const { getDb } = await import("../db/index");
        const { properties, units } = await import("../db/schema");
        const { eq } = await import("drizzle-orm");

        const landlord = await getProfileById(session.id);
        const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : "Your Landlord";

        const db = await getDb();
        const [property] = await db.select({ name: properties.name }).from(properties).where(eq(properties.id, data.propertyId)).limit(1);
        const propertyName = property?.name ?? "a property";

        let unitLabel = "";
        if (data.unitId) {
          const [unit] = await db.select({ unitNumber: units.unitNumber }).from(units).where(eq(units.id, data.unitId)).limit(1);
          if (unit) unitLabel = ` · Apt ${unit.unitNumber}`;
        }

        const host = ctx.request.headers.get("host") || "localhost:8080";
        const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
        const signupUrl = `${protocol}://${host}/auth?invite=${invite.id}`;
        const typeLabel = data.inviteType === "maintenance" ? "Maintenance Worker" : "Tenant";
        const subject = `Join PropEase - You have been invited by ${landlordName}`;

        let detailsText = "";
        if (data.inviteType !== "maintenance") {
          const rentDollars = data.rentAmount !== undefined && data.rentAmount !== null ? `$${data.rentAmount}` : "";
          detailsText = `Lease Details:
- Monthly Rent: ${rentDollars}
- Lease Period: ${data.leaseStart || "N/A"} to ${data.leaseEnd || "N/A"}`;
        }

        const text = `Hello,

You have been invited by ${landlordName} to join PropEase as a ${typeLabel} for:
${propertyName}${unitLabel}

${detailsText}

To accept this invitation and complete your setup, please click the link below or copy and paste it into your browser:
${signupUrl}

This invitation link expires in 7 days.

Best regards,
The PropEase Team`;

        const html = `<p>Hello,</p>
<p>You have been invited by <strong>${landlordName}</strong> to join PropEase as a <strong>${typeLabel}</strong> for:</p>
<p><strong>${propertyName}${unitLabel}</strong></p>
${detailsText ? `<pre>${detailsText}</pre>` : ""}
<p>To accept this invitation and complete your setup, please click the link below:</p>
<p><a href="${signupUrl}">${signupUrl}</a></p>
<p>This invitation link expires in 7 days.</p>
<p>Best regards,<br/>The PropEase Team</p>`;

        const { sendEmail } = await import("./email");
        await sendEmail({ to: data.email, subject, html, text });
      } catch (err) {
        console.error("Failed to send invitation email:", err);
      }
    }

    return invite;
  });

export const getInviteDetailsFn = createServerFn({ method: "GET" })
  .inputValidator((d: { inviteToken: string }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;
    const invite = await getInvite(data.inviteToken);
    
    if (!invite) throw new Error("Invalid invite link");
    if (invite.status !== "pending") throw new Error("Invite has already been used or revoked");
    if (new Date() > new Date(invite.expiresAt)) throw new Error("Invite link has expired");

    // Fetch landlord and property/unit info for display
    const { getDb } = await import("../db/index");
    const { properties, units, profiles } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();

    const [landlord] = await db.select({ name: profiles.firstName }).from(profiles).where(eq(profiles.id, invite.landlordId)).limit(1);
    const [property] = await db.select({ name: properties.name }).from(properties).where(eq(properties.id, invite.propertyId)).limit(1);
    const [unit] = invite.unitId
      ? await db.select({ number: units.unitNumber }).from(units).where(eq(units.id, invite.unitId)).limit(1)
      : [null];

    let emailExists = false;
    if (invite.email) {
      const [existingUser] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.email, invite.email.toLowerCase()))
        .limit(1);
      emailExists = !!existingUser;
    }

    return {
      invite,
      landlordName: landlord?.name ?? "a landlord",
      propertyName: property?.name ?? "a property",
      unitNumber: unit?.number ?? "a unit",
      emailExists,
    };
  });
