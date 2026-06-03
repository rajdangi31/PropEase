// We use PBKDF2 with HMAC-SHA-256 and 100,000 iterations for password hashing
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;

/**
 * Retrieves the JWT Secret dynamically based on the execution context.
 */
async function getJwtSecret(): Promise<string> {
  if (import.meta.env?.DEV) {
    try {
      const { getPlatformProxy } = await import("wrangler");
      const { env } = await getPlatformProxy();
      if (env.JWT_SECRET) return env.JWT_SECRET as string;
    } catch {
      // Fallback if proxy retrieval fails
    }
    throw new Error("JWT_SECRET is not configured in the environment.");
  }

  // Retrieve Cloudflare env bindings from the custom server entry context or fallbacks
  let env: any = {};
  try {
    const { getCloudflareEnv } = await import("./cloudflare-env");
    env = getCloudflareEnv();
  } catch (error) {
    // Ignore error if server entry cannot be imported
  }

  // Fallback to H3 event storage if server context doesn't contain JWT_SECRET
  if (!env.JWT_SECRET) {
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
      // Ignore error if outside request lifecycle
    }
  }

  const secret =
    env.JWT_SECRET ||
    (typeof process !== "undefined" ? process.env.JWT_SECRET : (globalThis as any)?.JWT_SECRET);
  if (!secret) {
    throw new Error("JWT_SECRET is not configured in the environment.");
  }
  return secret;
}

/**
 * Generates a cryptographically secure random salt
 */
function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hashes a password using PBKDF2 with HMAC-SHA-256
 */
export async function hashPassword(password: string, providedSalt?: string): Promise<string> {
  const saltHex = providedSalt || generateSalt();

  // Convert hex salt back to Uint8Array
  const saltArray = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltArray,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Store in format: $pbkdf2-sha256$iterations$salt$hash
  return `$pbkdf2-sha256$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

/**
 * Verifies a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 5 || parts[1] !== "pbkdf2-sha256") {
    return false;
  }

  const salt = parts[3];
  const reHashed = await hashPassword(password, salt);
  return reHashed === storedHash;
}

/**
 * JWT Implementation
 */
function base64urlEncode(buf: ArrayBuffer | Uint8Array | string): string {
  let str = "";
  if (typeof buf === "string") {
    str = buf;
  } else {
    str = String.fromCharCode(...new Uint8Array(buf));
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getJwtKey(): Promise<CryptoKey> {
  const secret = await getJwtSecret();
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export type SessionPayload = {
  id: string; // Profile ID
  email: string;
  role: string;
  exp: number; // Expiry timestamp
};

/**
 * Signs a session payload into a JWT
 */
export async function signSession(
  payload: Omit<SessionPayload, "exp">,
  expiresInDays = 7,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };

  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const fullPayload: SessionPayload = { ...payload, exp };

  const enc = new TextEncoder();
  const encodedHeader = base64urlEncode(enc.encode(JSON.stringify(header)));
  const encodedPayload = base64urlEncode(enc.encode(JSON.stringify(fullPayload)));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getJwtKey();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(dataToSign));
  const signature = base64urlEncode(signatureBuffer);

  return `${dataToSign}.${signature}`;
}

/**
 * Verifies and decodes a session JWT
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const key = await getJwtKey();
    const enc = new TextEncoder();

    // Decode Base64URL signature back to Uint8Array
    const sigStr = atob(signature.replace(/-/g, "+").replace(/_/g, "/"));
    const sigBytes = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) {
      sigBytes[i] = sigStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(dataToSign));
    if (!isValid) return null;

    const payloadStr = atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadStr) as SessionPayload;

    if (Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}
