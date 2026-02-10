import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { statusColor, priorityColor, formatDate } from "@/lib/formatters";
import { Search, List, BarChart3, Columns3, ChevronLeft, ChevronRight } from "lucide-react";
import { GanttChart } from "@/components/tasks/GanttChart";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";

const PAGE_SIZE = 50;

export default function Tasks() {
  const { data: orgId } = useOrganization();
  const { data: members = [] } = useOrgMembers();
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Real-time task updates
  useRealtimeSubscription("tasks", [["all-tasks", orgId || ""]]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Server-side paginated query
  const { data: taskData, isLoading } = useQuery({
    queryKey: ["all-tasks", orgId, projectFilter, statusFilter, assigneeFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*, projects(name)", { count: "exact" })
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (projectFilter !== "all") query = query.eq("project_id", projectFilter);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (assigneeFilter !== "all") query = query.eq("assignee_id", assigneeFilter);

      const { data, error, count } = await query;
      if (error) throw error;
      return { tasks: data || [], totalCount: count ?? 0 };
    },
    enabled: !!orgId,
  });

  const tasks = taskData?.tasks ?? [];
  const totalCount = taskData?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getMemberName = (userId: string) => members.find((m) => m.user_id === userId)?.full_name || "—";

  // Client-side search filter (on already paginated results)
  const filtered = tasks.filter((task: any) => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          All tasks across projects
          {totalCount > 0 && <span className="ml-1">({totalCount} total)</span>}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card shadow-soft"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card shadow-soft"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[calc(50%-4px)] sm:w-[150px] bg-card shadow-soft"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={(v) => { setAssigneeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[calc(50%-4px)] sm:w-[180px] bg-card shadow-soft"><SelectValue placeholder="All Assignees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {members.map((m) => (<SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-2">
            <Columns3 className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="gantt" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Gantt Chart
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Loading tasks...</div>
          ) : filtered.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground">No tasks found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((task: any, i: number) => (
                <Card key={task.id} className="shadow-soft card-hover" style={{ animationDelay: `${i * 30}ms` }}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3.5 px-4">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {(task as any).projects?.name}
                        {task.assignee_id ? ` • ${getMemberName(task.assignee_id)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <Badge className={priorityColor(task.priority)} variant="secondary">{task.priority}</Badge>
                      <Badge className={statusColor(task.status)} variant="secondary">{task.status.replace("_", " ")}</Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">{formatDate(task.due_date)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Server-side pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} tasks
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Previous
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="kanban">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Loading tasks...</div>
          ) : (
            <KanbanBoard tasks={filtered} getMemberName={getMemberName} />
          )}
        </TabsContent>

        <TabsContent value="gantt">
          {isLoading ? (
            <div className="text-center py-16 text-muted-foreground">Loading tasks...</div>
          ) : (
            <GanttChart tasks={filtered} getMemberName={getMemberName} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
