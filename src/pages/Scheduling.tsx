import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatters";
import { Plus, CalendarDays, Trash2, Clock } from "lucide-react";

const SHIFTS = [
  { value: "day", label: "Day Shift (8AM-5PM)" },
  { value: "night", label: "Night Shift (8PM-5AM)" },
  { value: "morning", label: "Morning (6AM-2PM)" },
  { value: "evening", label: "Evening (2PM-10PM)" },
  { value: "full_day", label: "Full Day (6AM-6PM)" },
];

const shiftColor = (shift: string) => {
  const colors: Record<string, string> = {
    day: "bg-warning/10 text-warning border-warning/20",
    night: "bg-primary/10 text-primary border-primary/20",
    morning: "bg-success/10 text-success border-success/20",
    evening: "bg-accent/10 text-accent-foreground border-accent/20",
    full_day: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return colors[shift] || "bg-muted text-muted-foreground";
};

export default function Scheduling({ projectId }: { projectId?: string }) {
  const { data: orgId } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [form, setForm] = useState({ project_id: "", worker_id: "", shift: "day", start_date: "", end_date: "", notes: "" });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-active", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workers").select("*").eq("organization_id", orgId!).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules", orgId, selectedProject],
    queryFn: async () => {
      let q = supabase.from("worker_schedules").select("*, workers(name, trade), projects(name)").eq("organization_id", orgId!).order("start_date", { ascending: false });
      if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("worker_schedules").insert({
        organization_id: orgId!,
        project_id: form.project_id,
        worker_id: form.worker_id,
        shift: form.shift,
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      setOpen(false);
      setForm({ project_id: "", worker_id: "", shift: "day", start_date: "", end_date: "", notes: "" });
      toast.success("Schedule created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("worker_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule deleted");
    },
  });

  // Timeline visualization
  const today = new Date();
  const timelineDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const activeSchedules = schedules.filter((s: any) => s.end_date >= today.toISOString().split("T")[0]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workforce Scheduling</h1>
          <p className="text-muted-foreground">Plan and manage worker shifts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Schedule</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Schedule</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Project *</Label>
                <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Worker *</Label>
                <Select value={form.worker_id} onValueChange={v => setForm(p => ({ ...p, worker_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
                  <SelectContent>{workers.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name} {w.trade ? `(${w.trade})` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Shift</Label>
                <Select value={form.shift} onValueChange={v => setForm(p => ({ ...p, shift: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SHIFTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div><Label>End Date *</Label><Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button className="w-full" disabled={!form.project_id || !form.worker_id || !form.start_date || !form.end_date || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? "Creating..." : "Create Schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Schedules</p><p className="text-2xl font-bold">{schedules.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Active Now</p><p className="text-2xl font-bold text-success">{activeSchedules.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Workers Scheduled</p><p className="text-2xl font-bold">{new Set(schedules.map((s: any) => s.worker_id)).size}</p></CardContent></Card>
      </div>

      {/* Timeline View */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> 2-Week Timeline</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[200px_repeat(14,1fr)] gap-px bg-border rounded-lg overflow-hidden">
                <div className="bg-muted p-2 text-xs font-medium">Worker</div>
                {timelineDays.map(d => (
                  <div key={d} className="bg-muted p-1 text-center text-[10px] font-medium">
                    {new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </div>
                ))}
                {activeSchedules.length === 0 ? (
                  <div className="col-span-full bg-card p-4 text-center text-sm text-muted-foreground">No active schedules for the next 2 weeks</div>
                ) : (
                  [...new Set(activeSchedules.map((s: any) => s.worker_id))].map(workerId => {
                    const workerSchedules = activeSchedules.filter((s: any) => s.worker_id === workerId);
                    const workerName = workerSchedules[0]?.workers?.name || "Unknown";
                    return (
                      <React.Fragment key={workerId}>
                        <div className="bg-card p-2 text-xs font-medium truncate border-t">{workerName}</div>
                        {timelineDays.map(day => {
                          const schedule = workerSchedules.find((s: any) => s.start_date <= day && s.end_date >= day);
                          return (
                            <div key={day} className={`p-1 border-t ${schedule ? shiftColor(schedule.shift) : "bg-card"}`}>
                              {schedule && <div className="text-[9px] text-center capitalize">{schedule.shift}</div>}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table View */}
      <div className="flex gap-3 items-center">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead className="hidden sm:table-cell">Project</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="hidden sm:table-cell">Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : schedules.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No schedules found</TableCell></TableRow>
                ) : schedules.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.workers?.name}</div>
                      <div className="text-xs text-muted-foreground">{s.workers?.trade || ""}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{s.projects?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={shiftColor(s.shift)}>
                        <Clock className="h-3 w-3 mr-1" />
                        <span className="capitalize">{s.shift.replace("_", " ")}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(s.start_date)}</div>
                      <div className="text-xs text-muted-foreground">to {formatDate(s.end_date)}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{s.notes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


