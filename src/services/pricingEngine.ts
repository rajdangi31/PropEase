import { calculateRentEstimate, generateExplanation } from "../utils/pricingRules";
import type { PropertyPricingAttributes } from "../utils/pricingRules";

export type ConfidenceInputs = {
  hasSqft: boolean;
  hasAge: boolean;
  hasFurnished: boolean;
  hasParking: boolean;
  comparableCount: number;
  hasLocationScore: boolean;
};

export function calculateConfidenceScore(inputs: ConfidenceInputs): number {
  let score = 0;

  // Data completeness (40%)
  let dataScore = 0;
  if (inputs.hasSqft) dataScore += 16;
  if (inputs.hasAge) dataScore += 8;
  if (inputs.hasFurnished) dataScore += 8;
  if (inputs.hasParking) dataScore += 8;
  score += dataScore;

  // Comparable property coverage (40%)
  // Max score at 5 comparables
  const compScore = Math.min(40, inputs.comparableCount * 8);
  score += compScore;

  // Location intelligence availability (20%)
  if (inputs.hasLocationScore) {
    score += 20;
  }

  return score;
}

export function runPricingEngine(attributes: PropertyPricingAttributes, comparableCount: number) {
  const result = calculateRentEstimate(attributes);

  const confidenceInputs: ConfidenceInputs = {
    hasSqft: !!attributes.sqft,
    hasAge: attributes.propertyAge !== undefined,
    hasFurnished: !!attributes.furnishedStatus,
    hasParking: attributes.parking !== undefined,
    comparableCount,
    hasLocationScore: !!attributes.locationScore,
  };

  const confidenceScore = calculateConfidenceScore(confidenceInputs);
  const explanation = generateExplanation(result.factors, result.finalEstimate);

  return {
    ...result,
    confidenceScore,
    explanation,
  };
}
