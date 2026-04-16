import { useEffect, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";

interface TimerProps {
  timeLeft: number;
  totalDuration: number;
  isWarning?: boolean;
  onTimeUp?: () => void;
}

const ExamTimer = ({
  timeLeft,
  totalDuration,
  isWarning = false,
  onTimeUp,
}: TimerProps) => {
  useEffect(() => {
    if (timeLeft === 0 && onTimeUp) {
      onTimeUp();
    }
  }, [timeLeft, onTimeUp]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const percentage = (timeLeft / (totalDuration * 60)) * 100;
  let bgColor = "bg-[#111111]";
  let textColor = "text-white";
  let progressColor = "bg-[#FFD700]";

  if (percentage < 10) {
    bgColor = "bg-red-500/20";
    textColor = "text-red-400";
    progressColor = "bg-red-500";
  } else if (percentage < 25) {
    bgColor = "bg-yellow-500/20";
    textColor = "text-yellow-400";
    progressColor = "bg-yellow-500";
  }

  return (
    <div
      className={`${bgColor} border border-[#1A1A1A] rounded-lg p-4 smooth-transition`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className={`h-5 w-5 ${textColor}`} />
          <span className="text-sm font-medium text-[#B0B0B0]">
            Time Remaining
          </span>
        </div>
      </div>
      <div className="text-3xl font-heading font-bold mb-3">
        <span className={textColor}>
          {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
          {String(seconds).padStart(2, "0")}
        </span>
      </div>
      <div className="w-full h-2 bg-[#0B0B0B] rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} smooth-transition`}
          style={{ width: `${Math.max(0, percentage)}%` }}
        />
      </div>
      {percentage < 10 && (
        <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Time running out!</span>
        </div>
      )}
    </div>
  );
};

export default ExamTimer;
