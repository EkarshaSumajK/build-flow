import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function WorkerTaskAssignment() {
  const { data: orgId } = useOrganization();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<string>("");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-active", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!).eq("status", "active");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workers").select("*").eq("organization_id", orgId!).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["project-tasks", orgId, selectedProject],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("id, title, status").eq("organization_id", orgId!).eq("project_id", selectedProject).order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!selectedProject,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["worker-assignments", orgId, selectedProject],
    queryFn: async () => {
      let q = supabase.from("worker_assignments").select("*, workers(name, trade), tasks(title, status)").eq("organization_id", orgId!);
      if (selectedProject) q = q.eq("project_id", selectedProject);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const assignWorker = useMutation({
    mutationFn: async () => {
      if (!selectedWorker || !selectedTask || !selectedProject) throw new Error("Select worker, task, and project");
      const { error } = await supabase.from("worker_assignments").insert({
        worker_id: selectedWorker,
        task_id: selectedTask,
        project_id: selectedProject,
        organization_id: orgId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-assignments"] });
      setAssignDialogOpen(false);
      setSelectedWorker("");
      setSelectedTask("");
      toast.success("Worker assigned to task!");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("worker_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-assignments"] });
      toast.success("Assignment removed!");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select project" /></SelectTrigger>
          <SelectContent>
            {projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedProject && (
          <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Assign Worker
          </Button>
        )}
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Worker to Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Worker</label>
              <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
                <SelectContent>
                  {workers.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.name} {w.trade ? `(${w.trade})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Task</label>
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  {tasks.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => assignWorker.mutate()} disabled={assignWorker.isPending || !selectedWorker || !selectedTask}>
              {assignWorker.isPending ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!selectedProject ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Select a project to view worker assignments</CardContent></Card>
      ) : assignments.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No worker assignments yet</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Task Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.workers?.name}</TableCell>
                  <TableCell>{a.workers?.trade || "—"}</TableCell>
                  <TableCell>{a.tasks?.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{a.tasks?.status?.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeAssignment.mutate(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
