# PropEase — Unified Project Progress Logs

This document contains a unified, chronological log of all recent development progress, bug fixes, architecture decisions, and verification steps in the PropEase repository.

---

## Progress Log: May 26, 2026 — Phase 7 Polish & Bug Fixes

### 🚀 Accomplishments

Today we successfully completed Phase 7 Polish & Bug Fixes, resolving multiple critical bugs and UX improvements across unit management, tenant onboarding, financials, Kanban workflows, lease renewals, and responsive layouts. All changes are type-safe.

### 1. Unit Management

- **Unit Creation Reactivity**: Updated `handleCreateUnit` in `admin.properties.tsx` to automatically re-fetch and update the local state `unitsMap[activeProperty]` after a unit is successfully added, eliminating the need for manual refreshes.
- **Unit Editing**:
  - Added the `updateUnit` query in `queries.ts` and the `updateUnitFn` server function in `property-server.ts`.
  - Implemented an **Edit Unit Dialog** in `admin.properties.tsx` to modify unit numbers, rent, dimensions, and status.
  - Restricted manual status transitions to "Occupied" if no tenant is actively linked to the unit.

### 2. Tenant Onboarding

- **Unit Selection ($NaN Bug)**: Fixed selector rendering in the invite modal of `admin.tenants.tsx` by correctly mapping property attributes to `u.number` and `u.rent`. Added auto-population of the rent amount field upon unit selection.
- **Dynamic Onboarding Flow**:
  - Refactored `getInviteDetailsFn` to perform an `emailExists` check in the database.
  - Configured controlled `Tabs` in `auth.tsx` to dynamically default to **Sign-In** (if the invite email already exists) or **Sign-Up** (if they are a new user).
- **Lease Re-joining**: Extracted invite-acceptance logic into a shared `processAcceptedInvite` function in `auth-server.ts`, running it on both registration (OTP) and login (sign-in) flows to allow terminated tenants to rejoin a lease.

### 3. Financials & Invoicing

- **Rent Due Timing**: Removed immediate rent payment creation upon invite acceptance. Rent invoices are now only generated when the landlord executes the dispatch action.
- **Dashboard Enhancements**: Added "Monthly Rent" info to the welcome card on the Tenant Dashboard (`tenant.index.tsx`).
- **Billing Period Rules**: Updated `generateRentInvoices` in `queries.ts` to skip leases that have a future start date.

### 4. Kanban & Maintenance Workflow

- **Unassigned Card Lock**: Added validation to block drag-and-drop or manual status transitions out of "Open" status if no worker has been assigned to the request (enforced both client-side and server-side).
- **Role Permissions**: Restricted workers (role `maintenance` or `service`) from setting requests to "Resolved" (only landlords/managers can resolve; workers can only request approval via "Pending Approval").

### 5. Lease Renewal Logic & Sorting

- **Lease Expiry Rules**: Prevented early lease renewals from immediately marking the active lease as `"expired"`.
- **Auto-Expiry System**: Added `autoExpireLeases` to query handlers to automatically mark past leases as `"expired"` once their end date passes.
- **Active Lease Selector**: Updated dashboard and list queries to select the date-appropriate active lease, resolving duplicate tenant row displays and premature rent inflation.

### 6. UI/UX & Responsiveness

- **Recent Activity Layout**: Removed the `truncate` class on Recent Activity log descriptions in `admin.index.tsx`, replacing it with `break-words whitespace-pre-wrap` to allow description text to wrap on small mobile devices.

### ⚡ Verification Results

- Ran `npx tsc --noEmit` on the workspace, completing with **exit code 0 (no errors)**.

---

## Progress Log: May 25, 2026 — Stripe Billing & Notifications

### 🚀 Accomplishments

Completed Phase 3 (Stripe Billing & Rent Ledger Sandbox) and Phase 4 (Notifications & Email Dispatcher).

### 1. Stripe Billing & Rent Ledger (Phase 3)

- **Invoice Generation**: Landlords can trigger rent invoice creation for active leases for the current calendar month (`YYYY-MM`).
- **Sandbox Card Processing**: Added full payment flow inside the tenant dashboard. Included a mock decline card (`4000 0000 0000 3220`) to test Stripe decline views and a success card (`4242 4242 4242 4242`) to complete rent balance clearing.
- **Manual Payments**: Landlords can log physical payments (Cash, Check, Direct Deposit) for active tenants.
- **Receipts & Ledger**: Created rent ledger tables in both landlord and tenant portals, complete with a clean receipt modal and browser-print options.
- **Global Toasts**: Registered the React Sonner `<Toaster />` in the root app shell for visible alerts.

### 2. Notifications & Email Dispatcher (Phase 4)

- **Email Helper**: Created `email.ts` to log email payloads in a beautiful double-line bordered ASCII box in the dev CLI console.
- **Invitation Alerts**: Landlords sending onboarding links trigger emails containing the sign-up link (`/auth?invite=[id]`) and lease summaries.
- **Maintenance Alerts**:
  - Tenants filing requests triggers a notice email to the landlord detailing the issue.
  - Landlords assigning/changing workers on requests sends a task assignment email to the worker.
- **Payment Confirmed Emails**:
  - Renter payments trigger receipt emails to tenants and notification emails to landlords.
  - Manual landlord logs trigger receipt confirmation emails to tenants.

### 📁 Files Created & Modified

- **New Files**:
  - `email.ts`: Custom ASCII email renderer for development.
- **Modified Files**:
  - `queries.ts`: Added `generateRentInvoices`, `createManualPayment`, `payTenantPayment` hooks, resolved TypeScript strict errors, and integrated email dispatches.
  - `data-server.ts`: Exposed manual payments, sandbox card handling, and hooked up maintenance emails.
  - `property-server.ts`: Integrated invitation email notifications on token generation.
  - `__root.tsx`: Mounted `<Toaster />`.
  - `admin.payments.tsx`: Wired "Send Invoices", manual logging dialog, and print receipts.
  - `tenant.pay.tsx`: Wired payment ledger history, card decline validations, and tenant receipts.

---

## Progress Log: May 21, 2026 — Auth Gates & Maintenance Kanban

### 🚀 Accomplishments

Implemented robust user authentication/verification gates and the interactive Maintenance Kanban board.

### 1. Authentication, Verification & Profile Creation

- **Gmail Restriction**: Signups are strictly limited to `@gmail.com` email addresses. Non-Gmail signup attempts return a validation error.
- **Pre-Verification Requirement**: A profile is _only_ created in the database after the user's email has been verified via a one-time passcode (OTP).
- **OTP Request & Temporary Storage (`requestSignUpOtpFn`)**:
  - Generates a random 6-digit verification code.
  - Hashes the password and serializes the registration data (first name, last name, password hash, role, and any invite tokens) into a temporary JSON payload.
  - Saves this record inside a new `verification_codes` schema table in SQLite, set to expire in 15 minutes.
  - **Local Delivery**: Prints a clearly demarcated verification card to the npm development server CLI console.
- **OTP Verification & Account Provisioning (`verifyOtpAndSignUpFn`)**:
  - In local development (`DEV` mode), a universal bypass code of `"000000"` is supported.
  - Once verified, the database record is cleared, the profile is formally created, and any incoming property invitation tokens are accepted (updating leases, establishing primary tenant links, generating initial invoices, and marking the unit as `"occupied"`).
  - Generates a JWT session token and sets it as an HTTP-only, secure cookie (`propease_session`).

### 2. Interactive Maintenance Kanban Board

- **Restricted Worker Assignment**: Modified `queries.ts` to filter out landlords and managers, ensuring assignees can only be users with the role `"maintenance"` or `"service"`.
- **Forbidden Status Regression (No Drag-Back-To-Open)**:
  - Once a maintenance request transitions to `"in_progress"` or `"resolved"`, it cannot be returned to `"pending"` (Open).
  - Drag and drop constraints reject regression attempts.
- **Global Unit Status Propagation**:
  - Database queries use an atomic database transaction in `updateMaintenanceRequest()` to synchronize statuses globally across the application.
  - **In Progress**: When a maintenance request status changes to `"in_progress"`, the associated unit's status is automatically set to `"maintenance"`.
  - **Resolved**: When a request status updates to `"resolved"`, the system queries for an active lease on that unit. If an active lease exists, the unit reverts to `"occupied"`; otherwise, it reverts to `"vacant"`.

---

## Progress Log: May 27, 2026 — Cloudflare Production Deployment & Context Binding Fixes

### 🚀 Accomplishments

Today we successfully resolved the Cloudflare Workers subdomain configuration, initialized fresh local and remote databases, fixed missing Cloudflare environment bindings in production, and deployed the production app live.

### 1. Cloudflare Workers Subdomain Setup

- Guided the registration of the free `rach-dev0731.workers.dev` subdomain on the Cloudflare dashboard.
- Verified active production Worker URLs on Cloudflare's edge.

### 2. Database Wipes & Migration Reset

- Cleared out the local `.wrangler` state database cache completely to reset all sandbox test data.
- Re-ran local migrations: `npx wrangler d1 migrations apply propease-db --local` to initialize empty schemas.
- Confirmed the newly created remote Cloudflare D1 database (`propease-db`) started with a completely fresh, empty migrated schema.
- Restarted the local development server at `http://localhost:8080/`.

### 3. Production Environment Binding Fixes

- **Binding Resolution**: Fixed the bug where the Cloudflare D1 database binding `DB` and R2 bucket binding `BUCKET` were throwing _"not found in process.env or globalThis"_ exceptions in production.
- **Custom Server Entry**: Created a custom server entry point (`src/server.ts`) using the `createServerEntry` utility. It intercepts the Cloudflare Worker's `fetch` handler and stores the `env` bindings in a request-scoped `AsyncLocalStorage` container before delegating requests.
- **Modified Files**:
  - `src/server.ts`: Custom server entry point capturing Cloudflare bindings inside a request context.
  - `src/db/index.ts`: Rewrote `getDb()` to query the active `AsyncLocalStorage` server context.
  - `src/lib/document-server.ts`: Rewrote `getBucket()` to fetch R2 bindings from the custom entry storage.
  - `src/lib/auth-crypto.ts`: Replaced static module-level `JWT_SECRET` imports with a dynamic, context-aware `getJwtSecret()` helper.

### ⚡ Verification & Build Results

- Tested and verified type safety with `npx tsc --noEmit` (**exit code 0**).
- Successfully compiled the production bundle with `npm run build`.
- Deployed the application live using `npx wrangler deploy --config dist/server/wrangler.json`.
- **Production URL**: [https://propease.rach-dev0731.workers.dev](https://propease.rach-dev0731.workers.dev)

---

## Progress Log: May 28, 2026 — Stripe Checkout & OAuth Integrations

### 🚀 Accomplishments

Today we successfully wired real-world integrations for secure tenant payments and Google authentication.

### 1. Stripe Checkout Integration

- **Session Generation**: Created `stripe-server.ts` server functions to spawn secure Stripe Checkout sessions based on active tenant balances.
- **Payment Verification**: Implemented dynamic redirect callbacks that verify checkout session IDs in the URL on route load, processing database logs automatically.
- **Ledger Upgrades**: Updated the payments ledger and receipts modals to render secure transaction references and Stripe Checkout transaction signatures.

### 2. Error Handling & OAuth Polish

- **Router Trapping Bug**: Resolved a TanStack Router bug where loaders trapping authentication errors accidentally caught the redirect errors, resetting successful sign-ins back to login.
- **Base64Url Token Padding**: Fixed `atob()` decoding failures in worker runtimes by dynamically appending base64 padding to Google client credential tokens.
- **Unit Creation Alerts**: Configured Sonner `toast.error` popups in unit creation forms to alert managers of database failures, resolving spinner lock bugs.
- **Wrangler Environment Safety**: Guarded email dispatcher process env queries to prevent Worker crashes on local server runs.

### 📁 Files Created & Modified

- **New Files**:
  - `src/lib/stripe-server.ts`: Stripe session controller server utility.
  - `.dev.vars.example`: Example environment file.
- **Modified Files**:
  - `src/db/queries.ts`: Added `payTenantPaymentWithStripe` query.
  - `src/routes/tenant.pay.tsx`: Refactored form inputs to Stripe checkout trigger.
  - `src/routes/auth.oauth-callback.tsx`: Standardized isRedirect check in route catch blocks.
  - `src/routes/admin.properties.tsx`: Wired toast validations for property/unit creation.
  - `src/lib/email.ts`: Secured env checks.
  - `.gitignore`: Ignored client secret credentials.

---

## Progress Log: May 30, 2026 — Brevo Transactional Email Integration

### 🚀 Accomplishments

Today we integrated Brevo (formerly Sendinblue) as the primary transactional email delivery service. This enables real-world email delivery (for sign-up OTPs, tenant onboarding links, maintenance ticket assignments, and payment receipts) without the strict domain verification restrictions imposed by Resend.

### 1. Multi-Provider Email Architecture

- **Flexible Configurations**: Updated `src/lib/email.ts` to support both Brevo and Resend integrations.
- **Auto-Detect Delivery**: The dispatch logic checks for `BREVO_API_KEY` first, falls back to `RESEND_API_KEY` if present, and defaults to print formatted ASCII email bodies in the local developer console if no keys are found.
- **Brevo SMTP API**: Structured request payloads to target the `/v3/smtp/email` endpoint, complete with custom sender details (`BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME`).

### 2. Configuration & Typings

- Added placeholder keys to `.dev.vars.example` and local `.dev.vars` configurations for easy setup.
- Validated types across the workspace.

### 📁 Files Created & Modified

- **Modified Files**:
  - `src/lib/email.ts`: Added `getBrevoConfig` and integrated Brevo API sending logic.
  - `.dev.vars.example`: Documented new environment keys.
  - `.dev.vars`: Added local placeholder variables.
