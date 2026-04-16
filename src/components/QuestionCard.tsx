import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface QuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  questionText: string;
  options: Array<{ id: string; text: string }>;
  selectedOption: string | null;
  correctOption: string | null;
  answered: boolean;
  onSelectOption: (optionId: string) => void;
  showFeedback?: boolean;
}

const QuestionCard = ({
  questionNumber,
  totalQuestions,
  questionText,
  options,
  selectedOption,
  correctOption,
  answered,
  onSelectOption,
  showFeedback = true,
}: QuestionCardProps) => {
  const isCorrect = selectedOption === correctOption;
  const showResult = showFeedback && answered;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-white">
            Question {questionNumber} of {totalQuestions}
          </h2>
          <div className="w-32 h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FFD700] smooth-transition"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-8 mb-8">
        <p className="text-xl text-white leading-relaxed font-medium">
          {questionText}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-4 mb-8">
        {options.map((option) => {
          const isSelected = selectedOption === option.id;
          const isCorrectOption = correctOption === option.id;
          const isWrong = isSelected && !isCorrect && showResult;

          let borderColor = "border-[#1A1A1A]";
          let bgColor = "bg-[#111111]";
          let textColor = "text-[#B0B0B0]";
          let hoverColor = "hover:border-[#FFD700] hover:bg-[#1A1A1A]";

          if (isSelected && !showResult) {
            borderColor = "border-[#FFD700]";
            bgColor = "bg-[#1A1A1A]";
            textColor = "text-[#FFD700]";
            hoverColor = "";
          }

          if (showResult) {
            if (isCorrectOption) {
              borderColor = "border-green-500/50";
              bgColor = "bg-green-500/10";
              textColor = "text-green-400";
              hoverColor = "";
            }
            if (isWrong) {
              borderColor = "border-red-500/50";
              bgColor = "bg-red-500/10";
              textColor = "text-red-400";
              hoverColor = "";
            }
            if (!isSelected && !isCorrectOption) {
              borderColor = "border-[#1A1A1A]";
              bgColor = "bg-[#111111]";
              textColor = "text-[#B0B0B0]";
              hoverColor = "";
            }
          }

          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              disabled={showResult}
              className={`w-full p-4 rounded-xl border-2 smooth-transition text-left ${borderColor} ${bgColor} ${textColor} ${hoverColor} ${
                showResult ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option.text}</span>
                {showResult && isCorrectOption && (
                  <Check className="h-5 w-5 text-green-400" />
                )}
                {showResult && isWrong && (
                  <X className="h-5 w-5 text-red-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {showResult && answered && (
        <div
          className={`p-4 rounded-xl border ${
            isCorrect
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <p className="font-medium">
            {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
          </p>
          <p className="text-sm mt-1 text-[#B0B0B0]">
            {isCorrect
              ? "Great job! You got it right."
              : "The correct answer has been highlighted. Review this question to improve."}
          </p>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
