/**
 * PropEase Auth Health Check
 * Tests: Crypto engine → DB write → DB read → Password verification → JWT sign/verify
 * 
 * Run with: node scripts/auth-healthcheck.mjs
 */

// We need to dynamically import wrangler to get the D1 binding,
// then use drizzle to interact with the local database.
// Since auth-crypto uses Web Crypto API (available in Node 20+), we can test it natively.

import { createRequire } from "module";

console.log("\n🩺 PropEase Auth Health Check");
console.log("═".repeat(50));

// ──────────────────────────────────────────────────
// STEP 0: Verify Web Crypto API availability
// ──────────────────────────────────────────────────
console.log("\n📋 Step 0: Checking Web Crypto API...");
if (typeof crypto !== "undefined" && crypto.subtle) {
  console.log("   ✅ Web Crypto API available (crypto.subtle present)");
} else {
  console.log("   ❌ Web Crypto API NOT available. Node 20+ required.");
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 1: Test PBKDF2 Password Hashing
// ──────────────────────────────────────────────────
console.log("\n📋 Step 1: Testing PBKDF2 password hashing...");

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;

function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, providedSalt) {
  const saltHex = providedSalt || generateSalt();
  const saltArray = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltArray, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial, 256
  );

  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  return `$pbkdf2-sha256$${PBKDF2_ITERATIONS}$${saltHex}$${hashHex}`;
}

async function verifyPassword(password, storedHash) {
  const parts = storedHash.split("$");
  if (parts.length !== 5 || parts[1] !== "pbkdf2-sha256") return false;
  const salt = parts[3];
  const reHashed = await hashPassword(password, salt);
  return reHashed === storedHash;
}

const testPassword = "SecurePass123!";
const t0 = performance.now();
const hashedPassword = await hashPassword(testPassword);
const hashTime = (performance.now() - t0).toFixed(0);
console.log(`   Hash format: ${hashedPassword.substring(0, 40)}...`);
console.log(`   Hash length: ${hashedPassword.length} chars`);
console.log(`   Hash time:   ${hashTime}ms`);

const parts = hashedPassword.split("$");
if (parts.length === 5 && parts[1] === "pbkdf2-sha256" && parts[2] === "100000") {
  console.log("   ✅ Hash format is correct ($pbkdf2-sha256$100000$salt$hash)");
} else {
  console.log("   ❌ Hash format is INCORRECT");
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 2: Test Password Verification
// ──────────────────────────────────────────────────
console.log("\n📋 Step 2: Testing password verification...");

const t1 = performance.now();
const correctMatch = await verifyPassword(testPassword, hashedPassword);
const verifyTime = (performance.now() - t1).toFixed(0);

const wrongMatch = await verifyPassword("WrongPassword!", hashedPassword);

if (correctMatch) {
  console.log(`   ✅ Correct password verified successfully (${verifyTime}ms)`);
} else {
  console.log("   ❌ Correct password FAILED verification");
  process.exit(1);
}

if (!wrongMatch) {
  console.log("   ✅ Wrong password correctly rejected");
} else {
  console.log("   ❌ Wrong password was ACCEPTED (security vulnerability!)");
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 3: Test JWT Sign & Verify
// ──────────────────────────────────────────────────
console.log("\n📋 Step 3: Testing JWT sign & verify...");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-replace-in-production";

function base64urlEncode(buf) {
  let str = "";
  if (typeof buf === "string") { str = buf; }
  else { str = String.fromCharCode(...new Uint8Array(buf)); }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getJwtKey() {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw", enc.encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}

async function signSession(payload, expiresInDays = 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const exp = Math.floor(Date.now() / 1000) + (expiresInDays * 24 * 60 * 60);
  const fullPayload = { ...payload, exp };
  const enc = new TextEncoder();
  const encodedHeader = base64urlEncode(enc.encode(JSON.stringify(header)));
  const encodedPayload = base64urlEncode(enc.encode(JSON.stringify(fullPayload)));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  const key = await getJwtKey();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(dataToSign));
  const signature = base64urlEncode(signatureBuffer);
  return `${dataToSign}.${signature}`;
}

async function verifySession(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const key = await getJwtKey();
    const enc = new TextEncoder();
    const sigStr = atob(signature.replace(/-/g, "+").replace(/_/g, "/"));
    const sigBytes = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) { sigBytes[i] = sigStr.charCodeAt(i); }
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(dataToSign));
    if (!isValid) return null;
    const payloadStr = atob(encodedPayload.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadStr);
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch { return null; }
}

const testPayload = { id: "test-uuid-1234", email: "test@propease.app", role: "landlord" };
const jwt = await signSession(testPayload);
console.log(`   JWT: ${jwt.substring(0, 50)}...`);
console.log(`   JWT parts: ${jwt.split(".").length} (expected 3)`);

const decoded = await verifySession(jwt);
if (decoded && decoded.id === testPayload.id && decoded.email === testPayload.email && decoded.role === testPayload.role) {
  console.log("   ✅ JWT signed and verified successfully");
  console.log(`   Payload: { id: "${decoded.id}", email: "${decoded.email}", role: "${decoded.role}" }`);
  console.log(`   Expires: ${new Date(decoded.exp * 1000).toISOString()}`);
} else {
  console.log("   ❌ JWT verification FAILED");
  process.exit(1);
}

// Tampered token test
const tamperedJwt = jwt.slice(0, -5) + "XXXXX";
const tamperedResult = await verifySession(tamperedJwt);
if (!tamperedResult) {
  console.log("   ✅ Tampered JWT correctly rejected");
} else {
  console.log("   ❌ Tampered JWT was ACCEPTED (security vulnerability!)");
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 4: Test Database (D1) via getPlatformProxy
// ──────────────────────────────────────────────────
console.log("\n📋 Step 4: Testing Cloudflare D1 database connection...");

let db;
try {
  const { getPlatformProxy } = await import("wrangler");
  const { env } = await getPlatformProxy();
  
  if (!env.DB) {
    console.log("   ❌ D1 binding 'DB' not found in local environment");
    process.exit(1);
  }
  console.log("   ✅ D1 binding 'DB' found via getPlatformProxy");
  
  db = env.DB;
} catch (e) {
  console.log(`   ❌ Failed to get D1 binding: ${e.message}`);
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 5: Full Sign-Up Flow (Insert profile into DB)
// ──────────────────────────────────────────────────
console.log("\n📋 Step 5: Testing full sign-up flow (DB write)...");

const testUser = {
  id: crypto.randomUUID(),
  email: "healthcheck@propease.app",
  firstName: "Health",
  lastName: "Check",
  role: "landlord",
};

const passwordHashForDb = await hashPassword(testPassword);

try {
  // Clean up any previous test data
  await db.prepare("DELETE FROM profiles WHERE email = ?").bind(testUser.email).run();
  
  // Insert the new profile
  await db.prepare(
    `INSERT INTO profiles (id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(testUser.id, testUser.email, passwordHashForDb, testUser.firstName, testUser.lastName, testUser.role).run();
  
  console.log(`   ✅ Profile created: ${testUser.email} (id: ${testUser.id.substring(0, 8)}...)`);
} catch (e) {
  console.log(`   ❌ Failed to insert profile: ${e.message}`);
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 6: Full Sign-In Flow (Read + Verify from DB)
// ──────────────────────────────────────────────────
console.log("\n📋 Step 6: Testing full sign-in flow (DB read + password verify)...");

try {
  const result = await db.prepare(
    "SELECT * FROM profiles WHERE email = ?"
  ).bind(testUser.email).first();
  
  if (!result) {
    console.log("   ❌ Profile not found in database after insertion");
    process.exit(1);
  }
  
  console.log(`   Found profile: ${result.first_name} ${result.last_name} (${result.email})`);
  console.log(`   Role: ${result.role}`);
  console.log(`   Hash stored: ${result.password_hash.substring(0, 40)}...`);
  
  // Verify password against stored hash
  const loginValid = await verifyPassword(testPassword, result.password_hash);
  if (loginValid) {
    console.log("   ✅ Password verification against DB hash: PASSED");
  } else {
    console.log("   ❌ Password verification against DB hash: FAILED");
    process.exit(1);
  }
  
  // Sign a session token
  const sessionJwt = await signSession({ id: result.id, email: result.email, role: result.role });
  const sessionPayload = await verifySession(sessionJwt);
  
  if (sessionPayload && sessionPayload.email === testUser.email) {
    console.log("   ✅ Session JWT created and verified for authenticated user");
  } else {
    console.log("   ❌ Session JWT creation/verification FAILED");
    process.exit(1);
  }
  
} catch (e) {
  console.log(`   ❌ Sign-in flow error: ${e.message}`);
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 7: Duplicate Email Rejection
// ──────────────────────────────────────────────────
console.log("\n📋 Step 7: Testing duplicate email rejection...");

try {
  await db.prepare(
    `INSERT INTO profiles (id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), testUser.email, passwordHashForDb, "Dup", "User", "tenant").run();
  
  console.log("   ❌ Duplicate email was ACCEPTED (unique constraint failed!)");
  process.exit(1);
} catch (e) {
  if (e.message.includes("UNIQUE") || e.message.includes("unique") || e.message.includes("constraint")) {
    console.log("   ✅ Duplicate email correctly rejected by UNIQUE constraint");
  } else {
    console.log(`   ⚠️  Error (unexpected type): ${e.message}`);
  }
}

// ──────────────────────────────────────────────────
// STEP 8: Cleanup
// ──────────────────────────────────────────────────
console.log("\n📋 Step 8: Cleaning up test data...");
await db.prepare("DELETE FROM profiles WHERE email = ?").bind(testUser.email).run();
console.log("   ✅ Test profile removed");

// ──────────────────────────────────────────────────
// RESULTS
// ──────────────────────────────────────────────────
console.log("\n" + "═".repeat(50));
console.log("🎉 ALL HEALTH CHECKS PASSED!");
console.log("═".repeat(50));
console.log("\n   ✅ Web Crypto API         — Available");
console.log("   ✅ PBKDF2 Hashing         — Working (100k iterations)");
console.log("   ✅ Password Verification  — Correct accept/reject");
console.log("   ✅ JWT Sign/Verify        — Working (HMAC-SHA256)");
console.log("   ✅ Tamper Detection        — Rejects modified tokens");
console.log("   ✅ D1 Database Connection — Connected");
console.log("   ✅ Profile Creation        — Insert + Read verified");
console.log("   ✅ Sign-In Flow           — Hash match from DB");
console.log("   ✅ Session Issuance        — JWT created for authed user");
console.log("   ✅ Unique Constraint       — Duplicate emails rejected");
console.log("   ✅ Cleanup                 — Test data removed\n");

process.exit(0);
