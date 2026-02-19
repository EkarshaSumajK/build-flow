import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, ClipboardList, Users, AlertTriangle, IndianRupee, TrendingUp, ArrowRight, Activity } from "lucide-react";
import { formatCurrency, statusColor } from "@/lib/formatters";
import { useNavigate } from "react-router-dom";
import type { Project, Task, Issue, Attendance } from "@/types/database";

export default function Dashboard() {
  const { data: orgId } = useOrganization();
  const navigate = useNavigate();

  // Real-time subscriptions for live dashboard updates
  useRealtimeSubscription("tasks", [["dashboard-tasks", orgId || ""]]);
  useRealtimeSubscription("issues", [["dashboard-issues", orgId || ""]]);
  useRealtimeSubscription("attendance", [["dashboard-attendance", orgId || ""]]);
  useRealtimeSubscription("projects", [["projects", orgId || ""]]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("organization_id", orgId!).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["dashboard-tasks", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["dashboard-issues", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("issues").select("*").eq("organization_id", orgId!).in("status", ["open", "in_progress"]);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["dashboard-attendance", orgId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("attendance").select("*").eq("organization_id", orgId!).eq("date", today);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const activeProjects = projects.filter((p: Project) => p.status === "active").length;
  const openTasks = tasks.filter((t: Task) => t.status !== "completed").length;
  const workersPresent = todayAttendance.filter((a: Attendance) => a.status === "present" || a.status === "overtime").length;
  const openIssues = issues.length;
  const totalBudget = projects.reduce((sum: number, p: Project) => sum + (Number(p.budget) || 0), 0);
  const totalSpent = projects.reduce((sum: number, p: Project) => sum + (Number(p.spent) || 0), 0);

  const stats = [
    { label: "Active Projects", value: activeProjects, icon: FolderKanban, color: "text-primary", bg: "bg-primary/8" },
    { label: "Open Tasks", value: openTasks, icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-500/8" },
    { label: "Workers Today", value: workersPresent, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/8" },
    { label: "Open Issues", value: openIssues, icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/8" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome section - Apple style */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/90 p-8 text-white shadow-apple-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-white/70 text-base max-w-md">Here's what's happening across your construction projects today.</p>
        </div>
      </div>

      {/* Stats grid - Apple card style */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} className="group cursor-default" style={{ animationDelay: `${i * 50}ms` }}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${stat.bg} transition-transform duration-300 group-hover:scale-110`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-3xl font-semibold tracking-tight mt-0.5">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Budget & Progress cards */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Budget Overview</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/8">
              <IndianRupee className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total Budget</span>
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(totalBudget)}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total Spent</span>
              <span className="text-lg font-semibold tabular-nums">{formatCurrency(totalSpent)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 ease-apple"
                style={{ width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% utilized` : "No budget set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Task Progress</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/8">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Completed", value: tasks.filter((t: Task) => t.status === "completed").length, color: "text-emerald-500" },
              { label: "In Progress", value: tasks.filter((t: Task) => t.status === "in_progress").length, color: "text-primary" },
              { label: "Blocked", value: tasks.filter((t: Task) => t.status === "blocked").length, color: "text-rose-500" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`text-lg font-semibold tabular-nums ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Projects & Issues lists */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
            <button
              onClick={() => navigate("/projects")}
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 transition-colors"
            >
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No projects yet.</p>
            ) : (
              <div className="space-y-1">
                {projects.slice(0, 5).map((project: Project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-xl p-3 -mx-1 transition-all duration-200 ease-apple"
                    onClick={() => navigate(`/projects/${(project as any).project_code || project.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{project.client_name || project.location || "No details"}</p>
                    </div>
                    <Badge className={statusColor(project.status)} variant="secondary">
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Recent Issues</CardTitle>
            <button
              onClick={() => navigate("/issues")}
              className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 transition-colors"
            >
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No open issues.</p>
            ) : (
              <div className="space-y-1">
                {issues.slice(0, 5).map((issue: Issue) => (
                  <div key={issue.id} className="flex items-center justify-between p-3 -mx-1 rounded-xl hover:bg-muted/50 transition-all duration-200 ease-apple">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{issue.title}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{issue.category} • {issue.severity}</p>
                    </div>
                    <Badge className={statusColor(issue.status)} variant="secondary">
                      {issue.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
