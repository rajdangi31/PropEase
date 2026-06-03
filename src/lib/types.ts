import { InferSelectModel } from "drizzle-orm";
import * as schema from "../db/schema";

// ─── Base Entity Types ──────────────────────────────────────────

export type Profile = InferSelectModel<typeof schema.profiles>;
export type Property = InferSelectModel<typeof schema.properties>;
export type Unit = InferSelectModel<typeof schema.units>;
export type Lease = InferSelectModel<typeof schema.leases>;
export type MaintenanceRequest = InferSelectModel<typeof schema.maintenanceRequests>;
export type MaintenanceLog = InferSelectModel<typeof schema.maintenanceLogs>;
export type Payment = InferSelectModel<typeof schema.payments>;
export type Notification = InferSelectModel<typeof schema.notifications>;
export type Document = InferSelectModel<typeof schema.documents>;
export type Invitation = InferSelectModel<typeof schema.invitations>;

// ─── Extended / Joined Types ────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  role: "landlord" | "tenant" | "admin" | "manager" | "maintenance" | "service";
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface MaintenanceRequestWithDetails extends MaintenanceRequest {
  tenant: string;
  unit: string;
  assigned: string | null;
  submitted: string;
  category: string;
  rawPriority: MaintenanceRequest["priority"];
  rawStatus: MaintenanceRequest["status"];
}

export interface WorkerWithRole extends Profile {
  name: string;
}

export interface PropertyWithStats extends Property {
  unitsCount: number;
  occupancyRate: number;
}
