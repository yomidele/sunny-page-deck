import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface QuestionGridProps {
  totalQuestions: number;
  currentIndex: number;
  answeredQuestions: Set<number>;
  onQuestionSelect: (index: number) => void;
  examMode?: boolean;
}

const QuestionNavigationGrid = ({
  totalQuestions,
  currentIndex,
  answeredQuestions,
  onQuestionSelect,
  examMode = false,
}: QuestionGridProps) => {
  const [showGrid, setShowGrid] = useState(false);
  const questionsPerPage = 20;
  const currentPage = Math.floor(currentIndex / questionsPerPage);
  const startIdx = currentPage * questionsPerPage;
  const endIdx = Math.min(startIdx + questionsPerPage, totalQuestions);

  const visibleQuestions = Array.from(
    { length: endIdx - startIdx },
    (_, i) => startIdx + i,
  );

  return (
    <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-6">
      <h3 className="text-lg font-heading font-bold text-white mb-4">
        Question Navigator
      </h3>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {visibleQuestions.map((idx) => {
          const isAnswered = answeredQuestions.has(idx);
          const isCurrent = idx === currentIndex;

          let bgColor = "bg-[#0B0B0B] border-[#1A1A1A]";
          let textColor = "text-[#B0B0B0]";

          if (isCurrent) {
            bgColor = "bg-[#FFD700] border-[#FFD700]";
            textColor = "text-[#0B0B0B] font-bold";
          } else if (isAnswered) {
            bgColor = "bg-[#FFD700]/20 border-[#FFD700]/50";
            textColor = "text-[#FFD700]";
          }

          return (
            <button
              key={idx}
              onClick={() => onQuestionSelect(idx)}
              className={`w-full h-10 rounded-lg border-2 ${bgColor} ${textColor} font-semibold smooth-transition hover:scale-105 text-sm`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Pagination */}
      {totalQuestions > questionsPerPage && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#B0B0B0]">
            Questions {startIdx + 1} - {endIdx} of {totalQuestions}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => onQuestionSelect(Math.max(0, startIdx - 1))}
              className="border-[#1A1A1A] text-[#B0B0B0] hover:bg-[#1A1A1A]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={endIdx >= totalQuestions}
              onClick={() =>
                onQuestionSelect(Math.min(totalQuestions - 1, endIdx))
              }
              className="border-[#1A1A1A] text-[#B0B0B0] hover:bg-[#1A1A1A]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-[#1A1A1A] space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#FFD700] rounded"></div>
          <span className="text-[#B0B0B0]">Current / Answered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#0B0B0B] border border-[#1A1A1A] rounded"></div>
          <span className="text-[#B0B0B0]">Not Answered</span>
        </div>
      </div>
    </div>
  );
};

export default QuestionNavigationGrid;
