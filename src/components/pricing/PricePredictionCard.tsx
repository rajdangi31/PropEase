import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { RentRangeChart } from "./RentRangeChart";
import { PriceFactors } from "./PriceFactors";
import { PriceFairnessMeter } from "./PriceFairnessMeter";
import { ComparableProperties } from "./ComparableProperties";

type PricePredictionCardProps = {
  predictionData: any;
};

export function PricePredictionCard({ predictionData }: PricePredictionCardProps) {
  if (!predictionData) return null;

  const { prediction, factors, comparables, fairness, currentRent } = predictionData;

  const explanationStr = prediction.explanation;
  const parsedExplanation =
    typeof explanationStr === "string" ? JSON.parse(explanationStr) : explanationStr;
  const explanationText = Array.isArray(parsedExplanation)
    ? parsedExplanation.join(" ")
    : parsedExplanation;

  return (
    <Card className="w-full shadow-md border-primary/20">
      <CardHeader className="bg-primary/5 border-b border-border/50 pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Rent Estimate
          </CardTitle>
          <div className="text-2xl font-black text-primary">
            ₹{prediction.predictedRent.toLocaleString("en-IN")}
            <span className="text-sm font-medium text-muted-foreground">/mo</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Explanation */}
        <div className="bg-muted/50 p-4 rounded-lg border border-border/50 text-sm leading-relaxed text-foreground/80 italic">
          "{explanationText}"
        </div>

        {/* Range & Confidence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col justify-center">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Expected Range
            </h4>
            <RentRangeChart
              minEstimate={prediction.minEstimate}
              maxEstimate={prediction.maxEstimate}
              finalEstimate={prediction.predictedRent}
            />
          </div>
          <div className="flex flex-col justify-center">
            <ConfidenceMeter score={prediction.confidenceScore} />
          </div>
        </div>

        {/* Fairness Meter */}
        {currentRent && currentRent > 0 && (
          <PriceFairnessMeter
            fairness={fairness}
            currentRent={currentRent}
            predictedRent={prediction.predictedRent}
          />
        )}

        <div className="h-px w-full bg-border" />

        <PriceFactors factors={factors} />

        <div className="h-px w-full bg-border" />

        <ComparableProperties comparables={comparables} />
      </CardContent>
    </Card>
  );
}
