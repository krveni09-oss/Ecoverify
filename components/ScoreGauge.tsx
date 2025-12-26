
import React from 'react';

interface ScoreGaugeProps {
  score: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-emerald-500';
    if (s >= 50) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getBgColor = (s: number) => {
    if (s >= 80) return 'bg-emerald-500';
    if (s >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-32 w-32">
        <svg className="h-full w-full" viewBox="0 0 100 100">
          <circle
            className="text-slate-200 stroke-current"
            strokeWidth="10"
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
          ></circle>
          <circle
            className={`${getColor(score)} stroke-current transition-all duration-1000 ease-out`}
            strokeWidth="10"
            strokeDasharray={251.2}
            strokeDashoffset={251.2 - (251.2 * score) / 100}
            strokeLinecap="round"
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            transform="rotate(-90 50 50)"
          ></circle>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${getColor(score)}`}>{score}</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-500">Sustainability Score</p>
    </div>
  );
};

export default ScoreGauge;
