import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { searchPropertiesFn } from "../lib/search-server";
import { Route } from "../routes/search";
import type { PropertySearchType } from "../routes/search";

export function usePropertySearch() {
  const searchParams = useSearch({ from: Route.id });
  const navigate = useNavigate({ from: Route.id });

  const query = useQuery({
    queryKey: ["properties", searchParams],
    queryFn: () => searchPropertiesFn({ data: searchParams }),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const updateSearch = (updates: Partial<PropertySearchType>) => {
    navigate({
      search: (prev) => {
        // Strip undefined values to keep URL clean
        const newSearch: any = { ...prev, ...updates };

        // Reset to page 1 if changing filters (unless explicitly updating page)
        if (updates.page === undefined) {
          newSearch.page = 1;
        }

        // Clean up empty arrays or strings
        if (newSearch.amenities?.length === 0) delete newSearch.amenities;
        if (!newSearch.city) delete newSearch.city;
        if (!newSearch.locality) delete newSearch.locality;

        return newSearch;
      },
      replace: true, // Replace history to avoid huge history stacks when tweaking filters
    });
  };

  const clearFilters = () => {
    navigate({
      search: { page: 1 },
      replace: true,
    });
  };

  return {
    searchParams,
    query,
    updateSearch,
    clearFilters,
  };
}
