import { MapPin } from "lucide-react";

type Place = {
  id: string;
  name: string;
  distanceMeters: number;
  category: string;
};

type NearbyPlaceListProps = {
  places: Place[];
  emptyMessage?: string;
};

export function NearbyPlaceList({
  places,
  emptyMessage = "No places found nearby.",
}: NearbyPlaceListProps) {
  if (places.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg bg-muted/20">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {places.map((place) => (
        <li
          key={place.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors shadow-sm"
        >
          <div className="mt-0.5 bg-background p-1.5 rounded-full border border-border shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-sm font-medium truncate">{place.name}</h5>
            <p className="text-xs text-muted-foreground mt-0.5">
              {place.distanceMeters}m away (~{Math.ceil(place.distanceMeters / 80)} min walk)
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
