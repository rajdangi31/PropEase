import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "../db/index";
import { propertyInsights, nearbyPlaces, properties } from "../db/schema";
import { eq } from "drizzle-orm";
import { fetchNearbyPlaces } from "../services/overpassService";
import { calculateLocationScore } from "../utils/scoring";
import crypto from "crypto";

export const getPropertyInsightsFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ propertyId: z.string() }))
  .handler(async (ctx) => {
    const { propertyId } = ctx.data;
    const db = await getDb();

    // 1. Check cache
    const now = new Date();
    
    const [existingInsight] = await db
      .select()
      .from(propertyInsights)
      .where(eq(propertyInsights.propertyId, propertyId))
      .limit(1);

    const [property] = await db
      .select({ lat: properties.latitude, lon: properties.longitude, name: properties.name })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);

    if (!property || !property.lat || !property.lon) {
      throw new Error("Property coordinates not found for insights generation.");
    }

    if (existingInsight && new Date(existingInsight.expiresAt) > now) {
      const cachedPlaces = await db
        .select()
        .from(nearbyPlaces)
        .where(eq(nearbyPlaces.propertyId, propertyId));
        
      const propertyUnits = await db.select().from(units).where(eq(units.propertyId, propertyId));
        
      // Recalculate summary and grades dynamically from cached counts
      const scoreResult = calculateLocationScore(
        existingInsight.schoolsCount,
        existingInsight.hospitalsCount,
        existingInsight.transitCount,
        0, // we didn't store convenience count in schema explicitly, but it's fine for MVP
        existingInsight.restaurantsCount
      );

      return {
        insights: existingInsight,
        places: cachedPlaces,
        summary: scoreResult.summary,
        grades: {
          educationGrade: scoreResult.educationGrade,
          healthcareGrade: scoreResult.healthcareGrade,
          transitGrade: scoreResult.transitGrade,
          convenienceGrade: scoreResult.convenienceGrade,
          lifestyleGrade: scoreResult.lifestyleGrade,
        },
        propertyDetails: {
          lat: property.lat,
          lon: property.lon,
          name: property.name,
        },
        units: propertyUnits,
      };
    }

    // 3. Fetch from OSM
    const fetchedPlaces = await fetchNearbyPlaces(property.lat, property.lon, 2000);

    const schoolsCount = fetchedPlaces.filter(p => p.category === "school").length;
    const hospitalsCount = fetchedPlaces.filter(p => p.category === "hospital").length;
    const transitCount = fetchedPlaces.filter(p => p.category === "transit").length;
    const supermarketsCount = fetchedPlaces.filter(p => p.category === "supermarket").length;
    const restaurantsCount = fetchedPlaces.filter(p => p.category === "restaurant").length;

    const scoreResult = calculateLocationScore(
      schoolsCount,
      hospitalsCount,
      transitCount,
      supermarketsCount,
      restaurantsCount
    );

    const generatedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const insightId = existingInsight ? existingInsight.id : crypto.randomUUID();

    const newInsight = {
      id: insightId,
      propertyId,
      locationScore: scoreResult.locationScore,
      schoolsScore: scoreResult.rawSchoolsScore,
      healthcareScore: scoreResult.rawHealthcareScore,
      transitScore: scoreResult.rawTransitScore,
      convenienceScore: scoreResult.rawConvenienceScore,
      lifestyleScore: scoreResult.rawLifestyleScore,
      schoolsCount,
      hospitalsCount,
      transitCount,
      restaurantsCount,
      generatedAt,
      expiresAt,
    };

    // Prepare inserts
    const dbPlaces = fetchedPlaces.map(p => ({
      id: crypto.randomUUID(),
      propertyId,
      category: p.category,
      name: p.name,
      distanceMeters: p.distanceMeters,
      latitude: p.latitude,
      longitude: p.longitude,
    }));

    // If existing, we delete old places first
    if (existingInsight) {
      await db.delete(nearbyPlaces).where(eq(nearbyPlaces.propertyId, propertyId));
      await db.update(propertyInsights).set(newInsight).where(eq(propertyInsights.id, insightId));
    } else {
      await db.insert(propertyInsights).values(newInsight);
    }
    
    if (dbPlaces.length > 0) {
      await db.insert(nearbyPlaces).values(dbPlaces);
    }
    
    const propertyUnits = await db.select().from(units).where(eq(units.propertyId, propertyId));

    return {
      insights: newInsight,
      places: dbPlaces,
      summary: scoreResult.summary,
      grades: {
        educationGrade: scoreResult.educationGrade,
        healthcareGrade: scoreResult.healthcareGrade,
        transitGrade: scoreResult.transitGrade,
        convenienceGrade: scoreResult.convenienceGrade,
        lifestyleGrade: scoreResult.lifestyleGrade,
      },
      propertyDetails: {
        lat: property.lat,
        lon: property.lon,
        name: property.name,
      },
      units: propertyUnits,
    };
  });
