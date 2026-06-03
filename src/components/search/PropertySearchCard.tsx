import { MapPin, Bed, Bath, Maximize, Building2 } from "lucide-react";

type PropertySearchCardProps = {
  property: {
    id: string; // unit id
    propertyId: string;
    propertyName: string;
    address: string;
    city: string | null;
    locality: string | null;
    unitNumber: string;
    rent: number;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    furnishedStatus: string | null;
    amenities: string | null;
  };
};

export function PropertySearchCard({ property }: PropertySearchCardProps) {
  // Parsing amenities from JSON string if needed
  let amenitiesList: string[] = [];
  try {
    if (property.amenities) amenitiesList = JSON.parse(property.amenities);
  } catch (e) {
    // Ignore parse error
  }

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all group">
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        <Building2 className="w-12 h-12 text-muted-foreground/30" />
        <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground px-2 py-1 rounded-md text-sm font-semibold shadow-sm">
          ${(property.rent / 100).toLocaleString()}/mo
        </div>
        {property.furnishedStatus && (
          <div className="absolute top-3 right-3 bg-background/90 text-foreground px-2 py-1 rounded-md text-xs font-medium capitalize shadow-sm">
            {property.furnishedStatus.replace("-", " ")}
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">
              {property.propertyName} - Apt {property.unitNumber}
            </h3>
            <div className="flex items-center text-muted-foreground text-sm mt-1">
              <MapPin className="w-3 h-3 mr-1" />
              <span className="line-clamp-1">
                {property.locality ? `${property.locality}, ` : ""}
                {property.city ? property.city : property.address}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 py-4 mt-auto border-t border-border/50 text-sm text-muted-foreground">
          {property.beds !== null && (
            <div className="flex items-center gap-1.5">
              <Bed className="w-4 h-4" />
              <span>{property.beds} Bed</span>
            </div>
          )}
          {property.baths !== null && (
            <div className="flex items-center gap-1.5">
              <Bath className="w-4 h-4" />
              <span>{property.baths} Bath</span>
            </div>
          )}
          {property.sqft !== null && (
            <div className="flex items-center gap-1.5">
              <Maximize className="w-4 h-4" />
              <span>{property.sqft} sqft</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {amenitiesList.slice(0, 3).map((a, i) => (
            <span
              key={i}
              className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground border border-border/50"
            >
              {a}
            </span>
          ))}
          {amenitiesList.length > 3 && (
            <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground border border-border/50">
              +{amenitiesList.length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
