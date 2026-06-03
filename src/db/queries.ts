import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { getDb } from "./index";
import {
  profiles,
  properties,
  units,
  leases,
  leaseTenants,
  maintenanceRequests as maintenanceTable,
  payments as paymentsTable,
  notifications as notificationsTable,
  activityLogs,
  invitations,
  propertyWorkers,
  documents as documentsTable,
  maintenanceLogs,
} from "./schema";

export async function autoExpireLeases(db: any) {
  const todayStr = new Date().toISOString().split("T")[0];
  const { eq, and, lt } = await import("drizzle-orm");
  await db
    .update(leases)
    .set({ status: "expired", updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(leases.status, "active"), lt(leases.endDate, todayStr)));
}

// ─── Profile Queries ───────────────────────────────────────

export async function getProfileByEmail(email: string) {
  const db = await getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
  return profile;
}

export async function getProfileById(id: string) {
  const db = await getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return profile;
}

export type InsertProfile = typeof profiles.$inferInsert;

export async function createProfile(data: InsertProfile) {
  const db = await getDb();
  const [profile] = await db.insert(profiles).values(data).returning();
  return profile;
}

export async function updateProfile(id: string, data: Partial<InsertProfile>) {
  const db = await getDb();
  const [profile] = await db
    .update(profiles)
    .set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(profiles.id, id))
    .returning();
  return profile;
}

// ─── Property Queries ──────────────────────────────────────

/**
 * Shape returned to the UI — matches what admin.properties.tsx expects.
 */
export type PropertyWithCounts = {
  id: string;
  name: string;
  address: string;
  units: number;
  occupied: number;
};

/**
 * Get all properties for a landlord, with unit and occupancy counts.
 */
export async function getPropertiesByLandlord(landlordId: string): Promise<PropertyWithCounts[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: properties.id,
      name: properties.name,
      address: properties.address,
      totalUnits: sql<number>`count(${units.id})`,
      occupiedUnits: sql<number>`sum(case when ${units.status} = 'occupied' then 1 else 0 end)`,
    })
    .from(properties)
    .leftJoin(units, eq(units.propertyId, properties.id))
    .where(eq(properties.landlordId, landlordId))
    .groupBy(properties.id);

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    units: r.totalUnits ?? 0,
    occupied: r.occupiedUnits ?? 0,
  }));
}

export async function getPropertiesByWorker(workerId: string): Promise<PropertyWithCounts[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: properties.id,
      name: properties.name,
      address: properties.address,
      totalUnits: sql<number>`count(${units.id})`,
      occupiedUnits: sql<number>`sum(case when ${units.status} = 'occupied' then 1 else 0 end)`,
    })
    .from(propertyWorkers)
    .innerJoin(properties, eq(propertyWorkers.propertyId, properties.id))
    .leftJoin(units, eq(units.propertyId, properties.id))
    .where(eq(propertyWorkers.profileId, workerId))
    .groupBy(properties.id);

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    units: r.totalUnits ?? 0,
    occupied: r.occupiedUnits ?? 0,
  }));
}

export type InsertProperty = typeof properties.$inferInsert;

export async function createProperty(data: InsertProperty) {
  const db = await getDb();
  const [property] = await db.insert(properties).values(data).returning();
  return property;
}

// ─── Unit Queries ──────────────────────────────────────────

/**
 * Shape returned to the UI — matches what admin.properties.tsx expects.
 * `rent` is in dollars (converted from cents in DB).
 * `status` uses UI enum values.
 */
export type UnitWithTenant = {
  id: string;
  propertyId: string;
  number: string;
  status: "occupied" | "vacant" | "maintenance";
  tenant: string | null;
  rent: number;
  sqft: number;
  beds: number;
  baths: number;
};

/**
 * Get all units for a property, with the current tenant's name
 * resolved through the active lease.
 */
export async function getUnitsByProperty(propertyId: string): Promise<UnitWithTenant[]> {
  const db = await getDb();
  await autoExpireLeases(db);

  const unitRows = await db.select().from(units).where(eq(units.propertyId, propertyId));

  const result: UnitWithTenant[] = [];

  for (const unit of unitRows) {
    let tenantName: string | null = null;

    if (unit.status === "occupied") {
      // Find the active leases for this unit, then find the primary tenant
      const activeLeases = await db
        .select()
        .from(leases)
        .where(and(eq(leases.unitId, unit.id), eq(leases.status, "active")));

      const todayStr = new Date().toISOString().split("T")[0];
      let activeLease = activeLeases.find(
        (l: any) => l.startDate <= todayStr && l.endDate >= todayStr,
      );
      if (!activeLease && activeLeases.length > 0) {
        activeLease = activeLeases.find((l: any) => l.startDate > todayStr) || activeLeases[0];
      }

      if (activeLease) {
        const [tenantLink] = await db
          .select({ profileId: leaseTenants.profileId })
          .from(leaseTenants)
          .where(eq(leaseTenants.leaseId, activeLease.id))
          .limit(1);

        if (tenantLink) {
          const [profile] = await db
            .select({ firstName: profiles.firstName, lastName: profiles.lastName })
            .from(profiles)
            .where(eq(profiles.id, tenantLink.profileId))
            .limit(1);

          if (profile) {
            tenantName = `${profile.firstName} ${profile.lastName}`;
          }
        }
      }
    }

    result.push({
      id: unit.id,
      propertyId: unit.propertyId,
      number: unit.unitNumber,
      status: unit.status as "occupied" | "vacant" | "maintenance",
      tenant: tenantName,
      rent: unit.currentMarketRent / 100, // cents → dollars
      sqft: unit.sqft ?? 0,
      beds: unit.beds ?? 0,
      baths: unit.baths ?? 0,
    });
  }

  return result;
}

export type InsertUnit = typeof units.$inferInsert;

export async function createUnit(data: InsertUnit) {
  const db = await getDb();
  const [unit] = await db.insert(units).values(data).returning();
  return unit;
}

export async function updateUnit(id: string, data: Partial<InsertUnit>) {
  const db = await getDb();
  const [unit] = await db
    .update(units)
    .set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(units.id, id))
    .returning();
  return unit;
}

// ─── Tenant Queries ────────────────────────────────────────

export type TenantRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  unit: string;
  leaseEnd: string;
  rent: number;
  status: string;
  leaseId: string;
};

export async function getTenantsByLandlord(
  landlordId: string,
  page = 1,
  limit = 50,
  search = ""
): Promise<{ data: TenantRow[]; total: number }> {
  const { withTiming } = await import("../lib/observability");
  return withTiming("getTenantsByLandlord", async () => {
  const db = await getDb();
  await autoExpireLeases(db);

  const rows = await db
    .select({
      profileId: profiles.id,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      email: profiles.email,
      phone: profiles.phone,
      propName: properties.name,
      unitNumber: units.unitNumber,
      leaseEnd: leases.endDate,
      leaseStart: leases.startDate,
      monthlyRent: leases.monthlyRent,
      leaseId: leases.id,
    })
    .from(properties)
    .innerJoin(units, eq(units.propertyId, properties.id))
    .innerJoin(leases, and(eq(leases.unitId, units.id), eq(leases.status, "active")))
    .innerJoin(leaseTenants, eq(leaseTenants.leaseId, leases.id))
    .innerJoin(profiles, eq(profiles.id, leaseTenants.profileId))
    .where(eq(properties.landlordId, landlordId));

  // Deduplicate: if a unit has multiple active leases, prefer the one covering today
  const todayStr = new Date().toISOString().split("T")[0];
  const byUnitTenant = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    const key = `${row.unitNumber}__${row.profileId}`;
    const existing = byUnitTenant.get(key);
    if (!existing) {
      byUnitTenant.set(key, row);
    } else {
      // Prefer lease covering today
      const existingCovers =
        existing.leaseStart <= todayStr && existing.leaseEnd >= todayStr;
      const newCovers = row.leaseStart <= todayStr && row.leaseEnd >= todayStr;
      if (newCovers && !existingCovers) {
        byUnitTenant.set(key, row);
      }
    }
  }

  const allTenants = Array.from(byUnitTenant.values()).map((r) => ({
    id: r.profileId,
    name: `${r.firstName} ${r.lastName}`,
    email: r.email,
    phone: r.phone,
    unit: `${r.propName} · ${r.unitNumber}`,
    leaseEnd: r.leaseEnd,
    rent: r.monthlyRent / 100,
    status: "Active",
    leaseId: r.leaseId,
  }));

  // Apply search filtering in JS (since Drizzle doesn't support easy case-insensitive multi-column search here without raw SQL)
  let filtered = allTenants;
  if (search) {
    const q = search.toLowerCase();
    filtered = allTenants.filter(t => 
      t.name.toLowerCase().includes(q) || 
      (t.email && t.email.toLowerCase().includes(q)) || 
      t.unit.toLowerCase().includes(q)
    );
  }

  const total = filtered.length;
  const data = filtered.slice((page - 1) * limit, page * limit);

  return { data, total };
  });
}

// ─── Maintenance Queries ───────────────────────────────────

export type MaintenanceRow = {
  id: string;
  title: string;
  description: string;
  unit: string;
  tenant: string;
  category: string;
  priority: string;
  status: string;
  submitted: string;
  assigned: string | null;
  rawStatus: "pending" | "in_progress" | "resolved_pending" | "resolved";
  rawPriority: "low" | "medium" | "high" | "emergency";
  assignedWorkerId: string | null;
};

export async function getMaintenanceByLandlord(
  landlordId: string,
  page = 1,
  limit = 50,
  search = ""
): Promise<{ 
  data: MaintenanceRow[]; 
  total: number;
  stats: { open: number; resolved: number; emergency: number };
}> {
  const { withTiming } = await import("../lib/observability");
  return withTiming("getMaintenanceByLandlord", async () => {
  const db = await getDb();

  // Use aliased profiles for tenant and worker names in a single query
  const tenantProfiles = sql`tp`;
  const workerProfiles = sql`wp`;

  const rows = await db.all(sql`
    SELECT
      mr.id,
      mr.title,
      mr.description,
      mr.priority,
      mr.status,
      mr.created_at,
      mr.assigned_worker_id,
      mr.tenant_id,
      p.name AS prop_name,
      u.unit_number,
      tp.first_name AS tenant_first,
      tp.last_name AS tenant_last,
      wp.first_name AS worker_first,
      wp.last_name AS worker_last
    FROM maintenance_requests mr
    INNER JOIN units u ON u.id = mr.unit_id
    INNER JOIN properties p ON p.id = u.property_id
    LEFT JOIN profiles tp ON tp.id = mr.tenant_id
    LEFT JOIN profiles wp ON wp.id = mr.assigned_worker_id
    WHERE p.landlord_id = ${landlordId}
    ORDER BY mr.created_at DESC
  `);

  const statusMap: Record<string, string> = {
    pending: "Open",
    in_progress: "In Progress",
    resolved_pending: "Pending Approval",
    resolved: "Resolved",
  };
  const priorityMap: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    emergency: "Emergency",
  };

  const allMaint = (rows as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    unit: `${r.prop_name} · ${r.unit_number}`,
    tenant: r.tenant_first ? `${r.tenant_first} ${r.tenant_last}` : "Unknown",
    category: (r.description || "").split(" ")[0] || "Other",
    priority: priorityMap[r.priority] || r.priority,
    status: statusMap[r.status] || r.status,
    submitted: r.created_at ?? "",
    assigned: r.worker_first ? `${r.worker_first} ${r.worker_last}` : null,
    rawStatus: r.status as MaintenanceRow["rawStatus"],
    rawPriority: r.priority as MaintenanceRow["rawPriority"],
    assignedWorkerId: r.assigned_worker_id,
  }));

  let filtered = allMaint;
  if (search) {
    const q = search.toLowerCase();
    filtered = allMaint.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.unit.toLowerCase().includes(q) ||
      m.tenant.toLowerCase().includes(q)
    );
  }

  const stats = {
    open: filtered.filter((m) => m.rawStatus !== "resolved").length,
    resolved: filtered.filter((m) => m.rawStatus === "resolved").length,
    emergency: filtered.filter((m) => m.rawPriority === "emergency").length,
  };

  const total = filtered.length;
  const data = filtered.slice((page - 1) * limit, page * limit);

  return { data, total, stats };
  });
}

export async function getMaintenanceByTenant(
  tenantId: string,
  page = 1,
  limit = 50,
  search = ""
): Promise<{ 
  data: MaintenanceRow[]; 
  total: number;
  stats: { open: number; resolved: number; emergency: number };
}> {
  const db = await getDb();
  
  const tenantProfiles = sql`tp`;
  const workerProfiles = sql`wp`;

  const rows = await db.all(sql`
    SELECT
      mr.id,
      mr.title,
      mr.description,
      mr.priority,
      mr.status,
      mr.created_at,
      mr.assigned_worker_id,
      mr.tenant_id,
      p.name AS prop_name,
      u.unit_number,
      tp.first_name AS tenant_first,
      tp.last_name AS tenant_last,
      wp.first_name AS worker_first,
      wp.last_name AS worker_last
    FROM maintenance_requests mr
    INNER JOIN units u ON u.id = mr.unit_id
    INNER JOIN properties p ON p.id = u.property_id
    LEFT JOIN profiles tp ON tp.id = mr.tenant_id
    LEFT JOIN profiles wp ON wp.id = mr.assigned_worker_id
    WHERE mr.tenant_id = ${tenantId}
    ORDER BY mr.created_at DESC
  `);

  const statusMap: Record<string, string> = {
    pending: "Open",
    in_progress: "In Progress",
    resolved_pending: "Pending Approval",
    resolved: "Resolved",
  };
  const priorityMap: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    emergency: "Emergency",
  };

  const allMaint = (rows as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    unit: `${r.prop_name} · ${r.unit_number}`,
    tenant: r.tenant_first ? `${r.tenant_first} ${r.tenant_last}` : "Unknown",
    category: (r.description || "").split(" ")[0] || "Other",
    priority: priorityMap[r.priority] || r.priority,
    status: statusMap[r.status] || r.status,
    submitted: r.created_at ?? "",
    assigned: r.worker_first ? `${r.worker_first} ${r.worker_last}` : null,
    rawStatus: r.status as MaintenanceRow["rawStatus"],
    rawPriority: r.priority as MaintenanceRow["rawPriority"],
    assignedWorkerId: r.assigned_worker_id,
  }));

  let filtered = allMaint;
  if (search) {
    const q = search.toLowerCase();
    filtered = allMaint.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.unit.toLowerCase().includes(q) ||
      m.tenant.toLowerCase().includes(q)
    );
  }

  const stats = {
    open: filtered.filter((m) => m.rawStatus !== "resolved").length,
    resolved: filtered.filter((m) => m.rawStatus === "resolved").length,
    emergency: filtered.filter((m) => m.rawPriority === "emergency").length,
  };

  const total = filtered.length;
  const data = filtered.slice((page - 1) * limit, page * limit);

  return { data, total, stats };
}

export async function getMaintenanceByWorker(
  workerId: string,
  page = 1,
  limit = 50,
  search = ""
): Promise<{ 
  data: MaintenanceRow[]; 
  total: number;
  stats: { open: number; resolved: number; emergency: number };
}> {
  const db = await getDb();

  const tenantProfiles = sql`tp`;
  const workerProfiles = sql`wp`;

  const rows = await db.all(sql`
    SELECT
      mr.id,
      mr.title,
      mr.description,
      mr.priority,
      mr.status,
      mr.created_at,
      mr.assigned_worker_id,
      mr.tenant_id,
      p.name AS prop_name,
      u.unit_number,
      tp.first_name AS tenant_first,
      tp.last_name AS tenant_last,
      wp.first_name AS worker_first,
      wp.last_name AS worker_last
    FROM maintenance_requests mr
    INNER JOIN units u ON u.id = mr.unit_id
    INNER JOIN properties p ON p.id = u.property_id
    LEFT JOIN profiles tp ON tp.id = mr.tenant_id
    LEFT JOIN profiles wp ON wp.id = mr.assigned_worker_id
    WHERE mr.assigned_worker_id = ${workerId}
    ORDER BY mr.created_at DESC
  `);

  const statusMap: Record<string, string> = {
    pending: "Open",
    in_progress: "In Progress",
    resolved_pending: "Pending Approval",
    resolved: "Resolved",
  };
  const priorityMap: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    emergency: "Emergency",
  };

  const allMaint = (rows as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    unit: `${r.prop_name} · ${r.unit_number}`,
    tenant: r.tenant_first ? `${r.tenant_first} ${r.tenant_last}` : "Unknown",
    category: (r.description || "").split(" ")[0] || "Other",
    priority: priorityMap[r.priority] || r.priority,
    status: statusMap[r.status] || r.status,
    submitted: r.created_at ?? "",
    assigned: r.worker_first ? `${r.worker_first} ${r.worker_last}` : null,
    rawStatus: r.status as MaintenanceRow["rawStatus"],
    rawPriority: r.priority as MaintenanceRow["rawPriority"],
    assignedWorkerId: r.assigned_worker_id,
  }));

  let filtered = allMaint;
  if (search) {
    const q = search.toLowerCase();
    filtered = allMaint.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.unit.toLowerCase().includes(q) ||
      m.tenant.toLowerCase().includes(q)
    );
  }

  const stats = {
    open: filtered.filter((m) => m.rawStatus !== "resolved").length,
    resolved: filtered.filter((m) => m.rawStatus === "resolved").length,
    emergency: filtered.filter((m) => m.rawPriority === "emergency").length,
  };

  const total = filtered.length;
  const data = filtered.slice((page - 1) * limit, page * limit);

  return { data, total, stats };
}

export async function createMaintenanceRequest(data: typeof maintenanceTable.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(maintenanceTable).values(data).returning();
  return row;
}

export type AssignableWorker = {
  id: string;
  name: string;
  role: string;
};

export async function getAssignableWorkers(): Promise<AssignableWorker[]> {
  const db = await getDb();
  const { or, eq } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(profiles)
    .where(or(eq(profiles.role, "maintenance"), eq(profiles.role, "service")));
  return rows.map((r: any) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`,
    role: r.role,
  }));
}

export async function getAssignableWorkersForLandlord(
  landlordId: string,
): Promise<AssignableWorker[]> {
  const db = await getDb();
  const { eq, inArray } = await import("drizzle-orm");

  // Find all properties owned by this landlord
  const landlordProperties = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.landlordId, landlordId));

  if (landlordProperties.length === 0) return [];

  const propIds = landlordProperties.map((p: any) => p.id);

  // Find all workers linked to any of these properties
  const rows = await db
    .selectDistinct({
      id: profiles.id,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      role: profiles.role,
    })
    .from(propertyWorkers)
    .innerJoin(profiles, eq(propertyWorkers.profileId, profiles.id))
    .where(inArray(propertyWorkers.propertyId, propIds));

  return rows.map((r: any) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`,
    role: r.role,
  }));
}

export async function updateMaintenanceRequest(
  id: string,
  data: {
    status?: "pending" | "in_progress" | "resolved_pending" | "resolved";
    priority?: "low" | "medium" | "high" | "emergency";
    assignedWorkerId?: string | null;
  },
) {
  const db = await getDb();
  const { eq, and } = await import("drizzle-orm");

  // Filter out undefined values to prevent NOT NULL constraint violations
  const cleanData: Record<string, any> = {};
  if (data.status !== undefined) cleanData.status = data.status;
  if (data.priority !== undefined) cleanData.priority = data.priority;
  if (data.assignedWorkerId !== undefined) cleanData.assignedWorkerId = data.assignedWorkerId;

  // 1. Update the maintenance request
  const [row] = await db
    .update(maintenanceTable)
    .set({
      ...cleanData,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(maintenanceTable.id, id))
    .returning();

  if (!row) throw new Error("Maintenance request not found");

  // 2. If status is updated, propagate changes to unit status globally
  if (data.status) {
    if (data.status === "in_progress" || data.status === "resolved_pending") {
      await db
        .update(units)
        .set({ status: "maintenance", updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(units.id, row.unitId));
    } else if (data.status === "resolved") {
      // Find if there is an active lease to determine if occupied or vacant
      const activeLeases = await db
        .select()
        .from(leases)
        .where(and(eq(leases.unitId, row.unitId), eq(leases.status, "active")));

      const newStatus = activeLeases.length > 0 ? "occupied" : "vacant";
      await db
        .update(units)
        .set({ status: newStatus, updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(units.id, row.unitId));
    }
  }

  return row;
}

// ─── Payment Queries ───────────────────────────────────────

export type PaymentRow = {
  id: string;
  tenant: string;
  unit: string;
  amount: number;
  due: string;
  status: string;
  paidDate: string | null;
  category: string;
};

export async function getPaymentsByLandlord(
  landlordId: string,
  page = 1,
  limit = 50,
  search = ""
): Promise<{ 
  data: PaymentRow[]; 
  total: number;
  stats: { collected: number; pending: number; late: number };
}> {
  const { withTiming } = await import("../lib/observability");
  return withTiming("getPaymentsByLandlord", async () => {
  const db = await getDb();
  
  const rows = await db.all(sql`
    SELECT
      pay.id,
      pay.amount,
      pay.due_date,
      pay.paid_date,
      pay.status,
      pay.category,
      p.name AS prop_name,
      u.unit_number,
      t.first_name,
      t.last_name
    FROM payments pay
    INNER JOIN leases l ON l.id = pay.lease_id
    INNER JOIN units u ON u.id = l.unit_id
    INNER JOIN properties p ON p.id = u.property_id
    LEFT JOIN profiles t ON t.id = pay.tenant_id
    WHERE p.landlord_id = ${landlordId}
    ORDER BY pay.due_date DESC
  `);

  const statusMap: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    late: "Late",
    failed: "Failed",
  };

  const allPayments = (rows as any[]).map((r) => ({
    id: r.id,
    tenant: r.first_name ? `${r.first_name} ${r.last_name}` : "Unknown",
    unit: `${r.prop_name} · ${r.unit_number}`,
    amount: r.amount / 100,
    due: r.due_date,
    status: statusMap[r.status] || r.status,
    paidDate: r.paid_date,
    category: r.category,
  }));

  let filtered = allPayments;
  if (search) {
    const q = search.toLowerCase();
    filtered = allPayments.filter(p => 
      p.tenant.toLowerCase().includes(q) || 
      p.unit.toLowerCase().includes(q)
    );
  }

  const stats = {
    collected: filtered.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0),
    pending: filtered.filter((p) => p.status === "Pending").reduce((s, p) => s + p.amount, 0),
    late: filtered.filter((p) => p.status === "Late").reduce((s, p) => s + p.amount, 0),
  };

  const total = filtered.length;
  const data = filtered.slice((page - 1) * limit, page * limit);

  return { data, total, stats };
  });
}

export async function getPaymentsByTenant(tenantId: string) {
  const db = await getDb();
  const rows = await db.select().from(paymentsTable).where(eq(paymentsTable.tenantId, tenantId));
  const statusMap: Record<string, string> = {
    pending: "Pending",
    paid: "Paid",
    late: "Late",
    failed: "Failed",
  };
  return rows.map((p: any) => ({
    id: p.id,
    date: p.paidDate ?? p.dueDate,
    dueDate: p.dueDate,
    paidDate: p.paidDate,
    amount: p.amount / 100,
    status: statusMap[p.status] || p.status,
    category: p.category,
    transactionId: p.transactionId,
  }));
}

// ─── Notification Queries ──────────────────────────────────

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
  isRead: boolean;
};

export async function getNotificationsByUser(userId: string): Promise<NotificationRow[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.recipientId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(30);
  return rows.map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    time: n.createdAt ?? "",
    isRead: n.isRead ?? false,
  }));
}

export async function createNotification(data: typeof notificationsTable.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(notificationsTable).values(data).returning();
  return row;
}

export async function markNotificationRead(id: string, userId: string) {
  const db = await getDb();
  const [row] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.recipientId, userId)))
    .returning();
  return row;
}

export async function markAllNotificationsRead(userId: string) {
  const db = await getDb();
  return db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.recipientId, userId))
    .returning();
}

export async function broadcastAnnouncement(
  landlordId: string,
  propertyId: string | null,
  title: string,
  body: string,
) {
  const db = await getDb();

  // 1. Find all target tenants
  let targetTenantIds: string[] = [];

  if (propertyId) {
    // Tenants in a specific property
    const unitsList = await db
      .select({ id: units.id })
      .from(units)
      .where(eq(units.propertyId, propertyId));
    const unitIds = unitsList.map((u: { id: string }) => u.id);
    if (unitIds.length > 0) {
      const activeLeases = await db
        .select({ id: leases.id })
        .from(leases)
        .where(and(eq(leases.status, "active"), inArray(leases.unitId, unitIds)));
      const leaseIds = activeLeases.map((l: { id: string }) => l.id);
      if (leaseIds.length > 0) {
        const links = await db
          .select({ profileId: leaseTenants.profileId })
          .from(leaseTenants)
          .where(inArray(leaseTenants.leaseId, leaseIds));
        targetTenantIds = Array.from(
          new Set(links.map((link: { profileId: string }) => link.profileId)),
        );
      }
    }
  } else {
    // All tenants under this landlord
    const props = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.landlordId, landlordId));
    const propIds = props.map((p: { id: string }) => p.id);
    if (propIds.length > 0) {
      const unitsList = await db
        .select({ id: units.id })
        .from(units)
        .where(inArray(units.propertyId, propIds));
      const unitIds = unitsList.map((u: { id: string }) => u.id);
      if (unitIds.length > 0) {
        const activeLeases = await db
          .select({ id: leases.id })
          .from(leases)
          .where(and(eq(leases.status, "active"), inArray(leases.unitId, unitIds)));
        const leaseIds = activeLeases.map((l: { id: string }) => l.id);
        if (leaseIds.length > 0) {
          const links = await db
            .select({ profileId: leaseTenants.profileId })
            .from(leaseTenants)
            .where(inArray(leaseTenants.leaseId, leaseIds));
          targetTenantIds = Array.from(
            new Set(links.map((link: { profileId: string }) => link.profileId)),
          );
        }
      }
    }
  }

  // 2. Insert notification records & dispatch emails
  const notificationsCreated = [];
  const { enqueueEmail } = await import("../lib/email-queue");

  for (const tenantId of targetTenantIds) {
    const [tenant] = await db.select().from(profiles).where(eq(profiles.id, tenantId)).limit(1);

    // Create database notification
    const [row] = await db
      .insert(notificationsTable)
      .values({
        id: crypto.randomUUID(),
        recipientId: tenantId,
        type: "announcement",
        title,
        body,
        isRead: false,
      })
      .returning();

    notificationsCreated.push(row);

    // Send email notification
    if (tenant && tenant.email) {
      enqueueEmail({
        to: tenant.email,
        subject: `[PropEase Announcement] ${title}`,
        text: `Dear ${tenant.firstName},\n\nYour landlord has posted a new announcement:\n\n---\n${title}\n\n${body}\n---\n\nBest regards,\nPropEase Team`,
        html: `<h3>Dear ${tenant.firstName},</h3><p>Your landlord has posted a new announcement:</p><blockquote style="border-left: 3px solid #ccc; padding-left: 10px; margin-left: 10px;"><strong>${title}</strong><br/><br/>${body.replace(/\n/g, "<br/>")}</blockquote><p>Best regards,<br/>PropEase Team</p>`,
      });
    }
  }

  // 3. Log activity
  await db.insert(activityLogs).values({
    id: crypto.randomUUID(),
    actorId: landlordId,
    actionType: "ANNOUNCEMENT_BROADCAST",
    description: `Broadcasted announcement: "${title}" to ${targetTenantIds.length} tenants.`,
  });

  return notificationsCreated;
}

// ─── Dashboard Queries ─────────────────────────────────────

export type RevenueDataPoint = {
  month: string; // e.g. "Jan 2026"
  collected: number; // dollars
  pending: number; // dollars
};

export type ActivityItem = {
  id: string;
  actionType: string;
  description: string;
  timestamp: string;
  actorName: string;
};

export type ExpiringLease = {
  leaseId: string;
  unitLabel: string;
  tenantName: string;
  endDate: string;
  daysUntilExpiry: number;
};

export type DashboardStats = {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  maintenanceUnits: number;
  occupancyRate: string;
  openRequests: number;
  highPriorityRequests: number;
  collectedRevenue: number;
  pendingRevenue: number;
  revenueTimeSeries: RevenueDataPoint[];
  recentActivity: ActivityItem[];
  expiringLeases: ExpiringLease[];
  hasData: boolean;
};

export async function getDashboardStats(landlordId: string): Promise<DashboardStats> {
  const { withTiming } = await import("../lib/observability");
  return withTiming("getDashboardStats", async () => {
  const db = await getDb();
  await autoExpireLeases(db);

  const props = await db
    .select({ id: properties.id, name: properties.name })
    .from(properties)
    .where(eq(properties.landlordId, landlordId));
  if (props.length === 0) {
    return {
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      maintenanceUnits: 0,
      occupancyRate: "0%",
      openRequests: 0,
      highPriorityRequests: 0,
      collectedRevenue: 0,
      pendingRevenue: 0,
      revenueTimeSeries: [],
      recentActivity: [],
      expiringLeases: [],
      hasData: false,
    };
  }

  // 1. Unit stats (single query)
  const unitStats = (await db.all(sql`
    SELECT
      COUNT(u.id) AS total_units,
      SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) AS occupied_units,
      SUM(CASE WHEN u.status = 'vacant' THEN 1 ELSE 0 END) AS vacant_units,
      SUM(CASE WHEN u.status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_units
    FROM units u
    INNER JOIN properties p ON p.id = u.property_id
    WHERE p.landlord_id = ${landlordId}
  `))[0] as any;

  const totalUnits = unitStats?.total_units ?? 0;
  const occupiedUnits = unitStats?.occupied_units ?? 0;
  const vacantUnits = unitStats?.vacant_units ?? 0;
  const maintenanceUnits = unitStats?.maintenance_units ?? 0;
  const rate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) + "%" : "0%";

  // 2. Maintenance stats (single query)
  const maintStats = (await db.all(sql`
    SELECT
      SUM(CASE WHEN mr.status != 'resolved' THEN 1 ELSE 0 END) AS open_requests,
      SUM(CASE WHEN mr.status != 'resolved' AND mr.priority IN ('high', 'emergency') THEN 1 ELSE 0 END) AS high_priority
    FROM maintenance_requests mr
    INNER JOIN units u ON u.id = mr.unit_id
    INNER JOIN properties p ON p.id = u.property_id
    WHERE p.landlord_id = ${landlordId}
  `))[0] as any;

  const openRequests = maintStats?.open_requests ?? 0;
  const highPriority = maintStats?.high_priority ?? 0;

  // 3. Payment stats & time series (single query)
  // Look back 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().substring(0, 10);

  const paymentStats = await db.all(sql`
    SELECT
      pay.amount,
      pay.status,
      pay.paid_date,
      pay.due_date
    FROM payments pay
    INNER JOIN leases l ON l.id = pay.lease_id
    INNER JOIN units u ON u.id = l.unit_id
    INNER JOIN properties p ON p.id = u.property_id
    WHERE p.landlord_id = ${landlordId}
      AND pay.due_date >= ${sixMonthsAgoStr}
  `) as any[];

  let collected = 0;
  let pending = 0;
  
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const revenueMap = new Map<string, { collected: number; pending: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    revenueMap.set(key, { collected: 0, pending: 0 });
  }

  for (const p of paymentStats) {
    if (p.status === "paid") collected += p.amount;
    else pending += p.amount;

    const dateStr = p.status === "paid" && p.paid_date ? p.paid_date : p.due_date;
    const monthKey = dateStr.substring(0, 7);
    const entry = revenueMap.get(monthKey);
    if (entry) {
      if (p.status === "paid") entry.collected += p.amount;
      else entry.pending += p.amount;
    }
  }

  const revenueTimeSeries: RevenueDataPoint[] = [];
  for (const [key, val] of revenueMap) {
    const [year, mon] = key.split("-");
    const label = `${monthNames[parseInt(mon, 10) - 1]} ${year}`;
    revenueTimeSeries.push({
      month: label,
      collected: val.collected / 100,
      pending: val.pending / 100,
    });
  }

  // 4. Expiring Leases (single query)
  const recentActivity: any[] = []; // Intentionally left blank as removed during Phase 2 refactor
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  const expiringDateMs = now.getTime() + ninetyDaysMs;
  const expiringDateStr = new Date(expiringDateMs).toISOString().substring(0, 10);

  const expiringLeasesRows = await db.all(sql`
    SELECT
      l.id AS lease_id,
      l.end_date,
      p.name AS prop_name,
      u.unit_number,
      tp.first_name,
      tp.last_name
    FROM leases l
    INNER JOIN units u ON u.id = l.unit_id
    INNER JOIN properties p ON p.id = u.property_id
    LEFT JOIN lease_tenants lt ON lt.lease_id = l.id AND lt.is_primary = 1
    LEFT JOIN profiles tp ON tp.id = lt.profile_id
    WHERE p.landlord_id = ${landlordId}
      AND l.status = 'active'
      AND l.end_date <= ${expiringDateStr}
  `) as any[];

  const expiringLeases: ExpiringLease[] = expiringLeasesRows.map((r: any) => {
    const end = new Date(r.end_date);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return {
      leaseId: r.lease_id,
      tenantName: r.first_name ? `${r.first_name} ${r.last_name}` : "Unknown",
      unitLabel: `${r.prop_name} · ${r.unit_number}`,
      endDate: r.end_date,
      daysUntilExpiry: diff,
    };
  });

  // Sort expiring leases by closest expiry first
  expiringLeases.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  return {
    totalUnits,
    occupiedUnits,
    vacantUnits,
    maintenanceUnits,
    occupancyRate: rate,
    openRequests,
    highPriorityRequests: highPriority,
    collectedRevenue: collected / 100,
    pendingRevenue: pending / 100,
    revenueTimeSeries,
    recentActivity,
    expiringLeases,
    hasData: true,
  };
  });
}

// ─── Tenant Portal Queries ─────────────────────────────────

export type TenantDashboardData = {
  unitLabel: string;
  leaseEnd: string;
  rent: number;
  dueDate: string;
  balance: number;
  hasLease: boolean;
};

export async function getTenantDashboard(tenantId: string): Promise<TenantDashboardData> {
  const db = await getDb();
  await autoExpireLeases(db);

  // Find active lease for this tenant
  const tenantLinks = await db
    .select()
    .from(leaseTenants)
    .where(eq(leaseTenants.profileId, tenantId));

  const activeLeases: (typeof leases.$inferSelect)[] = [];
  for (const link of tenantLinks) {
    const [lease] = await db
      .select()
      .from(leases)
      .where(and(eq(leases.id, link.leaseId), eq(leases.status, "active")))
      .limit(1);
    if (lease) activeLeases.push(lease);
  }

  if (activeLeases.length === 0) {
    return { unitLabel: "", leaseEnd: "", rent: 0, dueDate: "", balance: 0, hasLease: false };
  }

  // Prioritize lease covering today, fallback to future lease, then first lease
  const todayStr = new Date().toISOString().split("T")[0];
  let lease = activeLeases.find((l) => l.startDate <= todayStr && l.endDate >= todayStr);
  if (!lease) {
    lease = activeLeases.find((l) => l.startDate > todayStr) || activeLeases[0];
  }

  const [unit] = await db.select().from(units).where(eq(units.id, lease.unitId)).limit(1);
  if (!unit)
    return { unitLabel: "", leaseEnd: "", rent: 0, dueDate: "", balance: 0, hasLease: false };

  const [prop] = await db
    .select({ name: properties.name })
    .from(properties)
    .where(eq(properties.id, unit.propertyId))
    .limit(1);

  // Get pending payments
  const pendingPays = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.leaseId, lease.id), eq(paymentsTable.tenantId, tenantId)));
  const balance = pendingPays
    .filter((p: any) => p.status === "pending")
    .reduce((s: any, p: any) => s + p.amount, 0);
  const nextDue = pendingPays.find((p: any) => p.status === "pending");

  return {
    unitLabel: `${prop?.name ?? "Property"} · Apt ${unit.unitNumber}`,
    leaseEnd: lease.endDate,
    rent: lease.monthlyRent / 100,
    dueDate: nextDue?.dueDate ?? "No upcoming",
    balance: balance / 100,
    hasLease: true,
  };
}

// ─── Invitations ───────────────────────────────────────────

export async function createInvite(data: typeof invitations.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(invitations).values(data).returning();
  return row;
}

export async function getInvite(id: string) {
  const db = await getDb();
  const [invite] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
  return invite;
}

export async function acceptInvite(id: string) {
  const db = await getDb();
  await db.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, id));
}

export async function payTenantPayment(tenantId: string) {
  const db = await getDb();

  // Find all pending payments for this tenant
  const pendingPayments = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.tenantId, tenantId), eq(paymentsTable.status, "pending")));

  if (pendingPayments.length === 0) {
    throw new Error("No pending payments found for this tenant.");
  }

  const updatedPayments = [];
  const todayStr = new Date().toISOString().split("T")[0];

  for (const payment of pendingPayments) {
    const [updated] = await db
      .update(paymentsTable)
      .set({
        status: "paid",
        paidDate: todayStr,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(paymentsTable.id, payment.id))
      .returning();

    updatedPayments.push(updated);

    // Get tenant details for logs and emails
    const [tenant] = await db
      .select({ firstName: profiles.firstName, lastName: profiles.lastName, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, tenantId))
      .limit(1);
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : "Tenant";

    // Find the landlord to notify
    const [lease] = await db.select().from(leases).where(eq(leases.id, payment.leaseId)).limit(1);

    if (lease) {
      const [unit] = await db.select().from(units).where(eq(units.id, lease.unitId)).limit(1);
      if (unit) {
        const [property] = await db
          .select()
          .from(properties)
          .where(eq(properties.id, unit.propertyId))
          .limit(1);

        if (property) {
          // 1. Notify Landlord in App
          await db.insert(notificationsTable).values({
            id: crypto.randomUUID(),
            recipientId: property.landlordId,
            type: "payment",
            title: "Rent Payment Received",
            body: `${tenantName} paid $${(payment.amount / 100).toLocaleString()} for Apt ${unit.unitNumber} (${property.name}).`,
            isRead: false,
          });

          // 2. Log Activity
          await db.insert(activityLogs).values({
            id: crypto.randomUUID(),
            actorId: tenantId,
            actionType: "PAYMENT_RECEIVED",
            description: `${tenantName} paid rent of $${(payment.amount / 100).toLocaleString()} for Apt ${unit.unitNumber}.`,
          });

          // 3. Email Tenant (Receipt)
          if (tenant && tenant.email) {
            try {
              const amountStr = `$${(payment.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
              const subject = `[Receipt] Rent Payment Confirmed - Apt ${unit.unitNumber}`;
              const text = `Hello ${tenant.firstName},

This email confirms receipt of your payment for Apt ${unit.unitNumber} (${property.name}):

Receipt Reference: ${updated.id}
Amount Paid: ${amountStr}
Payment Category: Rent
Payment Method: Card (Stripe Sandbox)
Date Processed: ${todayStr}

Status: Paid

Thank you for your payment!

Best regards,
PropEase Billing`;

              const html = `<p>Hello ${tenant.firstName},</p>
<p>This email confirms receipt of your payment for <strong>Apt ${unit.unitNumber} (${property.name})</strong>:</p>
<table style="border: 1px solid #ccc; padding: 10px; border-collapse: collapse;">
  <tr><td><strong>Receipt Reference:</strong></td><td>${updated.id}</td></tr>
  <tr><td><strong>Amount Paid:</strong></td><td><strong>${amountStr}</strong></td></tr>
  <tr><td><strong>Category:</strong></td><td>Rent</td></tr>
  <tr><td><strong>Payment Method:</strong></td><td>Card (Stripe Sandbox)</td></tr>
  <tr><td><strong>Date Processed:</strong></td><td>${todayStr}</td></tr>
  <tr><td><strong>Status:</strong></td><td><span style="color: green; font-weight: bold;">Paid</span></td></tr>
</table>
<p>Thank you for your payment!</p>
<p>Best regards,<br/>PropEase Billing</p>`;

              const { enqueueEmail } = await import("../lib/email-queue");
              enqueueEmail({ to: tenant.email, subject, html, text });
            } catch (err) {
              console.error("Failed to send tenant payment receipt email:", err);
            }
          }

          // 4. Email Landlord (Notification)
          const [landlord] = await db
            .select({ firstName: profiles.firstName, email: profiles.email })
            .from(profiles)
            .where(eq(profiles.id, property.landlordId))
            .limit(1);

          if (landlord && landlord.email) {
            try {
              const amountStr = `$${(payment.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
              const subject = `[Payment Received] Rent Paid for Apt ${unit.unitNumber}`;
              const text = `Hello ${landlord.firstName},

This is to notify you that ${tenantName} has paid rent for Apt ${unit.unitNumber} (${property.name}).

Payment Reference: ${updated.id}
Amount: ${amountStr}
Date: ${todayStr}

The payment ledger has been updated.

Best regards,
PropEase Billing`;

              const html = `<p>Hello ${landlord.firstName},</p>
<p>This is to notify you that <strong>${tenantName}</strong> has paid rent for <strong>Apt ${unit.unitNumber} (${property.name})</strong>.</p>
<table style="border: 1px solid #ccc; padding: 10px; border-collapse: collapse;">
  <tr><td><strong>Payment Reference:</strong></td><td>${updated.id}</td></tr>
  <tr><td><strong>Amount:</strong></td><td>${amountStr}</td></tr>
  <tr><td><strong>Date:</strong></td><td>${todayStr}</td></tr>
</table>
<p>The payment ledger has been updated automatically.</p>
<p>Best regards,<br/>PropEase Billing</p>`;

              const { enqueueEmail } = await import("../lib/email-queue");
              enqueueEmail({ to: landlord.email, subject, html, text });
            } catch (err) {
              console.error("Failed to send landlord payment notification email:", err);
            }
          }
        }
      }
    }
  }

  return updatedPayments;
}

export async function payTenantPaymentWithStripe(tenantId: string, transactionId: string) {
  const db = await getDb();

  // First, check if payments with this transaction ID have already been processed to ensure idempotency.
  const processed = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.transactionId, transactionId));

  if (processed.length > 0) {
    return processed;
  }

  // Find all pending payments for this tenant
  const pendingPayments = await db
    .select()
    .from(paymentsTable)
    .where(and(eq(paymentsTable.tenantId, tenantId), eq(paymentsTable.status, "pending")));

  if (pendingPayments.length === 0) {
    throw new Error("No pending payments found for this tenant.");
  }

  const updatedPayments = [];
  const todayStr = new Date().toISOString().split("T")[0];

  for (const payment of pendingPayments) {
    const [updated] = await db
      .update(paymentsTable)
      .set({
        status: "paid",
        paidDate: todayStr,
        transactionId: transactionId,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(paymentsTable.id, payment.id))
      .returning();

    updatedPayments.push(updated);

    // Get tenant details for logs and emails
    const [tenant] = await db
      .select({ firstName: profiles.firstName, lastName: profiles.lastName, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, tenantId))
      .limit(1);
    const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : "Tenant";

    // Find the landlord to notify
    const [lease] = await db.select().from(leases).where(eq(leases.id, payment.leaseId)).limit(1);

    if (lease) {
      const [unit] = await db.select().from(units).where(eq(units.id, lease.unitId)).limit(1);
      if (unit) {
        const [property] = await db
          .select()
          .from(properties)
          .where(eq(properties.id, unit.propertyId))
          .limit(1);

        if (property) {
          // 1. Notify Landlord in App
          await db.insert(notificationsTable).values({
            id: crypto.randomUUID(),
            recipientId: property.landlordId,
            type: "payment",
            title: "Rent Payment Received",
            body: `${tenantName} paid $${(payment.amount / 100).toLocaleString()} for Apt ${unit.unitNumber} (${property.name}) via Stripe.`,
            isRead: false,
          });

          // 2. Log Activity
          await db.insert(activityLogs).values({
            id: crypto.randomUUID(),
            actorId: tenantId,
            actionType: "PAYMENT_RECEIVED",
            description: `${tenantName} paid rent of $${(payment.amount / 100).toLocaleString()} for Apt ${unit.unitNumber} via Stripe.`,
          });

          // 3. Email Tenant (Receipt)
          if (tenant && tenant.email) {
            try {
              const amountStr = `$${(payment.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
              const subject = `[Receipt] Rent Payment Confirmed - Apt ${unit.unitNumber}`;
              const text = `Hello ${tenant.firstName},

This email confirms receipt of your payment for Apt ${unit.unitNumber} (${property.name}):

Receipt Reference: ${updated.id}
Stripe Session ID: ${transactionId}
Amount Paid: ${amountStr}
Payment Category: Rent
Payment Method: Card (Stripe Checkout)
Date Processed: ${todayStr}

Status: Paid

Thank you for your payment!

Best regards,
PropEase Billing`;

              const html = `<p>Hello ${tenant.firstName},</p>
<p>This email confirms receipt of your payment for <strong>Apt ${unit.unitNumber} (${property.name})</strong>:</p>
<table style="border: 1px solid #ccc; padding: 10px; border-collapse: collapse;">
  <tr><td><strong>Receipt Reference:</strong></td><td>${updated.id}</td></tr>
  <tr><td><strong>Stripe Session ID:</strong></td><td><code>${transactionId}</code></td></tr>
  <tr><td><strong>Amount Paid:</strong></td><td><strong>${amountStr}</strong></td></tr>
  <tr><td><strong>Category:</strong></td><td>Rent</td></tr>
  <tr><td><strong>Payment Method:</strong></td><td>Card (Stripe Checkout)</td></tr>
  <tr><td><strong>Date Processed:</strong></td><td>${todayStr}</td></tr>
  <tr><td><strong>Status:</strong></td><td><span style="color: green; font-weight: bold;">Paid</span></td></tr>
</table>
<p>Thank you for your payment!</p>
<p>Best regards,<br/>PropEase Billing</p>`;

              const { enqueueEmail } = await import("../lib/email-queue");
              enqueueEmail({ to: tenant.email, subject, html, text });
            } catch (err) {
              console.error("Failed to send tenant payment receipt email:", err);
            }
          }

          // 4. Email Landlord (Notification)
          const [landlord] = await db
            .select({ firstName: profiles.firstName, email: profiles.email })
            .from(profiles)
            .where(eq(profiles.id, property.landlordId))
            .limit(1);

          if (landlord && landlord.email) {
            try {
              const amountStr = `$${(payment.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
              const subject = `[Payment Received] Rent Paid for Apt ${unit.unitNumber}`;
              const text = `Hello ${landlord.firstName},

This is to notify you that ${tenantName} has paid rent for Apt ${unit.unitNumber} (${property.name}) via Stripe.

Payment Reference: ${updated.id}
Stripe Session ID: ${transactionId}
Amount: ${amountStr}
Date: ${todayStr}

The payment ledger has been updated.

Best regards,
PropEase Billing`;

              const html = `<p>Hello ${landlord.firstName},</p>
<p>This is to notify you that <strong>${tenantName}</strong> has paid rent for <strong>Apt ${unit.unitNumber} (${property.name})</strong> via Stripe.</p>
<table style="border: 1px solid #ccc; padding: 10px; border-collapse: collapse;">
  <tr><td><strong>Payment Reference:</strong></td><td>${updated.id}</td></tr>
  <tr><td><strong>Stripe Session ID:</strong></td><td><code>${transactionId}</code></td></tr>
  <tr><td><strong>Amount:</strong></td><td>${amountStr}</td></tr>
  <tr><td><strong>Date:</strong></td><td>${todayStr}</td></tr>
</table>
<p>The payment ledger has been updated automatically.</p>
<p>Best regards,<br/>PropEase Billing</p>`;

              const { enqueueEmail } = await import("../lib/email-queue");
              enqueueEmail({ to: landlord.email, subject, html, text });
            } catch (err) {
              console.error("Failed to send landlord payment notification email:", err);
            }
          }
        }
      }
    }
  }

  return updatedPayments;
}

// ─── Document Queries ───────────────────────────────────────

export type DocumentRow = {
  id: string;
  name: string;
  storagePath: string;
  type: string;
  status: string;
  uploadedBy: string;
  createdAt: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
};

export async function getTenantActiveLeaseAndProperty(tenantId: string) {
  const db = await getDb();

  // Find primary lease
  const [link] = await db
    .select()
    .from(leaseTenants)
    .where(eq(leaseTenants.profileId, tenantId))
    .limit(1);

  if (!link) return null;

  const [lease] = await db
    .select()
    .from(leases)
    .where(and(eq(leases.id, link.leaseId), eq(leases.status, "active")))
    .limit(1);

  if (!lease) return null;

  const [unit] = await db.select().from(units).where(eq(units.id, lease.unitId)).limit(1);

  if (!unit) return null;

  return {
    leaseId: lease.id,
    propertyId: unit.propertyId,
    unitId: unit.id,
  };
}

export async function createDocument(data: typeof documentsTable.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(documentsTable).values(data).returning();
  return row;
}

export async function getDocumentsByTenant(tenantId: string): Promise<DocumentRow[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: documentsTable.id,
      name: documentsTable.name,
      storagePath: documentsTable.storagePath,
      type: documentsTable.type,
      status: documentsTable.status,
      uploadedBy: documentsTable.uploadedBy,
      createdAt: documentsTable.createdAt,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      propertyName: properties.name,
      unitNumber: units.unitNumber,
    })
    .from(documentsTable)
    .leftJoin(profiles, eq(documentsTable.uploadedBy, profiles.id))
    .leftJoin(properties, eq(documentsTable.propertyId, properties.id))
    .leftJoin(leases, eq(documentsTable.leaseId, leases.id))
    .leftJoin(units, eq(leases.unitId, units.id))
    .where(eq(documentsTable.tenantId, tenantId))
    .orderBy(desc(documentsTable.createdAt));

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    storagePath: r.storagePath,
    type: r.type,
    status: r.status,
    uploadedBy: r.uploadedBy,
    createdAt: r.createdAt ?? "",
    tenantName: r.firstName ? `${r.firstName} ${r.lastName}` : "Unknown",
    propertyName: r.propertyName ?? "Portfolio",
    unitNumber: r.unitNumber ?? "Common",
  }));
}

export async function getDocumentsForLandlord(landlordId: string): Promise<DocumentRow[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: documentsTable.id,
      name: documentsTable.name,
      storagePath: documentsTable.storagePath,
      type: documentsTable.type,
      status: documentsTable.status,
      uploadedBy: documentsTable.uploadedBy,
      createdAt: documentsTable.createdAt,
      tenantFirstName: profiles.firstName,
      tenantLastName: profiles.lastName,
      propertyName: properties.name,
      unitNumber: units.unitNumber,
    })
    .from(documentsTable)
    .leftJoin(profiles, eq(documentsTable.tenantId, profiles.id))
    .leftJoin(properties, eq(documentsTable.propertyId, properties.id))
    .leftJoin(leases, eq(documentsTable.leaseId, leases.id))
    .leftJoin(units, eq(leases.unitId, units.id))
    .where(eq(properties.landlordId, landlordId))
    .orderBy(desc(documentsTable.createdAt));

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    storagePath: r.storagePath,
    type: r.type,
    status: r.status,
    uploadedBy: r.uploadedBy,
    createdAt: r.createdAt ?? "",
    tenantName: r.tenantFirstName ? `${r.tenantFirstName} ${r.tenantLastName}` : "Unknown",
    propertyName: r.propertyName ?? "Portfolio",
    unitNumber: r.unitNumber ?? "Common",
  }));
}

export async function getDocumentById(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(documentsTable).where(eq(documentsTable.id, id)).limit(1);
  return row;
}

export async function updateDocumentStatus(id: string, status: "approved" | "rejected") {
  const db = await getDb();
  const [row] = await db
    .update(documentsTable)
    .set({
      status,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(documentsTable.id, id))
    .returning();
  return row;
}

// ─── Maintenance Log Queries ────────────────────────────────

export type MaintenanceLogWithAuthor = {
  id: string;
  requestId: string;
  authorId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  authorName: string;
  authorRole: string;
};

export async function createMaintenanceLog(data: typeof maintenanceLogs.$inferInsert) {
  const db = await getDb();
  const [row] = await db.insert(maintenanceLogs).values(data).returning();
  return row;
}

export async function getMaintenanceLogsByRequest(
  requestId: string,
  includeInternal: boolean,
): Promise<MaintenanceLogWithAuthor[]> {
  const db = await getDb();
  const { eq, and, or } = await import("drizzle-orm");

  const query = db
    .select({
      id: maintenanceLogs.id,
      requestId: maintenanceLogs.requestId,
      authorId: maintenanceLogs.authorId,
      content: maintenanceLogs.content,
      isInternal: maintenanceLogs.isInternal,
      createdAt: maintenanceLogs.createdAt,
      authorFirstName: profiles.firstName,
      authorLastName: profiles.lastName,
      authorRole: profiles.role,
    })
    .from(maintenanceLogs)
    .innerJoin(profiles, eq(maintenanceLogs.authorId, profiles.id))
    .where(
      includeInternal
        ? eq(maintenanceLogs.requestId, requestId)
        : and(
            eq(maintenanceLogs.requestId, requestId),
            or(eq(maintenanceLogs.isInternal, false), sql`is_internal = 0`),
          ),
    )
    .orderBy(maintenanceLogs.createdAt);

  const rows = await query;
  return rows.map((r: any) => ({
    id: r.id,
    requestId: r.requestId,
    authorId: r.authorId,
    content: r.content,
    isInternal: Boolean(r.isInternal),
    createdAt: r.createdAt ?? "",
    authorName: `${r.authorFirstName} ${r.authorLastName}`,
    authorRole: r.authorRole,
  }));
}

export async function generateRentInvoices(landlordId: string): Promise<number> {
  const db = await getDb();
  const { eq, and, like, inArray } = await import("drizzle-orm");

  // 1. Get properties owned by landlord
  const landlordProps = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.landlordId, landlordId));

  if (landlordProps.length === 0) return 0;
  const propIds = landlordProps.map((p: any) => p.id);

  // 2. Get units under these properties
  const allUnits = await db
    .select({ id: units.id, unitNumber: units.unitNumber, propertyId: units.propertyId })
    .from(units)
    .where(inArray(units.propertyId, propIds));

  if (allUnits.length === 0) return 0;
  const unitIds = allUnits.map((u: any) => u.id);

  // 3. Get active leases
  const activeLeases = await db
    .select()
    .from(leases)
    .where(and(inArray(leases.unitId, unitIds), eq(leases.status, "active")));

  if (activeLeases.length === 0) return 0;

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`; // e.g. "2026-05"
  const defaultDueDate = `${currentMonthStr}-01`;

  let invoicesGenerated = 0;

  for (const lease of activeLeases) {
    // Skip future leases (lease.startDate is in the future)
    const todayStr = today.toISOString().split("T")[0];
    if (lease.startDate > todayStr) continue;

    // Get primary tenant
    const [primaryTenantLink] = await db
      .select({ profileId: leaseTenants.profileId })
      .from(leaseTenants)
      .where(and(eq(leaseTenants.leaseId, lease.id), eq(leaseTenants.isPrimary, true)))
      .limit(1);

    if (!primaryTenantLink) continue;

    // Check if invoice already exists for this lease and tenant in the current month
    const existing = await db
      .select()
      .from(paymentsTable)
      .where(
        and(
          eq(paymentsTable.leaseId, lease.id),
          eq(paymentsTable.tenantId, primaryTenantLink.profileId),
          like(paymentsTable.dueDate, `${currentMonthStr}%`),
        ),
      )
      .limit(1);

    if (existing.length > 0) continue; // Invoice already generated for this month

    // Create new rent payment
    const paymentId = crypto.randomUUID();
    await db.insert(paymentsTable).values({
      id: paymentId,
      leaseId: lease.id,
      tenantId: primaryTenantLink.profileId,
      amount: lease.monthlyRent,
      category: "rent",
      dueDate: defaultDueDate,
      status: "pending",
    });

    // Create notification for the tenant
    const unit = allUnits.find((u: any) => u.id === lease.unitId);
    const [property] = await db
      .select({ name: properties.name })
      .from(properties)
      .where(eq(properties.id, unit?.propertyId ?? ""))
      .limit(1);

    await db.insert(notificationsTable).values({
      id: crypto.randomUUID(),
      recipientId: primaryTenantLink.profileId,
      type: "payment",
      title: "New Rent Invoice Posted",
      body: `A new rent payment of $${(lease.monthlyRent / 100).toLocaleString()} is due on ${defaultDueDate} for Apt ${unit?.unitNumber || ""} (${property?.name || ""}).`,
      isRead: false,
    });

    invoicesGenerated++;
  }

  return invoicesGenerated;
}

export type ActiveLeaseRow = {
  leaseId: string;
  tenantId: string;
  tenantName: string;
  unitLabel: string;
  monthlyRent: number;
};

export async function getLandlordActiveLeases(landlordId: string): Promise<ActiveLeaseRow[]> {
  const db = await getDb();
  await autoExpireLeases(db);
  const { eq, and } = await import("drizzle-orm");

  const rows = await db.all(sql`
    SELECT
      l.id AS lease_id,
      p.id AS profile_id,
      p.first_name,
      p.last_name,
      prop.name AS prop_name,
      u.unit_number,
      l.monthly_rent,
      l.start_date,
      l.end_date
    FROM properties prop
    INNER JOIN units u ON u.id = prop.id
    INNER JOIN leases l ON l.unit_id = u.id AND l.status = 'active'
    INNER JOIN lease_tenants lt ON lt.lease_id = l.id
    INNER JOIN profiles p ON p.id = lt.profile_id
    WHERE prop.landlord_id = ${landlordId}
  `) as any[];

  // Deduplicate: if a unit has multiple active leases, prefer the one covering today
  const todayStr = new Date().toISOString().split("T")[0];
  const byUnitTenant = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    const key = `${row.unit_number}__${row.profile_id}`;
    const existing = byUnitTenant.get(key);
    if (!existing) {
      byUnitTenant.set(key, row);
    } else {
      const existingCovers = existing.start_date <= todayStr && existing.end_date >= todayStr;
      const newCovers = row.start_date <= todayStr && row.end_date >= todayStr;
      if (newCovers && !existingCovers) {
        byUnitTenant.set(key, row);
      }
    }
  }

  return Array.from(byUnitTenant.values()).map((r) => ({
    leaseId: r.lease_id,
    tenantId: r.profile_id,
    tenantName: `${r.first_name} ${r.last_name}`,
    unitLabel: `${r.prop_name} · ${r.unit_number}`,
    monthlyRent: r.monthly_rent / 100,
  }));
}

export async function createManualPayment(
  landlordId: string,
  data: {
    leaseId: string;
    tenantId: string;
    amount: number; // in cents
    category: "rent" | "deposit" | "utility" | "late_fee";
    paidDate: string;
  },
) {
  const db = await getDb();
  const { eq } = await import("drizzle-orm");

  // Verify landlord owns the property/lease
  const [lease] = await db.select().from(leases).where(eq(leases.id, data.leaseId)).limit(1);
  if (!lease) throw new Error("Lease not found");
  const [unit] = await db.select().from(units).where(eq(units.id, lease.unitId)).limit(1);
  if (!unit) throw new Error("Unit not found");
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, unit.propertyId))
    .limit(1);
  if (!property || property.landlordId !== landlordId) {
    throw new Error("Unauthorized to log payment for this lease");
  }

  const paymentId = crypto.randomUUID();
  const [payment] = await db
    .insert(paymentsTable)
    .values({
      id: paymentId,
      leaseId: data.leaseId,
      tenantId: data.tenantId,
      amount: data.amount,
      category: data.category,
      dueDate: data.paidDate,
      paidDate: data.paidDate,
      status: "paid",
      transactionId: "Manual (Cash/Check)",
    })
    .returning();

  // Get tenant details for logs and email
  const [tenant] = await db
    .select({ firstName: profiles.firstName, lastName: profiles.lastName, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, data.tenantId))
    .limit(1);
  const tenantName = tenant ? `${tenant.firstName} ${tenant.lastName}` : "Tenant";

  // Log Activity
  await db.insert(activityLogs).values({
    id: crypto.randomUUID(),
    actorId: landlordId,
    actionType: "PAYMENT_RECEIVED",
    description: `Manual payment of $${(data.amount / 100).toLocaleString()} logged for ${tenantName} (Apt ${unit.unitNumber}).`,
  });

  // Email Tenant (Receipt)
  if (tenant && tenant.email) {
    try {
      const amountStr = `$${(data.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      const subject = `[Receipt] Rent Payment Logged Manually - Apt ${unit.unitNumber}`;
      const text = `Hello ${tenant.firstName},

This email confirms that a manual rent payment has been logged for Apt ${unit.unitNumber} (${property.name}):

Receipt Reference: ${payment.id}
Amount Logged: ${amountStr}
Payment Category: ${data.category === "rent" ? "Rent" : data.category === "deposit" ? "Security Deposit" : data.category === "utility" ? "Utility" : "Late Fee"}
Payment Method: Manual (Cash/Check/Direct)
Date Logged: ${data.paidDate}

Status: Paid

If you have any questions, please contact your landlord.

Best regards,
PropEase Billing`;

      const html = `<p>Hello ${tenant.firstName},</p>
<p>This email confirms that a manual rent payment has been logged for <strong>Apt ${unit.unitNumber} (${property.name})</strong>:</p>
<table style="border: 1px solid #ccc; padding: 10px; border-collapse: collapse;">
  <tr><td><strong>Receipt Reference:</strong></td><td>${payment.id}</td></tr>
  <tr><td><strong>Amount Logged:</strong></td><td><strong>${amountStr}</strong></td></tr>
  <tr><td><strong>Category:</strong></td><td style="text-transform: capitalize;">${data.category.replace("_", " ")}</td></tr>
  <tr><td><strong>Payment Method:</strong></td><td>Manual (Cash/Check/Direct)</td></tr>
  <tr><td><strong>Date Logged:</strong></td><td>${data.paidDate}</td></tr>
  <tr><td><strong>Status:</strong></td><td><span style="color: green; font-weight: bold;">Paid</span></td></tr>
</table>
<p>If you have any questions, please contact your landlord.</p>
<p>Best regards,<br/>PropEase Billing</p>`;

      const { enqueueEmail } = await import("../lib/email-queue");
      enqueueEmail({ to: tenant.email, subject, html, text });
    } catch (err) {
      console.error("Failed to send tenant manual payment receipt email:", err);
    }
  }

  return payment;
}

export async function terminateLease(landlordId: string, leaseId: string) {
  const db = await getDb();
  const { eq, and } = await import("drizzle-orm");

  // 1. Verify landlord ownership
  const [lease] = await db.select().from(leases).where(eq(leases.id, leaseId)).limit(1);
  if (!lease) throw new Error("Lease not found");
  const [unit] = await db.select().from(units).where(eq(units.id, lease.unitId)).limit(1);
  if (!unit) throw new Error("Unit not found");
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, unit.propertyId))
    .limit(1);
  if (!property || property.landlordId !== landlordId) {
    throw new Error("Unauthorized to terminate this lease.");
  }

  // 2. Update lease status
  const [updatedLease] = await db
    .update(leases)
    .set({ status: "terminated", updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(leases.id, leaseId))
    .returning();

  // 3. Set unit back to vacant
  await db
    .update(units)
    .set({ status: "vacant", updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(units.id, lease.unitId));

  // 4. Log activity
  const [tenantLink] = await db
    .select()
    .from(leaseTenants)
    .where(eq(leaseTenants.leaseId, leaseId))
    .limit(1);
  let tenantName = "Tenant";
  if (tenantLink) {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, tenantLink.profileId))
      .limit(1);
    if (profile) tenantName = `${profile.firstName} ${profile.lastName}`;
  }

  await db.insert(activityLogs).values({
    id: crypto.randomUUID(),
    actorId: landlordId,
    actionType: "LEASE_TERMINATED",
    description: `Lease terminated early for ${tenantName} (Apt ${unit.unitNumber}).`,
  });

  return updatedLease;
}

export async function renewLease(
  landlordId: string,
  leaseId: string,
  newEndDate: string,
  newMonthlyRentCents: number,
) {
  const db = await getDb();
  const { eq } = await import("drizzle-orm");

  // 1. Verify landlord ownership
  const [oldLease] = await db.select().from(leases).where(eq(leases.id, leaseId)).limit(1);
  if (!oldLease) throw new Error("Lease not found");
  const [unit] = await db.select().from(units).where(eq(units.id, oldLease.unitId)).limit(1);
  if (!unit) throw new Error("Unit not found");
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, unit.propertyId))
    .limit(1);
  if (!property || property.landlordId !== landlordId) {
    throw new Error("Unauthorized to renew this lease.");
  }

  // 2. Calculate new start date (day after old lease ends)
  const oldEnd = new Date(oldLease.endDate);
  const nextDay = new Date(oldEnd);
  nextDay.setDate(nextDay.getDate() + 1);
  const newStartDateStr = nextDay.toISOString().split("T")[0];

  // 3. Create new lease (old lease remains active until its end date has passed)
  const newLeaseId = crypto.randomUUID();
  const [newLease] = await db
    .insert(leases)
    .values({
      id: newLeaseId,
      unitId: oldLease.unitId,
      startDate: newStartDateStr,
      endDate: newEndDate,
      monthlyRent: newMonthlyRentCents,
      securityDeposit: oldLease.securityDeposit, // Carry over deposit
      status: "active",
    })
    .returning();

  // 5. Copy tenants to new lease
  const oldLinks = await db.select().from(leaseTenants).where(eq(leaseTenants.leaseId, leaseId));
  let primaryTenantName = "Tenant";

  for (const link of oldLinks) {
    await db.insert(leaseTenants).values({
      leaseId: newLeaseId,
      profileId: link.profileId,
      isPrimary: link.isPrimary,
    });

    if (link.isPrimary) {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, link.profileId))
        .limit(1);
      if (profile) primaryTenantName = `${profile.firstName} ${profile.lastName}`;
    }
  }

  // 6. Log activity
  await db.insert(activityLogs).values({
    id: crypto.randomUUID(),
    actorId: landlordId,
    actionType: "LEASE_RENEWED",
    description: `Lease renewed for ${primaryTenantName} (Apt ${unit.unitNumber}) until ${newEndDate} at $${(newMonthlyRentCents / 100).toLocaleString()}/mo.`,
  });

  return newLease;
}
