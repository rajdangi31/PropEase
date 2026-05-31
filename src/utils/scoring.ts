/**
 * Location Scoring Engine
 * Weights:
 * - Transit: 35%
 * - Education: 25%
 * - Healthcare: 20%
 * - Convenience: 10%
 * - Lifestyle: 10%
 */

export type LocationIntelligence = {
  locationScore: number;
  rawSchoolsScore: number;
  rawHealthcareScore: number;
  rawTransitScore: number;
  rawConvenienceScore: number;
  rawLifestyleScore: number;
  educationGrade: string;
  healthcareGrade: string;
  transitGrade: string;
  convenienceGrade: string;
  lifestyleGrade: string;
  summary: string;
};

const getGrade = (score: number): string => {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  return "D";
};

// Simplified scoring algorithm based on count of nearby places within 2km
export function calculateLocationScore(
  schoolsCount: number,
  hospitalsCount: number,
  transitCount: number,
  convenienceCount: number, // supermarkets
  lifestyleCount: number    // restaurants
): LocationIntelligence {
  
  // Base scores (0-100) based on counts. 
  const calcScore = (count: number, maxExpected: number) => Math.min(100, Math.round((count / maxExpected) * 100));

  const schoolsScore = calcScore(schoolsCount, 5);
  const healthcareScore = calcScore(hospitalsCount, 3);
  const transitScore = calcScore(transitCount, 4);
  const convenienceScore = calcScore(convenienceCount, 3);
  const lifestyleScore = calcScore(lifestyleCount, 15);

  const locationScore = Math.round(
    transitScore * 0.35 +
    schoolsScore * 0.25 +
    healthcareScore * 0.20 +
    convenienceScore * 0.10 +
    lifestyleScore * 0.10
  );

  let summaryParts = [];
  if (transitScore >= 80) summaryParts.push("Excellent connectivity with strong transit options");
  else if (transitScore >= 50) summaryParts.push("Moderate transit connectivity");
  
  if (schoolsScore >= 80) summaryParts.push("multiple schools within walking distance");
  else if (schoolsScore > 0) summaryParts.push("some schools nearby");
  
  if (healthcareScore >= 80) summaryParts.push("great healthcare access");
  else if (healthcareScore >= 40) summaryParts.push("good healthcare access");

  const summary = summaryParts.length > 0 
    ? summaryParts.join(", ").replace(/,([^,]*)$/, " and$1") + "."
    : "Basic location with limited nearby amenities.";

  return {
    locationScore,
    rawSchoolsScore: schoolsScore,
    rawHealthcareScore: healthcareScore,
    rawTransitScore: transitScore,
    rawConvenienceScore: convenienceScore,
    rawLifestyleScore: lifestyleScore,
    educationGrade: getGrade(schoolsScore),
    healthcareGrade: getGrade(healthcareScore),
    transitGrade: getGrade(transitScore),
    convenienceGrade: getGrade(convenienceScore),
    lifestyleGrade: getGrade(lifestyleScore),
    summary: summary.charAt(0).toUpperCase() + summary.slice(1)
  };
}
