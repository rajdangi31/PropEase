import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { PropertySearchType } from "@/routes/search";

type SearchFiltersProps = {
  searchParams: PropertySearchType;
  updateSearch: (updates: Partial<PropertySearchType>) => void;
  clearFilters: () => void;
};

const commonAmenities = ["WiFi", "Parking", "Gym", "Pool", "Pet Friendly", "Laundry", "Balcony"];

export function SearchFilters({ searchParams, updateSearch, clearFilters }: SearchFiltersProps) {
  const toggleAmenity = (amenity: string, checked: boolean) => {
    const current = searchParams.amenities || [];
    if (checked) {
      updateSearch({ amenities: [...current, amenity] });
    } else {
      updateSearch({ amenities: current.filter((a) => a !== amenity) });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-6 sticky top-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Filters</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground h-8 px-2 text-xs"
        >
          Clear all
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            placeholder="e.g. New York"
            value={searchParams.city || ""}
            onChange={(e) => updateSearch({ city: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Locality / Neighborhood</Label>
          <Input
            placeholder="e.g. Brooklyn"
            value={searchParams.locality || ""}
            onChange={(e) => updateSearch({ locality: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Min Rent</Label>
            <Input
              type="number"
              placeholder="0"
              value={searchParams.minRent || ""}
              onChange={(e) =>
                updateSearch({ minRent: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max Rent</Label>
            <Input
              type="number"
              placeholder="Any"
              value={searchParams.maxRent || ""}
              onChange={(e) =>
                updateSearch({ maxRent: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Bedrooms</Label>
          <Select
            value={searchParams.beds?.toString() || "any"}
            onValueChange={(val) => updateSearch({ beds: val === "any" ? undefined : Number(val) })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="1">1 Bed</SelectItem>
              <SelectItem value="2">2 Beds</SelectItem>
              <SelectItem value="3">3 Beds</SelectItem>
              <SelectItem value="4">4+ Beds</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Furnishing</Label>
          <Select
            value={searchParams.furnishedStatus || "any"}
            onValueChange={(val: any) =>
              updateSearch({ furnishedStatus: val === "any" ? undefined : val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="unfurnished">Unfurnished</SelectItem>
              <SelectItem value="semi-furnished">Semi-Furnished</SelectItem>
              <SelectItem value="fully-furnished">Fully Furnished</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 pt-2">
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 gap-y-3">
            {commonAmenities.map((amenity) => (
              <div key={amenity} className="flex items-center space-x-2">
                <Checkbox
                  id={`amenity-${amenity}`}
                  checked={searchParams.amenities?.includes(amenity) || false}
                  onCheckedChange={(checked) => toggleAmenity(amenity, checked as boolean)}
                />
                <label
                  htmlFor={`amenity-${amenity}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {amenity}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
