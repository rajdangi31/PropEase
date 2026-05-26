import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { hashPassword, verifyPassword, signSession, verifySession } from "./auth-crypto";
import { createProfile, getProfileByEmail, getProfileById, updateProfile } from "../db/queries";

const SESSION_COOKIE_NAME = "propease_session";

export const requestSignUpOtpFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; firstName: string; lastName: string; role: string; inviteToken?: string }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;
    
    if (!data.email.toLowerCase().endsWith("@gmail.com")) {
      throw new Error("Currently, we only accept @gmail.com email addresses.");
    }

    const existing = await getProfileByEmail(data.email);
    if (existing) {
      throw new Error("Email already in use");
    }

    const passwordHash = await hashPassword(data.password);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const signupData = JSON.stringify({
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      inviteToken: data.inviteToken,
    });

    const { getDb } = await import("../db/index");
    const { verificationCodes } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();

    // Clean up old codes for this email
    await db.delete(verificationCodes).where(eq(verificationCodes.email, data.email.toLowerCase()));

    // Insert new code
    await db.insert(verificationCodes).values({
      email: data.email.toLowerCase(),
      code,
      expiresAt,
      signupData,
    });

    console.log(`
==================================================
[PROP-EASE EMAIL VERIFICATION]
Verification Code for: ${data.email}
Code: ${code}
Expires At: ${expiresAt}
==================================================
    `);

    return { success: true };
  });

export const verifyOtpAndSignUpFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; code: string }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;

    const { getDb } = await import("../db/index");
    const { verificationCodes } = await import("../db/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();

    const [record] = await db
      .select()
      .from(verificationCodes)
      .where(eq(verificationCodes.email, data.email.toLowerCase()))
      .limit(1);

    if (!record) {
      throw new Error("No verification pending or code expired.");
    }

    if (record.code !== data.code && !(import.meta.env.DEV && data.code === "000000")) {
      throw new Error("Invalid verification code.");
    }

    if (new Date() > new Date(record.expiresAt)) {
      await db.delete(verificationCodes).where(eq(verificationCodes.email, data.email.toLowerCase()));
      throw new Error("Verification code has expired.");
    }

    const payload = JSON.parse(record.signupData);
    const id = crypto.randomUUID();

    const profile = await createProfile({
      id,
      email: data.email.toLowerCase(),
      passwordHash: payload.passwordHash,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role as any,
    });

    if (payload.inviteToken) {
      const { getInvite, acceptInvite } = await import("../db/queries");
      const { leases, leaseTenants, units, payments, propertyWorkers } = await import("../db/schema");
      
      const invite = await getInvite(payload.inviteToken);
      if (invite && invite.status === "pending" && new Date() <= new Date(invite.expiresAt)) {
        if (invite.inviteType === "maintenance") {
          await db.insert(propertyWorkers).values({
            propertyId: invite.propertyId,
            profileId: profile.id,
          });
          await acceptInvite(invite.id);
        } else {
          const leaseId = crypto.randomUUID();
          await db.insert(leases).values({
            id: leaseId,
            unitId: invite.unitId!,
            startDate: invite.leaseStart!,
            endDate: invite.leaseEnd!,
            monthlyRent: invite.rentAmount!,
            securityDeposit: 0,
            status: "active",
          });
          
          await db.insert(leaseTenants).values({
            leaseId,
            profileId: profile.id,
            isPrimary: true,
          });

          // Insert first month's pending rent invoice
          await db.insert(payments).values({
            id: crypto.randomUUID(),
            leaseId,
            tenantId: profile.id,
            amount: invite.rentAmount!,
            category: "rent",
            dueDate: invite.leaseStart!,
            status: "pending",
          });
          
          // Mark unit as occupied
          await db.update(units).set({ status: "occupied" }).where(eq(units.id, invite.unitId!));
          
          await acceptInvite(invite.id);
        }
      }
    }

    // Clean up used code
    await db.delete(verificationCodes).where(eq(verificationCodes.email, data.email.toLowerCase()));

    const sessionToken = await signSession({
      id: profile.id,
      email: profile.email,
      role: profile.role,
    });

    setCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return { success: true, profile: { id: profile.id, email: profile.email, role: profile.role } };
  });

export const signInFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;
    const profile = await getProfileByEmail(data.email);
    if (!profile) {
      throw new Error("Invalid credentials");
    }

    const isValid = await verifyPassword(data.password, profile.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const sessionToken = await signSession({
      id: profile.id,
      email: profile.email,
      role: profile.role,
    });

    setCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return { success: true, profile: { id: profile.id, email: profile.email, role: profile.role } };
  });

export const signOutFn = createServerFn({ method: "POST" })
  .handler(async () => {
    deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
    return { success: true };
  });

export const getMeFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) return null;

    const session = await verifySession(token);
    if (!session) return null;

    const profile = await getProfileById(session.id);
    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      middleName: profile.middleName,
      phone: profile.phone,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
    };
  });

export const updateProfileFn = createServerFn({ method: "POST" })
  .inputValidator((d: { firstName: string; lastName: string; middleName?: string; phone?: string }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) throw new Error("Not authenticated");

    const session = await verifySession(token);
    if (!session) throw new Error("Invalid session");

    const profile = await updateProfile(session.id, {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      phone: data.phone || null,
    });

    return {
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        middleName: profile.middleName,
        phone: profile.phone,
        role: profile.role,
        avatarUrl: profile.avatarUrl,
      }
    };
  });
