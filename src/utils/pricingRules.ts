export type PropertyPricingAttributes = {
  sqft: number;
  furnishedStatus: "unfurnished" | "semi-furnished" | "fully-furnished";
  parking: boolean;
  balconyCount: number;
  propertyAge: number;
  nearMetro: boolean;
  locationScore: number;
  localityAvgPricePerSqft: number;
};

export type PricingFactor = {
  name: string;
  adjustmentPercentage: number;
  type: "positive" | "negative";
  reason: string;
};

export function calculateRentEstimate(attributes: PropertyPricingAttributes) {
  const {
    sqft,
    furnishedStatus,
    parking,
    balconyCount,
    propertyAge,
    nearMetro,
    locationScore,
    localityAvgPricePerSqft,
  } = attributes;

  // 1. Base Rent
  const baseRent = sqft * localityAvgPricePerSqft;

  let totalMultiplier = 1.0;
  const factors: PricingFactor[] = [];

  // 2. Furnished Status
  if (furnishedStatus === "fully-furnished") {
    totalMultiplier += 0.1;
    factors.push({
      name: "Fully Furnished",
      adjustmentPercentage: 10,
      type: "positive",
      reason: "Fully furnished properties command a premium.",
    });
  } else if (furnishedStatus === "semi-furnished") {
    totalMultiplier += 0.05;
    factors.push({
      name: "Semi Furnished",
      adjustmentPercentage: 5,
      type: "positive",
      reason: "Partially furnished properties add convenience.",
    });
  }

  // 3. Parking
  if (parking) {
    totalMultiplier += 0.05;
    factors.push({
      name: "Parking Available",
      adjustmentPercentage: 5,
      type: "positive",
      reason: "Dedicated parking is a valuable amenity.",
    });
  }

  // 4. Balcony
  if (balconyCount > 0) {
    const balconyBoost = Math.min(0.06, balconyCount * 0.02); // Cap at 3 balconies
    totalMultiplier += balconyBoost;
    factors.push({
      name: `${balconyCount} Balcon${balconyCount > 1 ? "ies" : "y"}`,
      adjustmentPercentage: Math.round(balconyBoost * 100),
      type: "positive",
      reason: "Outdoor space increases desirability.",
    });
  }

  // 5. Transit
  if (nearMetro) {
    totalMultiplier += 0.08;
    factors.push({
      name: "Near Metro/Transit",
      adjustmentPercentage: 8,
      type: "positive",
      reason: "Excellent transit access drives higher demand.",
    });
  }

  // 6. Location Intelligence
  if (locationScore > 85) {
    totalMultiplier += 0.1;
    factors.push({
      name: "High Location Score",
      adjustmentPercentage: 10,
      type: "positive",
      reason: "Located in a highly sought-after neighborhood.",
    });
  } else if (locationScore >= 70) {
    totalMultiplier += 0.05;
    factors.push({
      name: "Good Location Score",
      adjustmentPercentage: 5,
      type: "positive",
      reason: "Solid neighborhood amenities.",
    });
  }

  // 7. Property Age
  if (propertyAge > 20) {
    totalMultiplier -= 0.1;
    factors.push({
      name: `Older Property (${propertyAge} yrs)`,
      adjustmentPercentage: 10,
      type: "negative",
      reason: "Older properties generally have lower rents.",
    });
  } else if (propertyAge > 10) {
    totalMultiplier -= 0.05;
    factors.push({
      name: `Aging Property (${propertyAge} yrs)`,
      adjustmentPercentage: 5,
      type: "negative",
      reason: "Slight discount for property age.",
    });
  }

  const finalEstimate = Math.round(baseRent * totalMultiplier);

  // Calculate a reasonable range (±7% depending on negotiation/exact condition)
  const minEstimate = Math.round(finalEstimate * 0.93);
  const maxEstimate = Math.round(finalEstimate * 1.07);

  return {
    baseRent: Math.round(baseRent),
    finalEstimate,
    minEstimate,
    maxEstimate,
    factors,
  };
}

export function generateExplanation(factors: PricingFactor[], finalEstimate: number): string[] {
  const sortedFactors = [...factors].sort(
    (a, b) => b.adjustmentPercentage - a.adjustmentPercentage,
  );
  const positives = sortedFactors.filter((f) => f.type === "positive").slice(0, 3);
  const negatives = sortedFactors.filter((f) => f.type === "negative");

  let text = `This property is estimated at ₹${finalEstimate.toLocaleString("en-IN")}/month because it `;

  if (positives.length > 0) {
    const pNames = positives.map((p) => p.name.toLowerCase());
    if (pNames.length === 1) text += `has ${pNames[0]}`;
    else if (pNames.length === 2) text += `has ${pNames[0]} and ${pNames[1]}`;
    else text += `has ${pNames[0]}, ${pNames[1]}, and ${pNames[2]}`;
  } else {
    text += "is a standard property in this locality";
  }

  if (negatives.length > 0) {
    text += `, though the price is slightly adjusted down due to being an ${negatives[0].name.toLowerCase()}`;
  }

  text += ".";

  return [text];
}
