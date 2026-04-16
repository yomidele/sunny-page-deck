import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Plus,
  Trash2,
  Upload,
  FileText,
  Loader2,
  Sparkles,
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
interface Question {
  id: string;
  subject_id: string;
  topic_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  created_at: string;
}

const QuestionBank = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [genSubject, setGenSubject] = useState("");
  const [genTopic, setGenTopic] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [form, setForm] = useState({
    subject_id: "",
    topic_id: "",
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "",
    explanation: "",
  });

  const fetchAll = async () => {
    const [{ data: subs }, { data: tops }, { data: qs }] = await Promise.all([
      supabase.from("subjects").select("id, name").order("name"),
      supabase.from("topics").select("id, subject_id, name").order("name"),
      supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    setSubjects(subs ?? []);
    setTopics(tops ?? []);
    setQuestions(qs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredTopics = topics.filter((t) =>
    form.subject_id ? t.subject_id === form.subject_id : true,
  );
  const filterTopicsList = topics.filter((t) =>
    filterSubject !== "all" ? t.subject_id === filterSubject : true,
  );
  const genTopicsList = topics.filter((t) =>
    genSubject ? t.subject_id === genSubject : true,
  );

  const filtered = questions.filter((q) => {
    if (filterSubject !== "all" && q.subject_id !== filterSubject) return false;
    if (filterTopic !== "all" && q.topic_id !== filterTopic) return false;
    return true;
  });

  const addQuestion = async () => {
    const {
      subject_id,
      topic_id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      explanation,
    } = form;
    if (
      !subject_id ||
      !topic_id ||
      !question_text ||
      !option_a ||
      !option_b ||
      !option_c ||
      !option_d ||
      !correct_option
    ) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase.from("questions").insert({
      subject_id,
      topic_id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_option,
      explanation: explanation || null,
    });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Question added" });
    setForm({
      subject_id: "",
      topic_id: "",
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_option: "",
      explanation: "",
    });
    setOpen(false);
    fetchAll();
  };

  const remove = async (id: string) => {
    await supabase.from("questions").delete().eq("id", id);
    fetchAll();
  };

  const handleBulkUpload = async () => {
    if (!selectedFile || !bulkSubject) {
      toast({
        title: "Error",
        description: "Please select a subject and file",
        variant: "destructive",
      });
      return;
    }
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File must be under 20MB",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i]);
      const file_base64 = btoa(binary);
      const file_type = ext === "pdf" ? "pdf" : "csv";

      const { data, error } = await supabase.functions.invoke(
        "parse-questions",
        {
          body: { file_base64, file_type, subject_id: bulkSubject },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Upload Successful!",
        description: `${data.count} questions added`,
      });
      setBulkOpen(false);
      setSelectedFile(null);
      setBulkSubject("");
      fetchAll();
    } catch (e: any) {
      toast({
        title: "Upload Failed",
        description: e.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!genSubject || !genTopic) {
      toast({
        title: "Error",
        description: "Please select a subject and topic",
        variant: "destructive",
      });
      return;
    }
    const subject = subjects.find((s) => s.id === genSubject);
    const topic = topics.find((t) => t.id === genTopic);
    if (!subject || !topic) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-questions",
        {
          body: {
            subject_id: genSubject,
            topic_id: genTopic,
            subject_name: subject.name,
            topic_name: topic.name,
            count: 50,
          },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Questions Generated!",
        description: `${data.count} questions created for ${topic.name}`,
      });
      setGenerateOpen(false);
      setGenSubject("");
      setGenTopic("");
      fetchAll();
    } catch (e: any) {
      toast({
        title: "Generation Failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const getSubjectName = (id: string) =>
    subjects.find((s) => s.id === id)?.name ?? "";
  const getTopicName = (id: string) =>
    topics.find((t) => t.id === id)?.name ?? "";

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Question Bank</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} question{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* AI Generate Dialog */}
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Sparkles className="h-4 w-4" />
                AI Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Questions with AI</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                AI will generate 50 JAMB-standard questions with mixed
                difficulty and explanations.
              </p>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={genSubject}
                    onValueChange={(v) => {
                      setGenSubject(v);
                      setGenTopic("");
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
                  <Label>Topic</Label>
                  <Select
                    value={genTopic}
                    onValueChange={setGenTopic}
                    disabled={!genSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {genTopicsList.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAIGenerate}
                  disabled={generating || !genSubject || !genTopic}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate 50 Questions
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Upload Dialog */}
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Upload className="h-4 w-4" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Upload Questions</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Upload a PDF or CSV file with questions.
              </p>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={bulkSubject} onValueChange={setBulkSubject}>
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
                  <Label>File (PDF or CSV)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.csv"
                    className="hidden"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] ?? null)
                    }
                  />
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileText className="h-4 w-4" />
                    {selectedFile ? selectedFile.name : "Choose file..."}
                  </Button>
                </div>
                <Button
                  onClick={handleBulkUpload}
                  disabled={uploading || !bulkSubject || !selectedFile}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Upload & Process"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Single Question Dialog */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Question</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select
                      value={form.subject_id}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, subject_id: v, topic_id: "" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
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
                    <Label>Topic</Label>
                    <Select
                      value={form.topic_id}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, topic_id: v }))
                      }
                      disabled={!form.subject_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
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
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Textarea
                    rows={3}
                    value={form.question_text}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, question_text: e.target.value }))
                    }
                    placeholder="Enter question text"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(["A", "B", "C", "D"] as const).map((opt) => (
                    <div key={opt} className="space-y-1">
                      <Label>Option {opt}</Label>
                      <Input
                        value={
                          form[
                            `option_${opt.toLowerCase()}` as keyof typeof form
                          ]
                        }
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [`option_${opt.toLowerCase()}`]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  <Select
                    value={form.correct_option}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, correct_option: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "D"].map((o) => (
                        <SelectItem key={o} value={o}>
                          Option {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Explanation (optional)</Label>
                  <Textarea
                    rows={2}
                    value={form.explanation}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, explanation: e.target.value }))
                    }
                  />
                </div>
                <Button onClick={addQuestion} className="w-full">
                  Add Question
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Select
          value={filterSubject}
          onValueChange={(v) => {
            setFilterSubject(v);
            setFilterTopic("all");
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterTopic}
          onValueChange={setFilterTopic}
          disabled={filterSubject === "all"}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All Topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {filterTopicsList.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">
                    {q.question_text}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => remove(q.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {getSubjectName(q.subject_id)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getTopicName(q.topic_id)}
                  </Badge>
                  <Badge className="text-xs">Ans: {q.correct_option}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>A: {q.option_a}</span>
                  <span>B: {q.option_b}</span>
                  <span>C: {q.option_c}</span>
                  <span>D: {q.option_d}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No questions yet
            </p>
          )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Answer</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="max-w-xs truncate">
                    {q.question_text}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getSubjectName(q.subject_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>{getTopicName(q.topic_id)}</TableCell>
                  <TableCell>
                    <Badge>{q.correct_option}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(q.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No questions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </AdminLayout>
  );
};

export default QuestionBank;
