import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail, BookOpen, HelpCircle } from "lucide-react";

interface Stats {
  totalStudents: number;
  totalAllowed: number;
  totalSubjects: number;
  totalQuestions: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalAllowed: 0,
    totalSubjects: 0,
    totalQuestions: 0,
  });

  useEffect(() => {
    Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase
        .from("allowed_users")
        .select("id", { count: "exact", head: true }),
      supabase.from("subjects").select("id", { count: "exact", head: true }),
      supabase.from("questions").select("id", { count: "exact", head: true }),
    ]).then(([users, allowed, subjects, questions]) => {
      setStats({
        totalStudents: users.count ?? 0,
        totalAllowed: allowed.count ?? 0,
        totalSubjects: subjects.count ?? 0,
        totalQuestions: questions.count ?? 0,
      });
    });
  }, []);

  const cards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Allowed Emails",
      value: stats.totalAllowed,
      icon: Mail,
      color: "text-accent",
    },
    {
      label: "Subjects",
      value: stats.totalSubjects,
      icon: BookOpen,
      color: "text-primary",
    },
    {
      label: "Questions",
      value: stats.totalQuestions,
      icon: HelpCircle,
      color: "text-accent",
    },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview of your JAMB training platform
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
