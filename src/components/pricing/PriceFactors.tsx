import type { PricingFactor } from "@/utils/pricingRules";
import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type PriceFactorsProps = {
  factors: PricingFactor[];
};

export function PriceFactors({ factors }: PriceFactorsProps) {
  if (factors.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Contributing Factors
      </h4>
      <ul className="space-y-2">
        <TooltipProvider>
          {factors.map((factor, idx) => (
            <li
              key={idx}
              className="flex justify-between items-center p-2 rounded-lg bg-muted/30 border border-border text-sm"
            >
              <div className="flex items-center gap-2">
                {factor.type === "positive" ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span className="font-medium">{factor.name}</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">{factor.reason}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span
                className={`font-bold ${factor.type === "positive" ? "text-green-600" : "text-red-600"}`}
              >
                {factor.type === "positive" ? "+" : "-"}
                {factor.adjustmentPercentage}%
              </span>
            </li>
          ))}
        </TooltipProvider>
      </ul>
    </div>
  );
}
