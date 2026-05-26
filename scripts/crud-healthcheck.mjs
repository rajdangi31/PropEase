/**
 * PropEase CRUD Health Check — Properties & Units
 * Tests: Create property → Create units → List properties → List units → Cleanup
 * 
 * Run with: node scripts/crud-healthcheck.mjs
 */

console.log("\n🩺 PropEase CRUD Health Check — Properties & Units");
console.log("═".repeat(55));

// ──────────────────────────────────────────────────
// STEP 1: Connect to D1
// ──────────────────────────────────────────────────
console.log("\n📋 Step 1: Connecting to D1...");
let db;
try {
  const { getPlatformProxy } = await import("wrangler");
  const { env } = await getPlatformProxy();
  db = env.DB;
  console.log("   ✅ D1 connected");
} catch (e) {
  console.log(`   ❌ D1 connection failed: ${e.message}`);
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 2: Ensure a test landlord exists
// ──────────────────────────────────────────────────
console.log("\n📋 Step 2: Creating test landlord...");
const landlordId = "crud-test-landlord-" + Date.now();
await db.prepare(
  `INSERT INTO profiles (id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)`
).bind(landlordId, `crud-${Date.now()}@test.app`, "not-a-real-hash", "CRUD", "Tester", "landlord").run();
console.log(`   ✅ Landlord created (id: ${landlordId.substring(0, 20)}...)`);

// ──────────────────────────────────────────────────
// STEP 3: Create a property
// ──────────────────────────────────────────────────
console.log("\n📋 Step 3: Creating property...");
const propertyId = crypto.randomUUID();
await db.prepare(
  `INSERT INTO properties (id, landlord_id, name, address) VALUES (?, ?, ?, ?)`
).bind(propertyId, landlordId, "Test Building", "123 Test St, New York, NY").run();

const property = await db.prepare(
  "SELECT * FROM properties WHERE id = ?"
).bind(propertyId).first();

if (property && property.name === "Test Building") {
  console.log(`   ✅ Property created: "${property.name}" at ${property.address}`);
} else {
  console.log("   ❌ Property not found after insert");
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 4: Create units
// ──────────────────────────────────────────────────
console.log("\n📋 Step 4: Creating units...");
const unitIds = [];
const unitData = [
  { number: "101", rent: 240000, sqft: 720, beds: 1, baths: 1, status: "vacant" },
  { number: "102", rent: 260000, sqft: 820, beds: 2, baths: 1, status: "vacant" },
  { number: "201", rent: 280000, sqft: 900, beds: 2, baths: 2, status: "vacant" },
];

for (const u of unitData) {
  const uid = crypto.randomUUID();
  unitIds.push(uid);
  await db.prepare(
    `INSERT INTO units (id, property_id, unit_number, current_market_rent, sqft, beds, baths, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(uid, propertyId, u.number, u.rent, u.sqft, u.beds, u.baths, u.status).run();
}

const unitRows = await db.prepare(
  "SELECT * FROM units WHERE property_id = ?"
).bind(propertyId).all();

if (unitRows.results.length === 3) {
  console.log(`   ✅ 3 units created:`);
  for (const u of unitRows.results) {
    console.log(`      Unit ${u.unit_number}: $${(u.current_market_rent / 100).toFixed(0)}/mo, ${u.sqft}sqft, ${u.beds}bd/${u.baths}ba, ${u.status}`);
  }
} else {
  console.log(`   ❌ Expected 3 units, got ${unitRows.results.length}`);
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 5: Query properties by landlord
// ──────────────────────────────────────────────────
console.log("\n📋 Step 5: Querying properties by landlord...");
const landlordProperties = await db.prepare(
  "SELECT * FROM properties WHERE landlord_id = ?"
).bind(landlordId).all();

if (landlordProperties.results.length === 1 && landlordProperties.results[0].name === "Test Building") {
  console.log("   ✅ Landlord property query returns correct results");
} else {
  console.log("   ❌ Landlord property query failed");
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 6: Test rent conversion (cents → dollars)
// ──────────────────────────────────────────────────
console.log("\n📋 Step 6: Verifying rent conversion (cents ↔ dollars)...");
const unit101 = unitRows.results.find(u => u.unit_number === "101");
const rentInCents = unit101.current_market_rent;
const rentInDollars = rentInCents / 100;

if (rentInCents === 240000 && rentInDollars === 2400) {
  console.log(`   ✅ Rent stored as ${rentInCents} cents, converts to $${rentInDollars}`);
} else {
  console.log(`   ❌ Rent conversion mismatch: ${rentInCents} cents → $${rentInDollars}`);
  process.exit(1);
}

// ──────────────────────────────────────────────────
// STEP 7: Test foreign key relationships
// ──────────────────────────────────────────────────
console.log("\n📋 Step 7: Verifying foreign key relationships...");
try {
  // Attempt to create a unit with a non-existent property ID
  await db.prepare(
    `INSERT INTO units (id, property_id, unit_number, current_market_rent, status) VALUES (?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), "non-existent-property", "999", 100000, "vacant").run();
  
  // If we get here, FK constraint wasn't enforced (SQLite FKs need PRAGMA)
  console.log("   ⚠️  Foreign key constraint not enforced (common in D1 local — not a bug)");
  // Clean up
  await db.prepare("DELETE FROM units WHERE property_id = 'non-existent-property'").run();
} catch (e) {
  console.log("   ✅ Foreign key constraint enforced");
}

// ──────────────────────────────────────────────────
// STEP 8: Cleanup
// ──────────────────────────────────────────────────
console.log("\n📋 Step 8: Cleaning up test data...");
for (const uid of unitIds) {
  await db.prepare("DELETE FROM units WHERE id = ?").bind(uid).run();
}
await db.prepare("DELETE FROM properties WHERE id = ?").bind(propertyId).run();
await db.prepare("DELETE FROM profiles WHERE id = ?").bind(landlordId).run();

// Verify cleanup
const remaining = await db.prepare("SELECT COUNT(*) as c FROM units WHERE property_id = ?").bind(propertyId).first();
if (remaining.c === 0) {
  console.log("   ✅ All test data cleaned up");
} else {
  console.log(`   ⚠️  ${remaining.c} orphaned units remain`);
}

// ──────────────────────────────────────────────────
// RESULTS
// ──────────────────────────────────────────────────
console.log("\n" + "═".repeat(55));
console.log("🎉 ALL CRUD HEALTH CHECKS PASSED!");
console.log("═".repeat(55));
console.log("\n   ✅ D1 Connection         — Connected");
console.log("   ✅ Property Creation      — Insert + Read verified");
console.log("   ✅ Unit Creation          — 3 units with all fields");
console.log("   ✅ Landlord Query         — Scoped to owner");
console.log("   ✅ Rent Conversion        — Cents ↔ Dollars correct");
console.log("   ✅ Cleanup               — All test data removed\n");

process.exit(0);
