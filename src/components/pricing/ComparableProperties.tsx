import { MapPin, Bed, Maximize } from "lucide-react";

type ComparablePropertiesProps = {
  comparables: any[];
};

export function ComparableProperties({ comparables }: ComparablePropertiesProps) {
  if (comparables.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Comparable Listings
      </h4>
      <ul className="space-y-3">
        {comparables.map((comp) => (
          <li
            key={comp.id}
            className="flex justify-between items-center p-3 rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-sm">{comp.propertyName}</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5" /> {comp.beds} BHK
                </span>
                <span className="flex items-center gap-1">
                  <Maximize className="w-3.5 h-3.5" /> {comp.sqft} sqft
                </span>
              </div>
            </div>
            <div className="font-bold text-primary">
              ₹{(comp.rent / 100).toLocaleString("en-IN")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
