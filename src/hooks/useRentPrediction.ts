import { useQuery } from "@tanstack/react-query";
import { getRentPredictionFn } from "../lib/pricing-server";

export function useRentPrediction(unitId: string) {
  return useQuery({
    queryKey: ["rentPrediction", unitId],
    queryFn: () => getRentPredictionFn({ data: { unitId } }),
    enabled: !!unitId,
    staleTime: 60 * 60 * 1000, // 1 hour cache
  });
}
