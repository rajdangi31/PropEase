import { GraduationCap, Stethoscope, Train, ShoppingCart, Utensils } from "lucide-react";
import { LocationScore } from "./LocationScore";
import { InsightCard } from "./InsightCard";
import { NearbyPlaceList } from "./NearbyPlaceList";

type NearbyInsightsProps = {
  places: any[];
  insights: any;
  summary: string;
  grades: any;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  filteredPlaces: any[];
};

export function NearbyInsights({ 
  places, 
  insights, 
  summary, 
  grades, 
  activeCategory, 
  setActiveCategory, 
  filteredPlaces 
}: NearbyInsightsProps) {

  const categories = [
    { id: "all", label: "All" },
    { id: "school", label: "Schools", icon: <GraduationCap className="w-4 h-4" /> },
    { id: "hospital", label: "Healthcare", icon: <Stethoscope className="w-4 h-4" /> },
    { id: "transit", label: "Transit", icon: <Train className="w-4 h-4" /> },
    { id: "supermarket", label: "Groceries", icon: <ShoppingCart className="w-4 h-4" /> },
    { id: "restaurant", label: "Dining", icon: <Utensils className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Top Scores Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LocationScore score={insights.locationScore} />
        
        <div className="flex flex-col gap-3 justify-center">
          <InsightCard 
            title="Education" 
            grade={grades.educationGrade} 
            icon={<GraduationCap className="w-5 h-5" />} 
            description={`${insights.schoolsCount} schools nearby`}
          />
          <InsightCard 
            title="Transit & Commute" 
            grade={grades.transitGrade} 
            icon={<Train className="w-5 h-5" />} 
            description={`${insights.transitCount} stations nearby`}
          />
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <h4 className="text-sm font-bold text-primary mb-1">Location Intelligence</h4>
        <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
      </div>

      {/* Places Directory */}
      <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30 overflow-x-auto hide-scrollbar">
          <div className="flex gap-2">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === c.id 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-background border border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                {c.icon}
                {c.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
          <NearbyPlaceList 
            places={filteredPlaces} 
            emptyMessage={activeCategory === "all" ? "No nearby places found." : `No ${activeCategory}s found within 2km.`} 
          />
        </div>
      </div>

    </div>
  );
}
