# Project Changelog

This document tracks all significant modifications and feature additions made to the codebase.

## [2026-05-31] - Security Fixes & Advanced Property Search

### Security and Architecture Fixes
- **Authentication Resilience**: Removed hardcoded `JWT_SECRET` fallbacks in `src/lib/auth-crypto.ts` to prevent trivial session forging on missing environments.
- **Resource Ownership Guards**: 
  - Enforced landlord ID verification in `src/lib/property-server.ts` for reading units, creating units, and managing property invitations.
  - Hardened document fetching in `src/lib/document-server.ts` to verify the requesting landlord actively owns the specific tenant's unit.
- **Role Routing Enforcement**: Added a hard check for `user.role === "tenant"` in `src/routes/tenant.tsx` loader.
- **Data Validation**: Replaced weak TypeScript passthrough validators with strongly-typed `Zod` schemas for backend actions in `src/lib/data-server.ts`.
- **Database Schema Integrity**: Implemented composite primary keys for the `lease_tenants` and `property_workers` join tables in `src/db/schema.ts`.
- **SQL Injection Prevention**: Refactored `src/db/queries.ts` to fully remove raw SQL mapping (`sql.raw`) arrays and replaced them with the ORM-native `inArray` operator.

### New Feature: Advanced Property Search System
- **Database Enhancements**: Expanded `src/db/schema.ts` `properties` with `city` and `locality` columns. Upgraded `units` with `furnishedStatus`. Added optimization indexes across both tables to support lightning-fast lookups.
- **Backend API**: Created `src/lib/search-server.ts` featuring a highly dynamic filtering API, mitigating N+1 problems with efficient relational joins, enabling sorting by price/creation-date, and supporting offset/limit pagination.
- **URL-State Syncing**: Built `src/hooks/usePropertySearch.ts` integrating TanStack Query and TanStack Router so that the user's active filter criteria automatically propagates to the URL parameters (allowing link sharing) alongside 5-minute data caching.
- **New Search UI Components**:
  - `src/routes/search.tsx`: The primary route definition validating search URL states.
  - `src/components/search/SearchLayout.tsx`: Parent layout coordinating the search experience.
  - `src/components/search/SearchFilters.tsx`: A robust sidebar of filter inputs, range sliders, and toggles.
  - `src/components/search/PropertySearchCard.tsx`: Display card showcasing rent, location, beds/baths/sqft, and highlight amenities.
  - `src/components/search/PaginationControls.tsx`: Reusable previous/next navigation.
