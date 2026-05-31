type ConfidenceMeterProps = {
  score: number;
};

export function ConfidenceMeter({ score }: ConfidenceMeterProps) {
  let color = "bg-red-500";
  if (score >= 80) color = "bg-green-500";
  else if (score >= 50) color = "bg-amber-500";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-sm font-medium">
        <span>AI Confidence Score</span>
        <span className={color.replace("bg-", "text-")}>{score}%</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out`} 
          style={{ width: `${score}%` }} 
        />
      </div>
    </div>
  );
}
