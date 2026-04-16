import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  created_at: string;
}

const Topics = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchAll = async () => {
    const [{ data: subs }, { data: tops }] = await Promise.all([
      supabase.from("subjects").select("id, name").order("name"),
      supabase.from("topics").select("*").order("name"),
    ]);
    setSubjects(subs ?? []);
    setTopics(tops ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const add = async () => {
    if (!subjectId || !name.trim()) return;
    const { error } = await supabase
      .from("topics")
      .insert({ subject_id: subjectId, name: name.trim() });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Added" });
    setName("");
    setOpen(false);
    fetchAll();
  };

  const update = async () => {
    if (!editId || !editName.trim()) return;
    await supabase
      .from("topics")
      .update({ name: editName.trim() })
      .eq("id", editId);
    setEditOpen(false);
    fetchAll();
  };

  const remove = async (id: string) => {
    await supabase.from("topics").delete().eq("id", id);
    fetchAll();
  };

  const grouped = subjects.map((s) => ({
    ...s,
    topics: topics.filter((t) => t.subject_id === s.id),
  }));

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Topics</h1>
          <p className="text-sm text-muted-foreground">
            Manage topics under each subject
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Topic
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Topic</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
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
                <Label>Topic Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Algebra"
                />
              </div>
              <Button onClick={add} className="w-full">
                Create Topic
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Topic Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <Button onClick={update} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : isMobile ? (
        <Accordion type="multiple" className="space-y-2">
          {grouped.map((g) => (
            <AccordionItem
              key={g.id}
              value={g.id}
              className="rounded-lg border bg-card"
            >
              <AccordionTrigger className="px-4 font-heading font-semibold">
                {g.name} ({g.topics.length})
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-2">
                {g.topics.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <span className="text-sm">{t.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditId(t.id);
                          setEditName(t.name);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => remove(t.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {g.topics.length === 0 && (
                  <p className="text-sm text-muted-foreground">No topics yet</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
          {grouped.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Add subjects first
            </p>
          )}
        </Accordion>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <Card key={g.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-heading">{g.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.topics.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditId(t.id);
                                setEditName(t.name);
                                setEditOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(t.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {g.topics.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground"
                        >
                          No topics yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
          {grouped.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Add subjects first
            </p>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default Topics;
