import { useMemo, useState } from "react";
import type { ProcessedPlace } from "../services/overpassService";

export function useNearbyPlaces(places: any[] = []) {
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");

  const filteredPlaces = useMemo(() => {
    if (activeCategory === "all") return places;
    return places.filter((p) => p.category === activeCategory);
  }, [places, activeCategory]);

  return {
    activeCategory,
    setActiveCategory,
    filteredPlaces,
    allPlaces: places,
  };
}
