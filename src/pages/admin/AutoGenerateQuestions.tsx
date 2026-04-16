import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface Subject {
  id: string;
  name: string;
}
interface Topic {
  id: string;
  subject_id: string;
  name: string;
}

interface DiscoveredQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  difficulty: string;
  type: string;
  topic_name: string;
  source_url: string | null;
  subject_id: string;
  topic_id: string | null;
  selected?: boolean;
}

interface DiscoverStats {
  total_found: number;
  valid: number;
  duplicates: number;
  rejected: number;
  urls_searched: number;
  urls_scraped: number;
}

const AutoGenerateQuestions = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [examType, setExamType] = useState("JAMB");
  const [questionCount, setQuestionCount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<DiscoveredQuestion[]>([]);
  const [stats, setStats] = useState<DiscoverStats | null>(null);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [phase, setPhase] = useState<"setup" | "preview">("setup");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: subs }, { data: tops }] = await Promise.all([
        supabase.from("subjects").select("id, name").order("name"),
        supabase.from("topics").select("id, subject_id, name").order("name"),
      ]);
      setSubjects(subs ?? []);
      setTopics(tops ?? []);
    };
    fetchData();
  }, []);

  const filteredTopics = topics.filter((t) => t.subject_id === selectedSubject);
  const subject = subjects.find((s) => s.id === selectedSubject);
  const topic = topics.find((t) => t.id === selectedTopic);

  const handleDiscover = async () => {
    if (!selectedSubject) {
      toast({
        title: "Error",
        description: "Please select a subject",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setQuestions([]);
    setStats(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "discover-questions",
        {
          body: {
            subject_name: subject?.name,
            topic_name: topic?.name || "",
            exam_type: examType,
            count: questionCount,
            subject_id: selectedSubject,
            topic_id: selectedTopic || null,
          },
        },
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const qs = (data.questions || []).map((q: any) => ({
        ...q,
        selected: true,
      }));
      setQuestions(qs);
      setStats(data.stats);
      setDuplicates(data.duplicate_questions || []);
      setRejected(data.rejected_questions || []);
      setPhase("preview");

      toast({
        title: "Discovery Complete!",
        description: `Found ${data.stats.valid} valid questions from ${data.stats.urls_scraped} sources`,
      });
    } catch (e: any) {
      toast({
        title: "Discovery Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setQuestions((qs) =>
      qs.map((q, i) => (i === index ? { ...q, selected: !q.selected } : q)),
    );
  };

  const toggleAll = (selected: boolean) => {
    setQuestions((qs) => qs.map((q) => ({ ...q, selected })));
  };

  const selectedCount = questions.filter((q) => q.selected).length;

  const handleSave = async () => {
    const toSave = questions.filter((q) => q.selected);
    if (toSave.length === 0) {
      toast({
        title: "Error",
        description: "No questions selected",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      // For questions without a topic_id, create or find a "General" topic for the subject
      const needsDefaultTopic = toSave.some((q) => !q.topic_id);
      let defaultTopicId: string | null = null;

      if (needsDefaultTopic && selectedSubject) {
        const { data: existing } = await supabase
          .from("topics")
          .select("id")
          .eq("subject_id", selectedSubject)
          .eq("name", "General")
          .maybeSingle();

        if (existing) {
          defaultTopicId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabase
            .from("topics")
            .insert({ name: "General", subject_id: selectedSubject })
            .select("id")
            .single();
          if (createErr) throw createErr;
          defaultTopicId = created.id;
        }
      }

      const rows = toSave.map((q) => ({
        subject_id: q.subject_id,
        topic_id: q.topic_id || defaultTopicId!,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        explanation: q.explanation,
        difficulty: q.difficulty,
        type: q.type,
        source_url: q.source_url,
      }));

      // Insert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from("questions").insert(batch);
        if (error) throw error;
      }

      toast({
        title: "Saved!",
        description: `${toSave.length} questions added to the question bank`,
      });
      setPhase("setup");
      setQuestions([]);
      setStats(null);
    } catch (e: any) {
      toast({
        title: "Save Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold">
          Auto-Generate Question Bank
        </h1>
        <p className="text-sm text-muted-foreground">
          Search the internet, extract past questions, clean with AI, and save.
        </p>
      </div>

      {phase === "setup" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={(v) => {
                    setSelectedSubject(v);
                    setSelectedTopic("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic (optional)</Label>
                <Select
                  value={selectedTopic}
                  onValueChange={setSelectedTopic}
                  disabled={!selectedSubject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All topics" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTopics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JAMB">JAMB</SelectItem>
                    <SelectItem value="WAEC">WAEC</SelectItem>
                    <SelectItem value="NECO">NECO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Questions: {questionCount}</Label>
                <Slider
                  value={[questionCount]}
                  onValueChange={(v) => setQuestionCount(v[0])}
                  min={20}
                  max={200}
                  step={10}
                  className="mt-3"
                />
              </div>
            </div>

            <Button
              onClick={handleDiscover}
              disabled={loading || !selectedSubject}
              className="w-full sm:w-auto gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching & Processing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Find & Build Question Bank
                </>
              )}
            </Button>

            {loading && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">
                  🔍 Searching the internet for {examType} {subject?.name}{" "}
                  questions...
                </p>
                <p className="text-xs text-muted-foreground">
                  This may take 1-3 minutes. We're searching, scraping, and
                  cleaning questions with AI.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {phase === "preview" && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {stats.valid}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Valid Questions
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.duplicates}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Duplicates Removed
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">
                    {stats.rejected}
                  </p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{stats.urls_scraped}</p>
                  <p className="text-xs text-muted-foreground">
                    Sources Scraped
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedCount === questions.length}
                onCheckedChange={(checked) => toggleAll(!!checked)}
              />
              <span className="text-sm">
                {selectedCount} of {questions.length} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPhase("setup");
                  setQuestions([]);
                  setStats(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || selectedCount === 0}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save {selectedCount} Questions
              </Button>
            </div>
          </div>

          {/* Question Preview */}
          {isMobile ? (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <Card
                  key={i}
                  className={q.selected ? "border-primary/30" : "opacity-60"}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={q.selected}
                        onCheckedChange={() => toggleQuestion(i)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{q.question_text}</p>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          <span>A: {q.option_a}</span>
                          <span>B: {q.option_b}</span>
                          <span>C: {q.option_c}</span>
                          <span>D: {q.option_d}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {q.difficulty}
                      </Badge>
                      <Badge className="text-xs">Ans: {q.correct_option}</Badge>
                      {q.topic_name && (
                        <Badge variant="outline" className="text-xs">
                          {q.topic_name}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Answer</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q, i) => (
                    <TableRow
                      key={i}
                      className={q.selected ? "" : "opacity-50"}
                    >
                      <TableCell>
                        <Checkbox
                          checked={q.selected}
                          onCheckedChange={() => toggleQuestion(i)}
                        />
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {q.question_text}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            q.difficulty === "hard"
                              ? "destructive"
                              : q.difficulty === "easy"
                                ? "secondary"
                                : "default"
                          }
                          className="text-xs"
                        >
                          {q.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{q.correct_option}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{q.topic_name}</TableCell>
                      <TableCell>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Duplicates & Rejected info */}
          {(duplicates.length > 0 || rejected.length > 0) && (
            <div className="mt-4 space-y-3">
              {duplicates.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">
                        {duplicates.length} Duplicate Questions (Skipped)
                      </span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                      {duplicates.slice(0, 10).map((d, i) => (
                        <li key={i} className="truncate">
                          • {d}
                        </li>
                      ))}
                      {duplicates.length > 10 && (
                        <li>...and {duplicates.length - 10} more</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {rejected.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">
                        {rejected.length} Rejected Questions (Invalid)
                      </span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                      {rejected.slice(0, 10).map((r, i) => (
                        <li key={i} className="truncate">
                          • {r}
                        </li>
                      ))}
                      {rejected.length > 10 && (
                        <li>...and {rejected.length - 10} more</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default AutoGenerateQuestions;
