import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

type InsightCardProps = {
  title: string;
  grade: string;
  icon: ReactNode;
  description: string;
};

export function InsightCard({ title, grade, icon, description }: InsightCardProps) {
  const isGood = grade.includes("A") || grade.includes("B");

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow transition-shadow">
      <CardContent className="p-4 flex items-start gap-4">
        <div
          className={`p-3 rounded-full ${isGood ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-sm">{title}</h4>
            <span className={`font-bold ${isGood ? "text-primary" : "text-muted-foreground"}`}>
              {grade}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
