type LocationScoreProps = {
  score: number;
};

export function LocationScore({ score }: LocationScoreProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  let colorClass = "text-red-500";
  if (score >= 80) colorClass = "text-green-500";
  else if (score >= 60) colorClass = "text-yellow-500";

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl shadow-sm">
      <div className="relative flex items-center justify-center">
        {/* Background Circle */}
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-muted"
          />
          {/* Progress Circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-1000 ease-out ${colorClass}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold">{score}</span>
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Out of 100</span>
        </div>
      </div>
      <h3 className="mt-4 font-semibold text-lg text-center">Overall Location Score</h3>
    </div>
  );
}
