import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  LogOut,
  Clock,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Subject = { id: string; name: string; questionCount: number };

const ENGLISH_NAME = "english language";
const TOTAL_SUBJECTS = 4;

const TIME_PRESETS = [
  { minutes: 30, questionsPerSubject: 10 },
  { minutes: 60, questionsPerSubject: 20 },
  { minutes: 90, questionsPerSubject: 30 },
  { minutes: 120, questionsPerSubject: 40 },
];

const CbtSetup = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [englishId, setEnglishId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(120);

  const currentPreset =
    TIME_PRESETS.find((p) => p.minutes === durationMinutes) || TIME_PRESETS[3];
  const questionsPerSubject = currentPreset.questionsPerSubject;
  const totalQuestions = questionsPerSubject * TOTAL_SUBJECTS;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: active } = await supabase
        .from("cbt_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .limit(1);

      if (active && active.length > 0) {
        setActiveSession(active[0].id);
      }

      const { data: subs } = await supabase
        .from("subjects")
        .select("id, name")
        .order("name");
      if (!subs) {
        setLoading(false);
        return;
      }

      const withCounts: Subject[] = [];
      for (const s of subs) {
        const { count } = await supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("subject_id", s.id);
        withCounts.push({ ...s, questionCount: count ?? 0 });

        if (s.name.toLowerCase() === ENGLISH_NAME) {
          setEnglishId(s.id);
          setSelectedIds((prev) => new Set(prev).add(s.id));
        }
      }
      setSubjects(withCounts);
      setLoading(false);
    };
    load();
  }, [user]);

  const toggleSubject = (id: string) => {
    if (id === englishId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const nonEnglish = [...next].filter((x) => x !== englishId);
        if (nonEnglish.length >= 3) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const canStart =
    selectedIds.size === TOTAL_SUBJECTS &&
    [...selectedIds].every((id) => {
      const s = subjects.find((x) => x.id === id);
      return s && s.questionCount >= questionsPerSubject;
    });

  const startExam = async () => {
    if (!user || !canStart) return;
    setStarting(true);

    try {
      const subjectIdsArray = [...selectedIds];
      const { data: session, error: sessionErr } = await supabase
        .from("cbt_sessions")
        .insert({
          user_id: user.id,
          subject_ids: subjectIdsArray,
          status: "in_progress",
          duration_minutes: durationMinutes,
          total_questions: totalQuestions,
        })
        .select("id")
        .single();

      if (sessionErr || !session)
        throw new Error(sessionErr?.message || "Failed to create session");

      let questionIndex = 0;
      const answerRows: Array<{
        session_id: string;
        question_id: string;
        subject_id: string;
        selected_option: null;
        question_index: number;
      }> = [];

      for (const subId of subjectIdsArray) {
        const { data: qs } = await supabase
          .from("questions")
          .select("id")
          .eq("subject_id", subId);

        if (!qs || qs.length < questionsPerSubject) {
          throw new Error("Not enough questions for selected subjects");
        }

        const shuffled = [...qs].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, questionsPerSubject);

        for (const q of picked) {
          answerRows.push({
            session_id: session.id,
            question_id: q.id,
            subject_id: subId,
            selected_option: null,
            question_index: questionIndex++,
          });
        }
      }

      const { error: ansErr } = await supabase
        .from("cbt_answers")
        .insert(answerRows);
      if (ansErr) throw new Error("Failed to setup exam questions");

      navigate(`/cbt/exam/${session.id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setStarting(false);
    }
  };

  const formatDuration = (min: number) => {
    if (min < 60) return `${min} minutes`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? "s" : ""}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground font-heading">
              MEEKAH
            </span>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />{" "}
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
        {activeSession && (
          <Card className="mb-6 border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="flex items-center gap-4 py-5">
              <AlertTriangle className="h-6 w-6 text-yellow-500 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  You have an exam in progress
                </p>
                <p className="text-xs text-muted-foreground">
                  Resume to continue where you left off
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate(`/cbt/exam/${activeSession}`)}
              >
                Resume
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">
              Start CBT Exam
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Simulate a real JAMB CBT exam
            </p>
          </div>

          {/* Duration config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">
                Exam Duration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.minutes}
                    type="button"
                    onClick={() => setDurationMinutes(p.minutes)}
                    className={cn(
                      "rounded-lg border p-3 text-center transition-all",
                      durationMinutes === p.minutes
                        ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    <div className="text-sm font-bold">
                      {formatDuration(p.minutes)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.questionsPerSubject * TOTAL_SUBJECTS} Qs
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                  <Clock className="h-3.5 w-3.5" />{" "}
                  {formatDuration(durationMinutes)}
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                  <CheckSquare className="h-3.5 w-3.5" /> {totalQuestions}{" "}
                  Questions
                </div>
                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
                  {questionsPerSubject} per subject
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">
                Select your subjects ({selectedIds.size}/{TOTAL_SUBJECTS})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                English is compulsory. Pick 3 more subjects.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Loading subjects…
                </p>
              ) : (
                subjects.map((s) => {
                  const isEnglish = s.id === englishId;
                  const isSelected = selectedIds.has(s.id);
                  const hasEnough = s.questionCount >= questionsPerSubject;
                  const disabled =
                    !hasEnough ||
                    (!isSelected &&
                      !isEnglish &&
                      [...selectedIds].filter((x) => x !== englishId).length >=
                        3);

                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isEnglish || (!isSelected && disabled)}
                      onClick={() => toggleSubject(s.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/30",
                        !hasEnough &&
                          !isEnglish &&
                          "opacity-40 cursor-not-allowed",
                        isEnglish && "cursor-default",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded border text-xs font-bold",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30",
                          )}
                        >
                          {isSelected ? "✓" : ""}
                        </div>
                        <span className="text-sm font-medium">{s.name}</span>
                        {isEnglish && (
                          <span className="text-[10px] bg-primary/20 text-primary rounded px-1.5 py-0.5 font-semibold">
                            Required
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs",
                          hasEnough ? "text-muted-foreground" : "text-red-500",
                        )}
                      >
                        {s.questionCount} questions{" "}
                        {!hasEnough && `(need ${questionsPerSubject})`}
                      </span>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            disabled={!canStart || starting}
            onClick={startExam}
          >
            {starting
              ? "Setting up exam…"
              : `Start Exam (${formatDuration(durationMinutes)})`}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CbtSetup;
