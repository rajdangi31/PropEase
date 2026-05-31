import { getDb } from "../db/index";
import { units, properties, localityStats } from "../db/schema";
import { eq, and, between, sql } from "drizzle-orm";
import crypto from "crypto";

export async function getDynamicLocalityPricing(city: string, locality: string) {
  const db = await getDb();
  
  // 1. Check cache first (valid for 24 hours)
  const [cached] = await db
    .select()
    .from(localityStats)
    .where(and(eq(localityStats.city, city), eq(localityStats.locality, locality)))
    .limit(1);

  const now = new Date();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  if (cached && (now.getTime() - new Date(cached.updatedAt!).getTime() < ONE_DAY)) {
    return cached.avgPricePerSqft;
  }

  // 2. Compute dynamic pricing from real listings
  const result = await db
    .select({
      avgPrice: sql<number>`AVG(CAST(${units.currentMarketRent} AS REAL) / ${units.sqft})`,
      minPrice: sql<number>`MIN(CAST(${units.currentMarketRent} AS REAL) / ${units.sqft})`,
      maxPrice: sql<number>`MAX(CAST(${units.currentMarketRent} AS REAL) / ${units.sqft})`
    })
    .from(units)
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(
      and(
        eq(properties.city, city),
        eq(properties.locality, locality),
        sql`${units.sqft} > 0`
      )
    );

  const stats = result[0];
  
  // Fallback if no listings exist in this locality yet (e.g. ₹45/sqft)
  if (!stats || !stats.avgPrice) {
    return 4500; // Return cents per sqft if we are storing cents, wait rent is in cents, so rent/sqft is in cents/sqft
  }

  const newStats = {
    id: cached ? cached.id : crypto.randomUUID(),
    city,
    locality,
    avgPricePerSqft: Math.round(stats.avgPrice),
    minPricePerSqft: Math.round(stats.minPrice || stats.avgPrice),
    maxPricePerSqft: Math.round(stats.maxPrice || stats.avgPrice),
    updatedAt: now.toISOString(),
  };

  if (cached) {
    await db.update(localityStats).set(newStats).where(eq(localityStats.id, cached.id));
  } else {
    await db.insert(localityStats).values(newStats);
  }

  return newStats.avgPricePerSqft;
}

export async function getComparableProperties(
  locality: string,
  beds: number,
  sqft: number,
  limit: number = 5
) {
  const db = await getDb();
  const minBeds = Math.max(0, beds - 1);
  const maxBeds = beds + 1;
  const minSqft = Math.round(sqft * 0.8);
  const maxSqft = Math.round(sqft * 1.2);

  const comps = await db
    .select({
      id: units.id,
      propertyId: properties.id,
      propertyName: properties.name,
      beds: units.beds,
      sqft: units.sqft,
      rent: units.currentMarketRent,
    })
    .from(units)
    .innerJoin(properties, eq(units.propertyId, properties.id))
    .where(
      and(
        eq(properties.locality, locality),
        between(units.beds, minBeds, maxBeds),
        between(units.sqft, minSqft, maxSqft)
      )
    )
    .limit(limit);

  return comps;
}
