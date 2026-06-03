import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb } from "../db/index";
import { units, properties, rentPredictions, propertyInsights } from "../db/schema";
import { eq } from "drizzle-orm";
import { getDynamicLocalityPricing, getComparableProperties } from "../services/predictionService";
import { runPricingEngine } from "../services/pricingEngine";
import crypto from "crypto";

export const getRentPredictionFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ unitId: z.string() }))
  .handler(async (ctx) => {
    const { unitId } = ctx.data;
    const db = await getDb();

    // 1. Fetch Property and Unit Data
    const result = await db
      .select({
        propertyId: properties.id,
        city: properties.city,
        locality: properties.locality,
        sqft: units.sqft,
        beds: units.beds,
        furnishedStatus: units.furnishedStatus,
        parking: units.parking,
        balconyCount: units.balconyCount,
        propertyAge: units.propertyAge,
        currentMarketRent: units.currentMarketRent,
      })
      .from(units)
      .innerJoin(properties, eq(units.propertyId, properties.id))
      .where(eq(units.id, unitId))
      .limit(1);

    if (!result || result.length === 0) {
      throw new Error("Unit not found");
    }

    const data = result[0];

    // 2. Fetch Location Insights (for locationScore and nearMetro)
    const [insight] = await db
      .select()
      .from(propertyInsights)
      .where(eq(propertyInsights.propertyId, data.propertyId))
      .limit(1);

    const locationScore = insight?.locationScore || 0;
    const nearMetro = insight?.transitScore ? insight.transitScore > 50 : false;

    // 3. Get Dynamic Locality Pricing
    const localityAvgPricePerSqft = await getDynamicLocalityPricing(
      data.city || "",
      data.locality || "",
    );

    // 4. Get Comparables
    const comparables = await getComparableProperties(
      data.locality || "",
      data.beds || 0,
      data.sqft || 0,
    );

    // Filter out the current unit itself from comparables just in case
    const filteredComparables = comparables.filter((c: any) => c.id !== unitId);

    // 5. Run Pricing Engine
    const prediction = runPricingEngine(
      {
        sqft: data.sqft || 0,
        furnishedStatus: (data.furnishedStatus as any) || "unfurnished",
        parking: data.parking || false,
        balconyCount: data.balconyCount || 0,
        propertyAge: data.propertyAge || 0,
        nearMetro,
        locationScore,
        localityAvgPricePerSqft,
      },
      filteredComparables.length,
    );

    // 6. Price Fairness (Current vs Recommended)
    let fairness = { assessment: "Fairly Priced", percentage: 0 };
    if (data.currentMarketRent) {
      const diff = data.currentMarketRent - prediction.finalEstimate;
      const pct = Math.round((diff / prediction.finalEstimate) * 100);
      if (pct > 5) {
        fairness = { assessment: "Overpriced", percentage: pct };
      } else if (pct < -5) {
        fairness = { assessment: "Underpriced", percentage: Math.abs(pct) };
      }
    }

    // 7. Store Prediction
    const predictionRecord = {
      id: crypto.randomUUID(),
      propertyId: data.propertyId,
      unitId,
      predictedRent: prediction.finalEstimate,
      minEstimate: prediction.minEstimate,
      maxEstimate: prediction.maxEstimate,
      confidenceScore: prediction.confidenceScore,
      explanation: JSON.stringify(prediction.explanation),
      createdAt: new Date().toISOString(),
    };

    // Keep history, or overwrite? Let's just insert as history.
    await db.insert(rentPredictions).values(predictionRecord);

    return {
      prediction: predictionRecord,
      factors: prediction.factors,
      comparables: filteredComparables,
      fairness,
      currentRent: data.currentMarketRent,
    };
  });
