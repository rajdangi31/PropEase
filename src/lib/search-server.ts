import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "../db/index";
import { properties, units } from "../db/schema";
import { eq, and, gte, lte, like, desc, asc, sql } from "drizzle-orm";

export const searchPropertiesFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      city: z.string().optional(),
      locality: z.string().optional(),
      beds: z.number().optional(),
      minRent: z.number().optional(),
      maxRent: z.number().optional(),
      furnishedStatus: z.enum(["unfurnished", "semi-furnished", "fully-furnished"]).optional(),
      amenities: z.array(z.string()).optional(),
      sortBy: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
      page: z.number().default(1),
      limit: z.number().default(12),
    }),
  )
  .handler(async (ctx) => {
    const data = ctx.data;
    const db = await getDb();

    const filters = [eq(units.status, "vacant")];

    if (data.city) filters.push(like(properties.city, `%${data.city}%`));
    if (data.locality) filters.push(like(properties.locality, `%${data.locality}%`));
    if (data.beds !== undefined) filters.push(eq(units.beds, data.beds));
    if (data.minRent !== undefined) filters.push(gte(units.currentMarketRent, data.minRent * 100)); // Rent is stored in cents
    if (data.maxRent !== undefined) filters.push(lte(units.currentMarketRent, data.maxRent * 100));
    if (data.furnishedStatus) filters.push(eq(units.furnishedStatus, data.furnishedStatus));

    if (data.amenities && data.amenities.length > 0) {
      data.amenities.forEach((amenity) => {
        filters.push(like(units.amenities, `%${amenity}%`));
      });
    }

    let order = desc(units.createdAt);
    if (data.sortBy === "price_asc") order = asc(units.currentMarketRent);
    if (data.sortBy === "price_desc") order = desc(units.currentMarketRent);

    const offset = (data.page - 1) * data.limit;

    const query = db
      .select({
        id: units.id,
        propertyId: properties.id,
        propertyName: properties.name,
        address: properties.address,
        city: properties.city,
        locality: properties.locality,
        unitNumber: units.unitNumber,
        rent: units.currentMarketRent,
        beds: units.beds,
        baths: units.baths,
        sqft: units.sqft,
        furnishedStatus: units.furnishedStatus,
        amenities: units.amenities,
        createdAt: units.createdAt,
      })
      .from(units)
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(and(...filters))
      .orderBy(order)
      .limit(data.limit)
      .offset(offset);

    const results = await query;

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(units)
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(and(...filters));

    return {
      data: results,
      pagination: {
        total: count,
        page: data.page,
        limit: data.limit,
        totalPages: Math.ceil(count / data.limit),
      },
    };
  });
