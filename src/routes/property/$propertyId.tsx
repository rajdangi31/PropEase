import { createFileRoute } from "@tanstack/react-router";
import { usePropertyInsights } from "@/hooks/usePropertyInsights";
import { useNearbyPlaces } from "@/hooks/useNearbyPlaces";
import { useRentPrediction } from "@/hooks/useRentPrediction";
import { MapView } from "@/components/property/MapView";
import { NearbyInsights } from "@/components/property/NearbyInsights";
import { PricePredictionCard } from "@/components/pricing/PricePredictionCard";
import { Loader2, MapPin } from "lucide-react";

export const Route = createFileRoute("/property/$propertyId")({
  component: PropertyMapInsightsPage,
});

function PropertyMapInsightsPage() {
  const { propertyId } = Route.useParams();

  const { data, isLoading, isError, error } = usePropertyInsights(propertyId);
  const placesHook = useNearbyPlaces(data?.places || []);

  const firstUnit = data?.units?.[0];
  const { data: rentData, isLoading: rentLoading } = useRentPrediction(firstUnit?.id || "");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <h2 className="text-xl font-semibold">Generating Location Intelligence...</h2>
        <p className="text-muted-foreground max-w-md text-center">
          Analyzing nearby schools, transit, and lifestyle amenities. This may take a moment.
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-4">
          <MapPin className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Insights Unavailable</h2>
        <p className="text-muted-foreground mb-4">{(error as Error).message}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{data.propertyDetails.name}</h1>
        <p className="text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-4 h-4" />
          Neighborhood Map & Insights
        </p>
      </div>

      {firstUnit && (
        <div className="mb-8 flex justify-center lg:justify-start">
          {rentLoading ? (
            <div className="w-full max-w-xl animate-pulse bg-muted/50 border border-border h-[400px] rounded-xl" />
          ) : rentData ? (
            <PricePredictionCard predictionData={rentData} />
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-8 h-full min-h-[600px]">
        {/* Map View - Takes up more space on large screens */}
        <div className="lg:col-span-1 xl:col-span-3 order-1 lg:order-1 h-[500px] lg:h-auto">
          <MapView
            propertyLat={data.propertyDetails.lat}
            propertyLon={data.propertyDetails.lon}
            propertyName={data.propertyDetails.name}
            places={data.places}
            activeCategory={placesHook.activeCategory}
          />
        </div>

        {/* Nearby Insights Sidebar */}
        <div className="lg:col-span-1 xl:col-span-2 order-2 lg:order-2 flex flex-col h-full lg:max-h-[800px]">
          <NearbyInsights
            places={data.places}
            insights={data.insights}
            summary={data.summary}
            grades={data.grades}
            {...placesHook}
          />
        </div>
      </div>
    </div>
  );
}
