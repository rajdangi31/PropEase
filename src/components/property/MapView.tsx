import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ProcessedPlace } from "@/services/overpassService";

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const customIcon = (color: string) => {
  return L.divIcon({
    className: "custom-div-icon",
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

const categoryColors = {
  school: "#3b82f6", // blue-500
  hospital: "#ef4444", // red-500
  transit: "#f59e0b", // amber-500
  supermarket: "#10b981", // emerald-500
  restaurant: "#8b5cf6", // violet-500
  property: "#000000", // black
};

type MapViewProps = {
  propertyLat: number;
  propertyLon: number;
  propertyName: string;
  places: ProcessedPlace[];
  activeCategory: string | "all";
};

// Component to recenter map when coordinates change
function RecenterAutomatically({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon]);
  }, [lat, lon, map]);
  return null;
}

export function MapView({
  propertyLat,
  propertyLon,
  propertyName,
  places,
  activeCategory,
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted)
    return <div className="w-full h-full min-h-[400px] bg-muted animate-pulse rounded-xl" />;

  const filteredPlaces =
    activeCategory === "all" ? places : places.filter((p) => p.category === activeCategory);

  return (
    <div className="w-full h-full min-h-[400px] md:min-h-[600px] rounded-xl overflow-hidden border border-border shadow-sm relative z-0">
      <MapContainer
        center={[propertyLat, propertyLon]}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
        style={{ height: "100%", width: "100%", minHeight: "400px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <RecenterAutomatically lat={propertyLat} lon={propertyLon} />

        {/* Property Marker */}
        <Marker
          position={[propertyLat, propertyLon]}
          icon={customIcon(categoryColors.property)}
          zIndexOffset={1000}
        >
          <Popup>
            <div className="font-semibold text-sm">{propertyName}</div>
            <div className="text-xs text-muted-foreground">Selected Property</div>
          </Popup>
        </Marker>

        {/* POI Markers */}
        {filteredPlaces.map((place: any) => (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={customIcon(categoryColors[place.category as keyof typeof categoryColors])}
          >
            <Popup>
              <div className="font-semibold text-sm capitalize">{place.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{place.category}</div>
              <div className="text-xs text-muted-foreground mt-1">{place.distanceMeters}m away</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
