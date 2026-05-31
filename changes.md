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

### New Feature: Map View & Nearby Insights System
- **Location Intelligence Engine**: Built `src/utils/scoring.ts` to calculate a proprietary 100-point location score based on transit (35%), education (25%), healthcare (20%), groceries (10%), and dining (10%). It automatically generates human-readable AI summaries based on amenity density.
- **Overpass API Integration**: Developed `src/services/overpassService.ts` utilizing a single, highly-optimized Overpass query to fetch 5 categories of Points of Interest (POIs) simultaneously within a 2km radius to avoid API rate limits, featuring exponential backoff retries.
- **Drizzle Caching Layer**: Engineered a 30-day SQLite caching layer in `src/lib/insights-server.ts` storing results in new `property_insights` and `nearby_places` tables to drastically improve performance and minimize external API hits.
- **Interactive Leaflet UI**: Implemented `src/components/property/MapView.tsx` using `react-leaflet`, rendering custom color-coded map pins over OpenStreetMap tiles.
- **Responsive Insight Components**: Developed circular SVG progress scores (`LocationScore.tsx`), grade cards (`InsightCard.tsx`), and a categorized POI list (`NearbyPlaceList.tsx`) neatly assembled inside `NearbyInsights.tsx`.
- **Dedicated Route**: Created `src/routes/property/$propertyId.tsx` to beautifully showcase the map on the left and the scrollable insights panel on the right (stacked vertically on mobile devices).

