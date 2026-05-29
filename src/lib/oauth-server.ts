import { createServerFn } from "@tanstack/react-start";

const SESSION_COOKIE_NAME = "propease_session";
const STATE_COOKIE_NAME = "oauth_state";

/**
 * Retrieves the Google OAuth configuration dynamically from Cloudflare bindings or fallbacks.
 */
async function getGoogleConfig(): Promise<{ clientId?: string; clientSecret?: string }> {
  if (import.meta.env?.DEV) {
    try {
      const { getPlatformProxy } = await import("wrangler");
      const { env } = await getPlatformProxy();
      return {
        clientId: env.GOOGLE_CLIENT_ID as string | undefined,
        clientSecret: env.GOOGLE_CLIENT_SECRET as string | undefined,
      };
    } catch {
      // Fallback
    }
  }

  // Production env from request context
  let env: any = {};
  try {
    const { getCloudflareEnv } = await import("./cloudflare-env");
    env = getCloudflareEnv();
  } catch {
    // Ignore
  }

  const globalEnv = (typeof process !== "undefined" ? process.env : (globalThis as any)) || {};
  return {
    clientId: env.GOOGLE_CLIENT_ID || globalEnv.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET || globalEnv.GOOGLE_CLIENT_SECRET,
  };
}

/**
 * Generates the redirect URL to start the Google OAuth consent flow.
 */
export const getGoogleAuthUrlFn = createServerFn({ method: "POST" })
  .inputValidator((d: { inviteToken?: string }) => d)
  .handler(async (ctx: any) => {
    const { inviteToken } = ctx.data;
    const config = await getGoogleConfig();
    if (!config.clientId) {
      throw new Error("GOOGLE_CLIENT_ID is not configured on the server environment.");
    }

    const { setCookie } = await import("@tanstack/react-start/server");

    // Generate secure CSRF state
    const stateVal = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Store invite token in state metadata if present
    const statePayload = inviteToken ? `${stateVal}__invite_${inviteToken}` : stateVal;

    // Set state cookie
    setCookie(STATE_COOKIE_NAME, stateVal, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60, // 10 minutes
    });

    const host = ctx.request.headers.get("host") || "localhost:8080";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const redirectUri = `${protocol}://${host}/auth/oauth-callback`;

    const scopes = ["openid", "email", "profile"];
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      config.clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
      scopes.join(" ")
    )}&state=${encodeURIComponent(statePayload)}&prompt=select_account`;

    return { authUrl };
  });

/**
 * Exchanges the code parameter for tokens, registers new profiles, and signs the user in.
 */
export const verifyGoogleCallbackFn = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string; state: string }) => d)
  .handler(async (ctx: any) => {
    const { code, state } = ctx.data;
    const config = await getGoogleConfig();
    if (!config.clientId || !config.clientSecret) {
      throw new Error("Google OAuth configuration keys are missing on the server.");
    }

    const { getCookie, deleteCookie, setCookie } = await import("@tanstack/react-start/server");

    // 1. Verify CSRF State cookie
    const storedState = getCookie(STATE_COOKIE_NAME);
    deleteCookie(STATE_COOKIE_NAME, { path: "/" });

    // Parse state structure (stateVal__invite_TOKEN)
    const stateParts = state.split("__invite_");
    const passedStateVal = stateParts[0];
    const inviteToken = stateParts[1] || undefined;

    if (!storedState || storedState !== passedStateVal) {
      throw new Error("CSRF security check failed: Invalid or expired OAuth state parameter.");
    }

    const host = ctx.request.headers.get("host") || "localhost:8080";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const redirectUri = `${protocol}://${host}/auth/oauth-callback`;

    // 2. Exchange Authorization Code for Access & ID tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Google token exchange failed: ${tokenResponse.status} ${errText}`);
    }

    const tokens = (await tokenResponse.json()) as { id_token: string };
    
    // 3. Decode JWT ID Token payload (Google payload)
    const jwtParts = tokens.id_token.split(".");
    if (jwtParts.length !== 3) {
      throw new Error("Invalid JWT ID Token received from Google.");
    }
    
    let base64 = jwtParts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const decodedPayloadStr = atob(base64);
    const gUser = JSON.parse(decodedPayloadStr) as {
      email: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
      sub: string;
    };

    if (!gUser.email) {
      throw new Error("Google account did not return a valid email address.");
    }

    const email = gUser.email.toLowerCase();
    
    // Strict @gmail.com domain check as requested in guidelines
    if (!email.endsWith("@gmail.com")) {
      throw new Error("Currently, we only accept @gmail.com email addresses.");
    }

    // 4. Authenticate or Provision User in Database
    const { getProfileByEmail, createProfile, getProfileById } = await import("../db/queries");
    const { getDb } = await import("../db/index");
    const { processAcceptedInvite } = await import("./auth-server");
    const { signSession } = await import("./auth-crypto");

    let profile = await getProfileByEmail(email);
    const db = await getDb();

    if (!profile) {
      // Create a new user profile
      const id = crypto.randomUUID();
      
      // Determine default role: If invited, set role based on invitation; else default to landlord
      let defaultRole: "landlord" | "tenant" | "maintenance" = "landlord";
      if (inviteToken) {
        const { getInvite } = await import("../db/queries");
        const invite = await getInvite(inviteToken);
        if (invite) {
          defaultRole = invite.inviteType === "maintenance" ? "maintenance" : "tenant";
        }
      }

      profile = await createProfile({
        id,
        email,
        passwordHash: "google_oauth_bypass",
        firstName: gUser.given_name || "Google",
        lastName: gUser.family_name || "User",
        role: defaultRole,
        onboardingCompleted: false,
      });
    }

    // 5. Accept invitations if inviteToken is present
    if (inviteToken) {
      await processAcceptedInvite(db, profile.id, profile.role, inviteToken);
    }

    // Fetch latest profile state (in case role was updated by invitation processing)
    const finalProfile = await getProfileById(profile.id) || profile;

    // 6. Generate session JWT
    const sessionToken = await signSession({
      id: finalProfile.id,
      email: finalProfile.email,
      role: finalProfile.role,
    });

    // 7. Write HTTP-Only Session cookie
    setCookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return {
      success: true,
      profile: {
        id: finalProfile.id,
        email: finalProfile.email,
        role: finalProfile.role,
      },
    };
  });
