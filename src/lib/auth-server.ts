import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

const SESSION_COOKIE_NAME = "propease_session";

export const requestSignUpOtpFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; firstName: string; lastName: string; role: string; inviteToken?: string }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;
    
    if (!data.email.toLowerCase().endsWith("@gmail.com")) {
      throw new Error("Currently, we only accept @gmail.com email addresses.");
    }

    const { getProfileByEmail } = await import("../db/queries");
    const existing = await getProfileByEmail(data.email);
    if (existing) {
      throw new Error("Email already in use");
    }

    const { hashPassword } = await import("./auth-crypto");
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

    // Dispatch real email (uses Resend in production, console panel fallback in dev)
    try {
      const { sendEmail } = await import("./email");
      const subject = "Verify your email address - PropEase";
      const text = `Welcome to PropEase! Use the verification code below to verify your email address and complete your signup.

Verification Code: ${code}

This code will expire in 15 minutes.`;

      const html = `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <h2 style="color: #4f46e5; margin-top: 0;">Welcome to PropEase</h2>
  <p style="color: #334155; font-size: 15px; line-height: 1.5;">Use the verification code below to verify your email address and complete your account creation.</p>
  <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 16px; text-align: center; margin: 24px 0;">
    <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0f172a;">${code}</span>
  </div>
  <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 0;">This code will expire in 15 minutes. If you did not request this code, you can safely ignore this email.</p>
</div>`;

      await sendEmail({ to: data.email.toLowerCase(), subject, html, text });
    } catch (err) {
      console.error("Failed to dispatch OTP verification email:", err);
    }

    return { success: true };
  });

export async function processAcceptedInvite(db: any, profileId: string, profileRole: string, inviteToken: string) {
  const { getInvite, acceptInvite, updateProfile } = await import("../db/queries");
  const { leases, leaseTenants, units, propertyWorkers } = await import("../db/schema");
  const { eq, and } = await import("drizzle-orm");

  const invite = await getInvite(inviteToken);
  if (invite && invite.status === "pending" && new Date() <= new Date(invite.expiresAt)) {
    const expectedRole = invite.inviteType === "maintenance" ? "maintenance" : "tenant";
    if (profileRole !== expectedRole) {
      await updateProfile(profileId, { role: expectedRole as any });
    }

    if (invite.inviteType === "maintenance") {
      const [existingWorker] = await db
        .select()
        .from(propertyWorkers)
        .where(and(eq(propertyWorkers.propertyId, invite.propertyId), eq(propertyWorkers.profileId, profileId)))
        .limit(1);
      if (!existingWorker) {
        await db.insert(propertyWorkers).values({
          propertyId: invite.propertyId,
          profileId: profileId,
        });
      }
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
        profileId: profileId,
        isPrimary: true,
      });

      // Mark unit as occupied
      await db.update(units).set({ status: "occupied" }).where(eq(units.id, invite.unitId!));
      
      await acceptInvite(invite.id);
    }
  }
}

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

    const { createProfile } = await import("../db/queries");
    const profile = await createProfile({
      id,
      email: data.email.toLowerCase(),
      passwordHash: payload.passwordHash,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role as any,
    });

    if (payload.inviteToken) {
      await processAcceptedInvite(db, profile.id, profile.role, payload.inviteToken);
    }

    // Clean up used code
    await db.delete(verificationCodes).where(eq(verificationCodes.email, data.email.toLowerCase()));

    // Since profile role might have changed, fetch the latest profile
    const { getProfileById } = await import("../db/queries");
    const finalProfile = await getProfileById(profile.id) || profile;

    const { signSession } = await import("./auth-crypto");
    const sessionToken = await signSession({
      id: finalProfile.id,
      email: finalProfile.email,
      role: finalProfile.role,
    });

    setCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return { success: true, profile: { id: finalProfile.id, email: finalProfile.email, role: finalProfile.role } };
  });

export const signInFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string; inviteToken?: string }) => d)
  .handler(async (ctx: any) => {
    const data = ctx.data;
    const { getProfileByEmail } = await import("../db/queries");
    const profile = await getProfileByEmail(data.email);
    if (!profile) {
      throw new Error("Invalid credentials");
    }

    const { verifyPassword } = await import("./auth-crypto");
    const isValid = await verifyPassword(data.password, profile.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const { getDb } = await import("../db/index");
    const db = await getDb();

    if (data.inviteToken) {
      await processAcceptedInvite(db, profile.id, profile.role, data.inviteToken);
    }

    // Since profile role might have changed, fetch the latest profile
    const { getProfileById } = await import("../db/queries");
    const finalProfile = await getProfileById(profile.id) || profile;

    const { signSession } = await import("./auth-crypto");
    const sessionToken = await signSession({
      id: finalProfile.id,
      email: finalProfile.email,
      role: finalProfile.role,
    });

    setCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return { success: true, profile: { id: finalProfile.id, email: finalProfile.email, role: finalProfile.role } };
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

    const { verifySession } = await import("./auth-crypto");
    const session = await verifySession(token);
    if (!session) return null;

    const { getProfileById } = await import("../db/queries");
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

    const { verifySession } = await import("./auth-crypto");
    const session = await verifySession(token);
    if (!session) throw new Error("Invalid session");

    const { updateProfile } = await import("../db/queries");
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
