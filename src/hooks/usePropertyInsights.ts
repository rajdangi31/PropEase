import { useQuery } from "@tanstack/react-query";
import { getPropertyInsightsFn } from "../lib/insights-server";

export function usePropertyInsights(propertyId: string) {
  return useQuery({
    queryKey: ["propertyInsights", propertyId],
    queryFn: () => getPropertyInsightsFn({ data: { propertyId } }),
    staleTime: 24 * 60 * 60 * 1000, // Client cache for 24h since server handles 30-day cache
    enabled: !!propertyId,
  });
}
