import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CommentsSection } from "@/components/shared/CommentsSection";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Pencil, UserPlus, X } from "lucide-react";
import { formatCurrency, formatDate, statusColor, priorityColor } from "@/lib/formatters";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { data: members = [] } = useOrgMembers();
  const { canManage } = useRole();
  const queryClient = useQueryClient();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("site_engineer");

  const emptyTaskForm = { title: "", description: "", priority: "medium", status: "not_started", start_date: "", due_date: "", assignee_id: "" };
  const [taskForm, setTaskForm] = useState(emptyTaskForm);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("project_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["project-issues", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("issues").select("*").eq("project_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project-members", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_members").select("*").eq("project_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const saveTask = useMutation({
    mutationFn: async () => {
      const payload = {
        title: taskForm.title,
        description: taskForm.description || null,
        priority: taskForm.priority as any,
        status: taskForm.status as any,
        start_date: taskForm.start_date || null,
        due_date: taskForm.due_date || null,
        assignee_id: taskForm.assignee_id || null,
      };
      if (editingTask) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({ ...payload, project_id: id!, organization_id: orgId!, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      setTaskDialogOpen(false);
      setEditingTask(null);
      setTaskForm(emptyTaskForm);
      toast.success(editingTask ? "Task updated!" : "Task created!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      setDeleteTarget(null);
      toast.success("Task deleted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", id] }),
    onError: (e) => toast.error(e.message),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_members").insert({
        project_id: id!, user_id: newMemberId, role: newMemberRole as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", id] });
      setMemberDialogOpen(false);
      setNewMemberId("");
      toast.success("Member added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("project_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", id] });
      toast.success("Member removed!");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEditTask = (task: any) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title, description: task.description || "", priority: task.priority,
      status: task.status, start_date: task.start_date || "", due_date: task.due_date || "",
      assignee_id: task.assignee_id || "",
    });
    setTaskDialogOpen(true);
  };

  const getMemberName = (userId: string) => members.find((m) => m.user_id === userId)?.full_name || userId?.slice(0, 8);

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!project) return <div className="text-center py-12 text-muted-foreground">Project not found</div>;

  const tasksByStatus = {
    not_started: tasks.filter((t: any) => t.status === "not_started"),
    in_progress: tasks.filter((t: any) => t.status === "in_progress"),
    completed: tasks.filter((t: any) => t.status === "completed"),
    blocked: tasks.filter((t: any) => t.status === "blocked"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{project.name}</h1>
            <Badge className={statusColor(project.status)} variant="secondary">{project.status.replace("_", " ")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{project.client_name} {project.location && `• ${project.location}`}</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs sm:text-sm text-muted-foreground">Budget</p><p className="text-lg sm:text-xl font-bold">{formatCurrency(project.budget)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs sm:text-sm text-muted-foreground">Spent</p><p className="text-lg sm:text-xl font-bold">{formatCurrency(project.spent)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs sm:text-sm text-muted-foreground">Tasks</p><p className="text-lg sm:text-xl font-bold">{tasks.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs sm:text-sm text-muted-foreground">Open Issues</p><p className="text-lg sm:text-xl font-bold">{issues.filter((i: any) => i.status === "open").length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="kanban">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="flex-wrap">
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team ({projectMembers.length})</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={() => { setEditingTask(null); setTaskForm(emptyTaskForm); setTaskDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />Add Task
          </Button>
        </div>

        {/* Task create/edit dialog */}
        <Dialog open={taskDialogOpen} onOpenChange={(v) => { setTaskDialogOpen(v); if (!v) setEditingTask(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "Create Task"}</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveTask.mutate(); }} className="space-y-4">
              <div className="space-y-2"><Label>Title *</Label><Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select value={taskForm.assignee_id || "unassigned"} onValueChange={(v) => setTaskForm({ ...taskForm, assignee_id: v === "unassigned" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((m) => (<SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={taskForm.start_date} onChange={(e) => setTaskForm({ ...taskForm, start_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={saveTask.isPending}>{saveTask.isPending ? "Saving..." : editingTask ? "Update Task" : "Create Task"}</Button>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} title="Delete Task" description={`Delete "${deleteTarget?.title}"?`} onConfirm={() => deleteTask.mutate(deleteTarget.id)} loading={deleteTask.isPending} />

        {/* Task detail/comments sheet */}
        <Dialog open={!!selectedTask} onOpenChange={(v) => !v && setSelectedTask(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selectedTask?.title}</DialogTitle></DialogHeader>
            {selectedTask && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedTask.description || "No description"}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge className={priorityColor(selectedTask.priority)} variant="secondary">{selectedTask.priority}</Badge>
                  <Badge className={statusColor(selectedTask.status)} variant="secondary">{selectedTask.status.replace("_", " ")}</Badge>
                  {selectedTask.assignee_id && <Badge variant="outline">{getMemberName(selectedTask.assignee_id)}</Badge>}
                </div>
                <CommentsSection parentId={selectedTask.id} parentType="task" />
              </div>
            )}
          </DialogContent>
        </Dialog>

        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {(["not_started", "in_progress", "completed", "blocked"] as const).map((status) => (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold capitalize">{status.replace("_", " ")}</h3>
                  <Badge variant="secondary" className="text-xs">{tasksByStatus[status].length}</Badge>
                </div>
                <div className="space-y-2 min-h-[100px] rounded-lg border border-dashed border-border p-2">
                  {tasksByStatus[status].map((task: any) => (
                    <Card key={task.id} className="cursor-pointer hover:shadow-sm group" onClick={() => setSelectedTask(task)}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium line-clamp-2">{task.title}</p>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); openEditTask(task); }}><Pencil className="h-3 w-3 text-muted-foreground" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(task); }}><Trash2 className="h-3 w-3 text-destructive" /></button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className={`text-xs ${priorityColor(task.priority)}`}>{task.priority}</Badge>
                          {task.assignee_id && <span className="text-xs text-muted-foreground">{getMemberName(task.assignee_id)}</span>}
                        </div>
                        <Select value={task.status} onValueChange={(v) => { updateTaskStatus.mutate({ taskId: task.id, status: v }); }}>
                          <SelectTrigger className="h-7 text-xs" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem><SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead><TableHead>Assignee</TableHead><TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead><TableHead>Due Date</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No tasks yet</TableCell></TableRow>
                ) : tasks.map((task: any) => (
                  <TableRow key={task.id} className="cursor-pointer" onClick={() => setSelectedTask(task)}>
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>{task.assignee_id ? getMemberName(task.assignee_id) : "—"}</TableCell>
                    <TableCell><Badge className={priorityColor(task.priority)} variant="secondary">{task.priority}</Badge></TableCell>
                    <TableCell>
                      <Select value={task.status} onValueChange={(v) => updateTaskStatus.mutate({ taskId: task.id, status: v })}>
                        <SelectTrigger className="h-7 w-[130px] text-xs" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem><SelectItem value="blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{formatDate(task.due_date)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditTask(task)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(task)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4 space-y-4">
          <div className="flex justify-end">
            {canManage && (
              <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><UserPlus className="mr-2 h-4 w-4" />Add Member</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); addMember.mutate(); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Member</Label>
                      <Select value={newMemberId} onValueChange={setNewMemberId}>
                        <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                        <SelectContent>
                          {members.filter(m => !projectMembers.some((pm: any) => pm.user_id === m.user_id)).map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="project_manager">Project Manager</SelectItem>
                          <SelectItem value="site_engineer">Site Engineer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={addMember.isPending || !newMemberId}>Add Member</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead>{canManage && <TableHead>Actions</TableHead>}</TableRow>
              </TableHeader>
              <TableBody>
                {projectMembers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No team members assigned</TableCell></TableRow>
                ) : projectMembers.map((pm: any) => (
                  <TableRow key={pm.id}>
                    <TableCell className="font-medium">{getMemberName(pm.user_id)}</TableCell>
                    <TableCell className="capitalize">{pm.role.replace("_", " ")}</TableCell>
                    <TableCell>{formatDate(pm.joined_at)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeMember.mutate(pm.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {issues.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No issues reported</TableCell></TableRow>
                ) : issues.map((issue: any) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.title}</TableCell>
                    <TableCell className="capitalize">{issue.category}</TableCell>
                    <TableCell><Badge className={priorityColor(issue.severity)} variant="secondary">{issue.severity}</Badge></TableCell>
                    <TableCell><Badge className={statusColor(issue.status)} variant="secondary">{issue.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>{formatDate(issue.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
