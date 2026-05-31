type RentRangeChartProps = {
  minEstimate: number;
  maxEstimate: number;
  finalEstimate: number;
};

export function RentRangeChart({ minEstimate, maxEstimate, finalEstimate }: RentRangeChartProps) {
  const format = (val: number) => `₹${(val / 1000).toFixed(1)}k`;

  return (
    <div className="py-2">
      <div className="flex justify-between text-xs text-muted-foreground font-medium mb-1">
        <span>{format(minEstimate)}</span>
        <span>{format(maxEstimate)}</span>
      </div>
      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden border border-border/50">
        <div className="absolute top-0 bottom-0 left-[20%] right-[20%] bg-primary/20 rounded-full" />
        <div className="absolute top-0 bottom-0 left-[50%] w-1.5 -ml-[3px] bg-primary rounded-full shadow-sm" />
      </div>
      <div className="text-center mt-2 text-xs font-semibold text-primary">
        Predicted: ₹{finalEstimate.toLocaleString("en-IN")}
      </div>
    </div>
  );
}
