import { usePropertySearch } from "@/hooks/usePropertySearch";
import { SearchFilters } from "./SearchFilters";
import { PropertySearchCard } from "./PropertySearchCard";
import { PaginationControls } from "./PaginationControls";
import { Loader2, SearchX } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SearchLayout() {
  const { searchParams, query, updateSearch, clearFilters } = usePropertySearch();

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Find your next home</h1>
          <p className="text-muted-foreground mt-1">Browse and filter available properties.</p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
          <Select
            value={searchParams.sortBy || "newest"}
            onValueChange={(val: any) => updateSearch({ sortBy: val })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price_asc">Lowest Price First</SelectItem>
              <SelectItem value="price_desc">Highest Price First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <SearchFilters
            searchParams={searchParams}
            updateSearch={updateSearch}
            clearFilters={clearFilters}
          />
        </div>

        <div className="lg:col-span-3">
          {query.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : query.isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-destructive text-center">
              <p>Failed to load properties.</p>
              <p className="text-sm mt-2 opacity-80">{(query.error as Error).message}</p>
            </div>
          ) : query.data?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-xl border-border bg-muted/30">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                <SearchX className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No properties found</h3>
              <p className="text-muted-foreground max-w-sm">
                We couldn't find any properties matching your current filters. Try adjusting your
                search criteria.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {query.data?.data.map((property: any) => (
                  <PropertySearchCard key={property.id} property={property} />
                ))}
              </div>

              {query.data?.pagination && (
                <PaginationControls
                  currentPage={query.data.pagination.page}
                  totalPages={query.data.pagination.totalPages}
                  onPageChange={(page) => updateSearch({ page })}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
