// Mock data shared across the PropEase UI shell.

export const properties = [
  { id: "p1", name: "Maple Heights", address: "1200 Maple Ave, Brooklyn, NY", units: 24, occupied: 21 },
  { id: "p2", name: "Riverside Lofts", address: "88 River St, Hoboken, NJ", units: 18, occupied: 16 },
  { id: "p3", name: "Sunset Court", address: "455 Sunset Blvd, Jersey City, NJ", units: 12, occupied: 9 },
];

export type UnitStatus = "occupied" | "vacant" | "notice";
export const units: Array<{
  id: string; propertyId: string; number: string; status: UnitStatus;
  tenant?: string; rent: number; sqft: number; beds: number; baths: number;
}> = [
  { id: "u1", propertyId: "p1", number: "101", status: "occupied", tenant: "Sarah Chen", rent: 2400, sqft: 720, beds: 1, baths: 1 },
  { id: "u2", propertyId: "p1", number: "102", status: "occupied", tenant: "Marcus Hill", rent: 2600, sqft: 820, beds: 2, baths: 1 },
  { id: "u3", propertyId: "p1", number: "103", status: "vacant", rent: 2500, sqft: 780, beds: 1, baths: 1 },
  { id: "u4", propertyId: "p1", number: "201", status: "notice", tenant: "Priya Patel", rent: 2800, sqft: 900, beds: 2, baths: 2 },
  { id: "u5", propertyId: "p1", number: "202", status: "occupied", tenant: "Diego Romero", rent: 2700, sqft: 870, beds: 2, baths: 1 },
  { id: "u6", propertyId: "p1", number: "203", status: "occupied", tenant: "Aisha Khan", rent: 2750, sqft: 880, beds: 2, baths: 2 },
  { id: "u7", propertyId: "p2", number: "1A", status: "occupied", tenant: "Tom Becker", rent: 3200, sqft: 1100, beds: 2, baths: 2 },
  { id: "u8", propertyId: "p2", number: "1B", status: "vacant", rent: 3100, sqft: 1050, beds: 2, baths: 2 },
  { id: "u9", propertyId: "p3", number: "12", status: "notice", tenant: "Maya Singh", rent: 1950, sqft: 600, beds: 1, baths: 1 },
];

export const tenants = [
  { id: "t1", name: "Sarah Chen", email: "sarah.chen@example.com", phone: "(555) 010-1234", unit: "Maple Heights · 101", moveIn: "2023-04-01", leaseEnd: "2025-03-31", rent: 2400, status: "Active" },
  { id: "t2", name: "Marcus Hill", email: "marcus@example.com", phone: "(555) 010-2222", unit: "Maple Heights · 102", moveIn: "2022-08-15", leaseEnd: "2025-08-14", rent: 2600, status: "Active" },
  { id: "t3", name: "Priya Patel", email: "priya@example.com", phone: "(555) 010-3333", unit: "Maple Heights · 201", moveIn: "2021-06-01", leaseEnd: "2025-05-31", rent: 2800, status: "Notice" },
  { id: "t4", name: "Diego Romero", email: "diego@example.com", phone: "(555) 010-4444", unit: "Maple Heights · 202", moveIn: "2023-11-01", leaseEnd: "2025-10-31", rent: 2700, status: "Active" },
  { id: "t5", name: "Aisha Khan", email: "aisha@example.com", phone: "(555) 010-5555", unit: "Maple Heights · 203", moveIn: "2024-01-15", leaseEnd: "2026-01-14", rent: 2750, status: "Active" },
  { id: "t6", name: "Tom Becker", email: "tom@example.com", phone: "(555) 010-6666", unit: "Riverside Lofts · 1A", moveIn: "2022-03-01", leaseEnd: "2025-06-30", rent: 3200, status: "Active" },
];

export const revenueSeries = [
  { month: "Nov", revenue: 118400 },
  { month: "Dec", revenue: 121200 },
  { month: "Jan", revenue: 124800 },
  { month: "Feb", revenue: 122900 },
  { month: "Mar", revenue: 128600 },
  { month: "Apr", revenue: 132400 },
];

export const unitStatusBreakdown = [
  { name: "Occupied", value: 46, key: "occupied" },
  { name: "Vacant", value: 6, key: "vacant" },
  { name: "Notice Given", value: 2, key: "notice" },
];

export const maintenanceResponse = [
  { day: "Mon", hours: 4.2 },
  { day: "Tue", hours: 3.1 },
  { day: "Wed", hours: 5.5 },
  { day: "Thu", hours: 2.8 },
  { day: "Fri", hours: 3.4 },
  { day: "Sat", hours: 6.1 },
  { day: "Sun", hours: 5.2 },
];

export const activity = [
  { id: "a1", type: "payment", text: "Sarah Chen paid $2,400 rent", time: "12 min ago" },
  { id: "a2", type: "maintenance", text: "New maintenance: Leaking faucet — Unit 102", time: "1 hr ago" },
  { id: "a3", type: "lease", text: "Lease for Priya Patel expires in 45 days", time: "3 hr ago" },
  { id: "a4", type: "payment", text: "Diego Romero paid $2,700 rent", time: "5 hr ago" },
  { id: "a5", type: "maintenance", text: "Resolved: HVAC repair — Unit 1A", time: "Yesterday" },
];

export const leaseAlerts = [
  { tenant: "Priya Patel", unit: "Maple Heights · 201", endsIn: 45, date: "May 31, 2025" },
  { tenant: "Sarah Chen", unit: "Maple Heights · 101", endsIn: 58, date: "Jun 13, 2025" },
];

export type Priority = "Emergency" | "High" | "Medium" | "Low";
export type RequestStatus = "Open" | "In Progress" | "Awaiting Parts" | "Resolved";
export const maintenanceRequests: Array<{
  id: string; title: string; unit: string; tenant: string;
  category: string; priority: Priority; status: RequestStatus;
  submitted: string; assigned?: string;
}> = [
  { id: "r1", title: "Leaking kitchen faucet", unit: "Maple Heights · 102", tenant: "Marcus Hill", category: "Plumbing", priority: "Medium", status: "Open", submitted: "Apr 16" },
  { id: "r2", title: "AC not cooling", unit: "Riverside Lofts · 1A", tenant: "Tom Becker", category: "HVAC", priority: "High", status: "In Progress", submitted: "Apr 15", assigned: "Jorge Vega" },
  { id: "r3", title: "Outlet sparks in bedroom", unit: "Maple Heights · 203", tenant: "Aisha Khan", category: "Electrical", priority: "Emergency", status: "In Progress", submitted: "Apr 17", assigned: "Liam O'Connor" },
  { id: "r4", title: "Dishwasher won't drain", unit: "Maple Heights · 202", tenant: "Diego Romero", category: "Appliance", priority: "Low", status: "Awaiting Parts", submitted: "Apr 12", assigned: "Jorge Vega" },
  { id: "r5", title: "Broken blinds", unit: "Sunset Court · 12", tenant: "Maya Singh", category: "Other", priority: "Low", status: "Resolved", submitted: "Apr 09" },
  { id: "r6", title: "Hallway light out", unit: "Maple Heights · 101", tenant: "Sarah Chen", category: "Electrical", priority: "Low", status: "Open", submitted: "Apr 18" },
];

export const payments = [
  { id: "pay1", tenant: "Sarah Chen", unit: "MH · 101", amount: 2400, due: "Apr 1", status: "Paid" },
  { id: "pay2", tenant: "Marcus Hill", unit: "MH · 102", amount: 2600, due: "Apr 1", status: "Paid" },
  { id: "pay3", tenant: "Priya Patel", unit: "MH · 201", amount: 2800, due: "Apr 1", status: "Late" },
  { id: "pay4", tenant: "Diego Romero", unit: "MH · 202", amount: 2700, due: "Apr 1", status: "Paid" },
  { id: "pay5", tenant: "Aisha Khan", unit: "MH · 203", amount: 2750, due: "Apr 1", status: "Pending" },
  { id: "pay6", tenant: "Tom Becker", unit: "RL · 1A", amount: 3200, due: "Apr 1", status: "Paid" },
  { id: "pay7", tenant: "Maya Singh", unit: "SC · 12", amount: 1950, due: "Apr 1", status: "Pending" },
];

export const notifications = [
  { id: "n1", type: "payment", title: "Rent received", body: "Sarah Chen paid $2,400", time: "12 min ago" },
  { id: "n2", type: "maintenance", title: "New request", body: "Leaking faucet in Unit 102", time: "1 hr ago" },
  { id: "n3", type: "announce", title: "Building notice posted", body: "Water shutoff Sat 9–11am", time: "Yesterday" },
  { id: "n4", type: "payment", title: "Payment late", body: "Priya Patel — $2,800 overdue", time: "2 days ago" },
];

// Tenant portal mock (logged-in tenant: Sarah Chen)
export const tenantMe = {
  name: "Sarah Chen",
  unit: "Maple Heights · Apt 101",
  rent: 2400,
  dueDate: "May 1, 2025",
  balance: 2400,
  leaseEnd: "Mar 31, 2026",
  documents: [
    { id: "d1", name: "Lease Agreement 2024.pdf", size: "1.2 MB" },
    { id: "d2", name: "Move-in Inspection.pdf", size: "640 KB" },
    { id: "d3", name: "Building Rules.pdf", size: "210 KB" },
  ],
  history: [
    { id: "h1", date: "Apr 1, 2025", amount: 2400, status: "Paid" },
    { id: "h2", date: "Mar 1, 2025", amount: 2400, status: "Paid" },
    { id: "h3", date: "Feb 1, 2025", amount: 2400, status: "Paid" },
    { id: "h4", date: "Jan 1, 2025", amount: 2400, status: "Paid" },
  ],
  requests: [
    { id: "mr1", title: "Hallway light out", status: "Open", date: "Apr 18" },
    { id: "mr2", title: "Slow bathroom drain", status: "Resolved", date: "Mar 22" },
  ],
};
