import { AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";

type PriceFairnessMeterProps = {
  fairness: {
    assessment: string;
    percentage: number;
  };
  currentRent: number;
  predictedRent: number;
};

export function PriceFairnessMeter({
  fairness,
  currentRent,
  predictedRent,
}: PriceFairnessMeterProps) {
  if (!currentRent) return null;

  const formatMoney = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  let Icon = CheckCircle2;
  let color = "text-green-500";
  let bg = "bg-green-500/10";
  let border = "border-green-200";

  if (fairness.assessment === "Overpriced") {
    Icon = TrendingDown;
    color = "text-red-500";
    bg = "bg-red-500/10";
    border = "border-red-200";
  } else if (fairness.assessment === "Underpriced") {
    Icon = TrendingUp;
    color = "text-amber-500";
    bg = "bg-amber-500/10";
    border = "border-amber-200";
  }

  return (
    <div className={`p-4 rounded-xl border ${border} ${bg} flex flex-col gap-3`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${color} mt-0.5 shrink-0`} />
        <div>
          <h4 className={`font-semibold ${color}`}>{fairness.assessment}</h4>
          {fairness.percentage > 0 && (
            <p className="text-sm opacity-80 mt-1">
              The asking rent is {fairness.percentage}%{" "}
              {fairness.assessment === "Overpriced" ? "higher" : "lower"} than the AI recommended
              market rate.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between text-sm mt-2 pt-3 border-t border-black/10">
        <div>
          <span className="block opacity-70">Asking Rent</span>
          <span className="font-bold text-base">{formatMoney(currentRent / 100)}</span>
        </div>
        <div className="text-right">
          <span className="block opacity-70">AI Recommended</span>
          <span className="font-bold text-base">{formatMoney(predictedRent / 100)}</span>
        </div>
      </div>
    </div>
  );
}
