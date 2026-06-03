import { calculateDistance } from "../utils/haversine";

export type ProcessedPlace = {
  category: "school" | "hospital" | "transit" | "supermarket" | "restaurant";
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
};

/**
 * Fetches nearby amenities using a single optimized Overpass query.
 */
export async function fetchNearbyPlaces(
  lat: number,
  lon: number,
  radiusMeters: number = 2000,
): Promise<ProcessedPlace[]> {
  // Single query for multiple categories
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="school"](around:${radiusMeters},${lat},${lon});
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lon});
      node["railway"="station"](around:${radiusMeters},${lat},${lon});
      node["station"="subway"](around:${radiusMeters},${lat},${lon});
      node["shop"="supermarket"](around:${radiusMeters},${lat},${lon});
      node["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
    );
    out body;
    >;
    out skel qt;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "PropEase/1.0",
        },
      });

      if (response.status === 429) {
        throw new Error("Rate limited");
      }

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`);
      }

      const data = await response.json();

      const places: ProcessedPlace[] = [];

      if (!data.elements) return [];

      for (const element of data.elements) {
        if (element.type === "node" && element.tags) {
          const distance = calculateDistance(lat, lon, element.lat, element.lon);

          let category: ProcessedPlace["category"] | null = null;

          if (element.tags.amenity === "school") category = "school";
          else if (element.tags.amenity === "hospital") category = "hospital";
          else if (element.tags.railway === "station" || element.tags.station === "subway")
            category = "transit";
          else if (element.tags.shop === "supermarket") category = "supermarket";
          else if (element.tags.amenity === "restaurant") category = "restaurant";

          if (category) {
            places.push({
              category,
              name: element.tags.name || `Unnamed ${category}`,
              latitude: element.lat,
              longitude: element.lon,
              distanceMeters: distance,
            });
          }
        }
      }

      return places;
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        console.error("Failed to fetch from Overpass after retries:", error);
        return []; // Fail gracefully
      }
      // Wait before retry
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }

  return [];
}
