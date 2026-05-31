import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";

/**
 * 1. IDENTITY & PROFILES
 * Stores core user information and role-based access levels.
 */
export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(), // Matches Auth Provider ID (UUID)
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"),
  phone: text("phone"),
  role: text("role", { 
    enum: ["landlord", "tenant", "admin", "manager", "maintenance", "service"] 
  }).notNull(),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).default(false),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 2. PROPERTIES & UNITS
 */
export const properties = sqliteTable("properties", {
  id: text("id").primaryKey(),
  landlordId: text("landlord_id").notNull().references(() => profiles.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  city: text("city"),
  locality: text("locality"),
  description: text("description"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  cityIdx: index("city_idx").on(table.city),
  localityIdx: index("locality_idx").on(table.locality),
}));

export const units = sqliteTable("units", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  unitNumber: text("unit_number").notNull(),
  status: text("status", { 
    enum: ["vacant", "occupied", "maintenance"] 
  }).notNull().default("vacant"),
  currentMarketRent: integer("current_market_rent").notNull(), // In cents
  sqft: integer("sqft"),
  beds: integer("beds"),
  baths: integer("baths"),
  occupantsLimit: integer("occupants_limit"),
  furnishedStatus: text("furnished_status", { 
    enum: ["unfurnished", "semi-furnished", "fully-furnished"] 
  }).default("unfurnished"),
  amenities: text("amenities"), // JSON array of strings
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  statusIdx: index("status_idx").on(table.status),
  rentIdx: index("rent_idx").on(table.currentMarketRent),
  bedsIdx: index("beds_idx").on(table.beds),
}));

/**
 * 3. LEASES & TENANCY
 */
export const leases = sqliteTable("leases", {
  id: text("id").primaryKey(),
  unitId: text("unit_id").notNull().references(() => units.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  monthlyRent: integer("monthly_rent").notNull(), // In cents
  securityDeposit: integer("security_deposit").notNull(), // In cents
  status: text("status", { 
    enum: ["draft", "active", "expired", "terminated"] 
  }).notNull().default("draft"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const leaseTenants = sqliteTable("lease_tenants", {
  leaseId: text("lease_id").notNull().references(() => leases.id),
  profileId: text("profile_id").notNull().references(() => profiles.id),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.leaseId, table.profileId] }),
}));

/**
 * 4. OPERATIONS (MAINTENANCE & PAYMENTS)
 */
export const maintenanceRequests = sqliteTable("maintenance_requests", {
  id: text("id").primaryKey(),
  unitId: text("unit_id").notNull().references(() => units.id),
  tenantId: text("tenant_id").notNull().references(() => profiles.id),
  assignedWorkerId: text("assigned_worker_id").references(() => profiles.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority", { 
    enum: ["low", "medium", "high", "emergency"] 
  }).notNull().default("medium"),
  status: text("status", { 
    enum: ["pending", "in_progress", "resolved_pending", "resolved"] 
  }).notNull().default("pending"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const maintenanceLogs = sqliteTable("maintenance_logs", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull().references(() => maintenanceRequests.id),
  authorId: text("author_id").notNull().references(() => profiles.id),
  content: text("content").notNull(),
  isInternal: integer("is_internal", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  leaseId: text("lease_id").notNull().references(() => leases.id),
  tenantId: text("tenant_id").notNull().references(() => profiles.id),
  amount: integer("amount").notNull(), // In cents
  category: text("category", { 
    enum: ["rent", "deposit", "utility", "late_fee"] 
  }).notNull(),
  dueDate: text("due_date").notNull(),
  paidDate: text("paid_date"),
  status: text("status", { 
    enum: ["pending", "paid", "late", "failed"] 
  }).notNull().default("pending"),
  transactionId: text("transaction_id"), // Stripe/External reference
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 5. SYSTEM COMMUNICATIONS & AUDITING
 */
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  recipientId: text("recipient_id").notNull().references(() => profiles.id),
  type: text("type", { 
    enum: ["payment", "maintenance", "announcement"] 
  }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull().references(() => profiles.id),
  actionType: text("action_type").notNull(), // e.g., PAYMENT_RECEIVED
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON object
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 6. DOCUMENT MANAGEMENT
 */
export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  leaseId: text("lease_id").references(() => leases.id),
  tenantId: text("tenant_id").references(() => profiles.id),
  propertyId: text("property_id").references(() => properties.id),
  name: text("name").notNull(),
  storagePath: text("storage_path").notNull(), // Cloudflare R2 Key
  uploadedBy: text("uploaded_by").notNull().references(() => profiles.id),
  type: text("type", { 
    enum: ["lease_doc", "id_proof", "income_proof", "inspection_report"] 
  }).notNull(),
  status: text("status", { 
    enum: ["pending_review", "approved", "rejected"] 
  }).notNull().default("pending_review"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 7. ONBOARDING & INVITATIONS
 */
export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey(), // The invite token
  landlordId: text("landlord_id").notNull().references(() => profiles.id),
  propertyId: text("property_id").notNull().references(() => properties.id),
  unitId: text("unit_id").references(() => units.id),
  email: text("email"),
  rentAmount: integer("rent_amount"), // In cents
  leaseStart: text("lease_start"),
  leaseEnd: text("lease_end"),
  status: text("status", { 
    enum: ["pending", "accepted", "revoked"] 
  }).notNull().default("pending"),
  inviteType: text("invite_type", { enum: ["tenant", "maintenance"] }).notNull().default("tenant"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
});

export const verificationCodes = sqliteTable("verification_codes", {
  email: text("email").primaryKey(),
  code: text("code").notNull(),
  expiresAt: text("expires_at").notNull(),
  signupData: text("signup_data").notNull(), // JSON payload containing signup details
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const propertyWorkers = sqliteTable("property_workers", {
  propertyId: text("property_id").notNull().references(() => properties.id),
  profileId: text("profile_id").notNull().references(() => profiles.id),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: primaryKey({ columns: [table.propertyId, table.profileId] }),
}));

/**
 * 8. MAP VIEW & NEARBY INSIGHTS
 */
export const propertyInsights = sqliteTable("property_insights", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  locationScore: integer("location_score").notNull(),
  schoolsScore: integer("schools_score").notNull(),
  healthcareScore: integer("healthcare_score").notNull(),
  transitScore: integer("transit_score").notNull(),
  convenienceScore: integer("convenience_score").notNull(),
  lifestyleScore: integer("lifestyle_score").notNull(),
  schoolsCount: integer("schools_count").notNull().default(0),
  hospitalsCount: integer("hospitals_count").notNull().default(0),
  transitCount: integer("transit_count").notNull().default(0),
  restaurantsCount: integer("restaurants_count").notNull().default(0),
  generatedAt: text("generated_at").default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
});

export const nearbyPlaces = sqliteTable("nearby_places", {
  id: text("id").primaryKey(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  category: text("category").notNull(),
  name: text("name").notNull(),
  distanceMeters: integer("distance_meters").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

