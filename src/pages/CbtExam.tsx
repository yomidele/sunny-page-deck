import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AnswerSlot = {
  id: string;
  question_id: string;
  subject_id: string;
  selected_option: string | null;
  question_index: number;
};

type QuestionData = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
};

type SubjectInfo = { id: string; name: string };

const CbtExam = () => {
  const { user } = useAuth();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswerSlot[]>([]);
  const [questions, setQuestions] = useState<Map<string, QuestionData>>(
    new Map(),
  );
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [subjectMap, setSubjectMap] = useState<Map<string, string>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showNav, setShowNav] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("in_progress");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savingRef = useRef(false);

  // Load session data
  useEffect(() => {
    if (!user || !sessionId) return;

    const loadSession = async () => {
      // Get session info
      const { data: session } = await supabase
        .from("cbt_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      if (!session) {
        toast({ title: "Session not found", variant: "destructive" });
        navigate("/cbt/setup");
        return;
      }

      if (session.status === "completed") {
        navigate(`/cbt/result/${sessionId}`);
        return;
      }

      setSessionStatus(session.status);

      // Calculate remaining time
      const startTime = new Date(session.start_time).getTime();
      const endTime = startTime + session.duration_minutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

      if (remaining <= 0) {
        // Time's up - auto submit
        await submitExam(sessionId);
        return;
      }

      setTimeLeft(remaining);

      // Load answers
      const { data: answerData } = await supabase
        .from("cbt_answers")
        .select("*")
        .eq("session_id", sessionId)
        .order("question_index");

      if (!answerData) {
        setLoading(false);
        return;
      }
      setAnswers(answerData as AnswerSlot[]);

      // Load question details
      const qIds = answerData.map((a) => a.question_id);
      const qMap = new Map<string, QuestionData>();

      // Fetch in batches of 50
      for (let i = 0; i < qIds.length; i += 50) {
        const batch = qIds.slice(i, i + 50);
        const { data: qData } = await supabase
          .from("questions")
          .select(
            "id, question_text, option_a, option_b, option_c, option_d, correct_option",
          )
          .in("id", batch);
        if (qData) qData.forEach((q) => qMap.set(q.id, q));
      }
      setQuestions(qMap);

      // Load subject names
      const subjectIds = session.subject_ids as string[];
      const { data: subData } = await supabase
        .from("subjects")
        .select("id, name")
        .in("id", subjectIds);

      if (subData) {
        setSubjects(subData);
        const sMap = new Map<string, string>();
        subData.forEach((s) => sMap.set(s.id, s.name));
        setSubjectMap(sMap);
      }

      setLoading(false);
    };

    loadSession();
  }, [user, sessionId]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0 || sessionStatus !== "in_progress") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit
          if (sessionId) submitExam(sessionId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft > 0, sessionStatus]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Save answer
  const saveAnswer = useCallback(
    async (answerSlotId: string, option: string) => {
      if (savingRef.current) return;
      savingRef.current = true;

      // Optimistic update
      setAnswers((prev) =>
        prev.map((a) =>
          a.id === answerSlotId ? { ...a, selected_option: option } : a,
        ),
      );

      await supabase
        .from("cbt_answers")
        .update({
          selected_option: option,
          updated_at: new Date().toISOString(),
        })
        .eq("id", answerSlotId);

      savingRef.current = false;
    },
    [],
  );

  // Submit exam
  const submitExam = async (sid: string) => {
    setSubmitting(true);

    try {
      // Get all answers with question data
      const { data: finalAnswers } = await supabase
        .from("cbt_answers")
        .select("*, questions(correct_option)")
        .eq("session_id", sid);

      if (!finalAnswers) throw new Error("Could not load answers");

      // Calculate scores
      const subjectScores: Record<
        string,
        { correct: number; total: number; name: string }
      > = {};

      // Get subject names
      const { data: session } = await supabase
        .from("cbt_sessions")
        .select("subject_ids")
        .eq("id", sid)
        .single();

      const subjectIds = (session?.subject_ids as string[]) || [];
      const { data: subData } = await supabase
        .from("subjects")
        .select("id, name")
        .in("id", subjectIds);

      const sNames = new Map<string, string>();
      subData?.forEach((s) => sNames.set(s.id, s.name));

      let totalCorrect = 0;

      for (const ans of finalAnswers) {
        const subId = ans.subject_id;
        if (!subjectScores[subId]) {
          subjectScores[subId] = {
            correct: 0,
            total: 0,
            name: sNames.get(subId) || "Unknown",
          };
        }
        subjectScores[subId].total++;

        const correctOpt = (ans as any).questions?.correct_option;
        if (ans.selected_option && ans.selected_option === correctOpt) {
          subjectScores[subId].correct++;
          totalCorrect++;
        }
      }

      // Save result
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error("Not authenticated");

      await supabase.from("cbt_results").insert({
        user_id: currentUser.user.id,
        session_id: sid,
        total_score: totalCorrect,
        total_questions: finalAnswers.length,
        correct_answers: totalCorrect,
        subject_scores: subjectScores,
      });

      // Mark session as completed
      await supabase
        .from("cbt_sessions")
        .update({
          status: "completed",
          end_time: new Date().toISOString(),
        })
        .eq("id", sid);

      navigate(`/cbt/result/${sid}`);
    } catch (e: any) {
      toast({
        title: "Submit error",
        description: e.message,
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading exam…</p>
      </div>
    );
  }

  const currentAnswer = answers[currentIndex];
  const currentQuestion = currentAnswer
    ? questions.get(currentAnswer.question_id)
    : null;
  const currentSubjectName = currentAnswer
    ? subjectMap.get(currentAnswer.subject_id) || ""
    : "";
  const answeredCount = answers.filter(
    (a) => a.selected_option !== null,
  ).length;

  // Group answers by subject for the nav panel
  const answersBySubject = subjects.map((s) => ({
    subject: s,
    answers: answers.filter((a) => a.subject_id === s.id),
  }));

  const isWarning = timeLeft <= 300; // 5 min warning
  const isDanger = timeLeft <= 60; // 1 min

  const options = currentQuestion
    ? [
        { key: "A", text: currentQuestion.option_a },
        { key: "B", text: currentQuestion.option_b },
        { key: "C", text: currentQuestion.option_c },
        { key: "D", text: currentQuestion.option_d },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar - Timer + Info */}
      <header
        className={cn(
          "sticky top-0 z-50 border-b px-4 py-2",
          isDanger
            ? "bg-red-500/10 border-red-500/30"
            : isWarning
              ? "bg-yellow-500/10 border-yellow-500/30"
              : "bg-background border-border",
        )}
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary hidden sm:block" />
            <span className="text-xs text-muted-foreground hidden sm:block">
              CBT Exam
            </span>
            <span className="text-xs bg-muted rounded px-2 py-0.5 font-medium">
              {currentSubjectName}
            </span>
          </div>

          <div
            className={cn(
              "flex items-center gap-1.5 font-mono text-lg font-bold",
              isDanger
                ? "text-red-500 animate-pulse"
                : isWarning
                  ? "text-yellow-500"
                  : "text-foreground",
            )}
          >
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {answeredCount}/{answers.length} answered
            </span>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowNav(!showNav)}
            >
              {showNav ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main question area */}
        <div className="flex-1 container mx-auto px-4 py-4 lg:py-6 max-w-3xl">
          {currentQuestion && currentAnswer && (
            <div className="space-y-4">
              {/* Question number */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Question {currentIndex + 1} of {answers.length}
                </span>
                <span className="text-xs bg-muted rounded-full px-2.5 py-1">
                  {currentSubjectName}
                </span>
              </div>

              {/* Question card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg font-heading leading-relaxed">
                    {currentQuestion.question_text}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {options.map((opt) => {
                    const isSelected =
                      currentAnswer.selected_option === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => saveAnswer(currentAnswer.id, opt.key)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg border p-3 md:p-4 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50 hover:bg-accent/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30",
                          )}
                        >
                          {opt.key}
                        </span>
                        <span className="text-sm md:text-base pt-0.5">
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Navigation buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(currentIndex - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                {currentIndex < answers.length - 1 ? (
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="flex-1"
                    variant="destructive"
                    onClick={() => setShowSubmitDialog(true)}
                  >
                    Submit Exam
                  </Button>
                )}
              </div>

              {/* Submit button on mobile */}
              <Button
                variant="outline"
                className="w-full lg:hidden text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => setShowSubmitDialog(true)}
              >
                Submit Exam
              </Button>
            </div>
          )}
        </div>

        {/* Navigation panel - desktop sidebar */}
        <aside className="hidden lg:block w-72 border-l border-border bg-muted/30 p-4 overflow-y-auto">
          <NavPanel
            answersBySubject={answersBySubject}
            currentIndex={currentIndex}
            onJump={setCurrentIndex}
            answers={answers}
            onSubmit={() => setShowSubmitDialog(true)}
            answeredCount={answeredCount}
            total={answers.length}
          />
        </aside>

        {/* Navigation panel - mobile modal */}
        {showNav && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowNav(false)}
            />
            <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-background border-l border-border p-4 overflow-y-auto animate-in slide-in-from-right">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-heading font-bold text-sm">
                  Question Navigator
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNav(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <NavPanel
                answersBySubject={answersBySubject}
                currentIndex={currentIndex}
                onJump={(i) => {
                  setCurrentIndex(i);
                  setShowNav(false);
                }}
                answers={answers}
                onSubmit={() => {
                  setShowNav(false);
                  setShowSubmitDialog(true);
                }}
                answeredCount={answeredCount}
                total={answers.length}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Submit Exam?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} out of {answers.length}{" "}
              questions.
              {answeredCount < answers.length && (
                <span className="block mt-2 text-yellow-600 font-medium">
                  ⚠️ {answers.length - answeredCount} questions are unanswered
                  and will be marked wrong.
                </span>
              )}
              <span className="block mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => sessionId && submitExam(sessionId)}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit Exam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Navigation panel component
function NavPanel({
  answersBySubject,
  currentIndex,
  onJump,
  answers,
  onSubmit,
  answeredCount,
  total,
}: {
  answersBySubject: Array<{ subject: SubjectInfo; answers: AnswerSlot[] }>;
  currentIndex: number;
  onJump: (i: number) => void;
  answers: AnswerSlot[];
  onSubmit: () => void;
  answeredCount: number;
  total: number;
}) {
  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        {answeredCount}/{total} answered
      </div>

      {answersBySubject.map(({ subject, answers: subAnswers }) => (
        <div key={subject.id}>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            {subject.name}
          </h4>
          <div className="grid grid-cols-8 gap-1">
            {subAnswers.map((a) => {
              const globalIndex = answers.findIndex((x) => x.id === a.id);
              const isCurrent = globalIndex === currentIndex;
              const isAnswered = a.selected_option !== null;

              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onJump(globalIndex)}
                  className={cn(
                    "h-8 w-full rounded text-xs font-medium transition-all",
                    isCurrent
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                      : isAnswered
                        ? "bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30"
                        : "bg-muted text-muted-foreground border border-border hover:border-primary/30",
                  )}
                >
                  {globalIndex + 1}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <Button
        variant="destructive"
        size="sm"
        className="w-full mt-4"
        onClick={onSubmit}
      >
        Submit Exam
      </Button>
    </div>
  );
}

export default CbtExam;
