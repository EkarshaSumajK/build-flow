import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Plus, Search, Calendar, Pencil, Trash2, AlertCircle, UserPlus, UserMinus } from "lucide-react";
import { formatCurrency, formatDate, statusColor } from "@/lib/formatters";
import { AttendanceCalendar } from "@/components/labour/AttendanceCalendar";
import { WorkerTaskAssignment } from "@/components/labour/WorkerTaskAssignment";
import { PayrollCalculator } from "@/components/labour/PayrollCalculator";
import { BulkWorkerUpload } from "@/components/labour/BulkWorkerUpload";
import { TablePagination } from "@/components/shared/TablePagination";

export default function Labour({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { can } = useRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [workerDialogOpen, setWorkerDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedProject, setSelectedProject] = useState<string>(projectId || "");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePageSize, setAttendancePageSize] = useState(10);
  const [mutatingWorkerId, setMutatingWorkerId] = useState<string | null>(null);

  const emptyWorkerForm = { name: "", trade: "", daily_rate: "", contractor: "", phone: "" };
  const [workerForm, setWorkerForm] = useState(emptyWorkerForm);

  const { data: workers = [] } = useQuery({
    queryKey: ["workers", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workers").select("*").eq("organization_id", orgId!).order("name");
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-active", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!).eq("status", "active");
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", orgId, attendanceDate, selectedProject],
    queryFn: async () => {
      let query = supabase.from("attendance").select("*, workers(name, trade, daily_rate)").eq("organization_id", orgId!).eq("date", attendanceDate);
      if (selectedProject) query = query.eq("project_id", selectedProject);
      const { data, error } = await query;
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  // Fetch workers assigned to the selected project
  const { data: projectWorkerIds = [] } = useQuery({
    queryKey: ["project_workers", selectedProject || projectId],
    queryFn: async () => {
      const pid = selectedProject || projectId;
      const { data, error } = await supabase.from("project_workers").select("worker_id").eq("project_id", pid!);
      if (error) throw error;
      return data.map((pw: any) => pw.worker_id as string);
    },
    enabled: !!(selectedProject || projectId),
  });

  const assignWorker = useMutation({
    mutationFn: async (workerId: string) => {
      setMutatingWorkerId(workerId);
      const pid = selectedProject || projectId;
      if (!pid) throw new Error("No project selected");
      const { error } = await supabase.from("project_workers").insert({ project_id: pid, worker_id: workerId, organization_id: orgId! });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_workers"] });
      toast.success("Worker assigned to project!");
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setMutatingWorkerId(null),
  });

  const unassignWorker = useMutation({
    mutationFn: async (workerId: string) => {
      setMutatingWorkerId(workerId);
      const pid = selectedProject || projectId;
      if (!pid) throw new Error("No project selected");
      const { error } = await supabase.from("project_workers").delete().eq("project_id", pid).eq("worker_id", workerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_workers"] });
      toast.success("Worker removed from project!");
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setMutatingWorkerId(null),
  });

  const saveWorker = useMutation({
    mutationFn: async () => {
      const payload = {
        name: workerForm.name,
        trade: workerForm.trade || null,
        daily_rate: workerForm.daily_rate ? parseFloat(workerForm.daily_rate) : 0,
        contractor: workerForm.contractor || null,
        phone: workerForm.phone || null,
      };
      if (editingWorker) {
        const { error } = await supabase.from("workers").update(payload).eq("id", editingWorker.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workers").insert({ ...payload, organization_id: orgId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      setWorkerDialogOpen(false); setEditingWorker(null); setWorkerForm(emptyWorkerForm);
      toast.success(editingWorker ? "Worker updated!" : "Worker added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteWorker = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workers").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      setDeleteTarget(null); toast.success("Worker deactivated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const markAttendance = useMutation({
    mutationFn: async ({ workerId, status, overtimeHours, deduction }: { workerId: string; status: string; overtimeHours?: number; deduction?: number }) => {
      if (!selectedProject) throw new Error("Please select a project first");
      const { error } = await supabase.from("attendance").upsert({
        organization_id: orgId!, project_id: selectedProject, worker_id: workerId,
        date: attendanceDate, status: status as any, overtime_hours: overtimeHours || 0,
        deduction: deduction || 0, recorded_by: user!.id,
      }, { onConflict: "worker_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance marked!");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (worker: any) => {
    setEditingWorker(worker);
    setWorkerForm({ name: worker.name, trade: worker.trade || "", daily_rate: worker.daily_rate?.toString() || "", contractor: worker.contractor || "", phone: worker.phone || "" });
    setWorkerDialogOpen(true);
  };

  const attendanceMap = new Map(attendance.map((a: any) => [a.worker_id, a]));
  const totalPresent = attendance.filter((a: any) => a.status === "present" || a.status === "overtime").length;
  const totalAbsent = attendance.filter((a: any) => a.status === "absent").length;
  const totalPayroll = attendance.reduce((sum: number, a: any) => {
    const rate = a.workers?.daily_rate || 0;
    const ded = Number(a.deduction) || 0;
    if (a.status === "present") return sum + rate - ded;
    if (a.status === "half_day") return sum + rate / 2 - ded;
    if (a.status === "overtime") return sum + rate + (a.overtime_hours * rate / 8) - ded;
    return sum;
  }, 0);

  const filteredWorkers = workers.filter((w: any) =>
    w.name.toLowerCase().includes(search.toLowerCase()) || (w.trade ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Pagination for workers tab
  const totalPages = Math.ceil(filteredWorkers.length / pageSize);
  const paginatedWorkers = filteredWorkers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Pagination for attendance tab — show only project-assigned active workers
  const activeWorkers = workers.filter((w: any) => w.is_active && (!(selectedProject || projectId) || projectWorkerIds.includes(w.id)));
  const attendanceTotalPages = Math.ceil(activeWorkers.length / attendancePageSize);
  const paginatedAttendanceWorkers = activeWorkers.slice((attendancePage - 1) * attendancePageSize, attendancePage * attendancePageSize);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Labour & Attendance</h1><p className="text-muted-foreground">Track workforce and attendance</p></div>
        {can("workers:manage") && (
          <div className="flex items-center gap-2">
            <BulkWorkerUpload />
            <Button onClick={() => { setEditingWorker(null); setWorkerForm(emptyWorkerForm); setWorkerDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Worker</Button>
          </div>
        )}
      </div>

      <Dialog open={workerDialogOpen} onOpenChange={(v) => { setWorkerDialogOpen(v); if (!v) setEditingWorker(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingWorker ? "Edit Worker" : "Add Worker"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveWorker.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={workerForm.name} onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Trade/Skill</Label><Input value={workerForm.trade} onChange={(e) => setWorkerForm({ ...workerForm, trade: e.target.value })} placeholder="e.g. Mason" /></div>
              <div className="space-y-2"><Label>Daily Rate (₹)</Label><Input type="number" value={workerForm.daily_rate} onChange={(e) => setWorkerForm({ ...workerForm, daily_rate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Contractor</Label><Input value={workerForm.contractor} onChange={(e) => setWorkerForm({ ...workerForm, contractor: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={workerForm.phone} onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={saveWorker.isPending}>{saveWorker.isPending ? "Saving..." : editingWorker ? "Update Worker" : "Add Worker"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} title="Deactivate Worker" description={`Deactivate "${deleteTarget?.name}"? They won't appear in attendance lists.`} onConfirm={() => deleteWorker.mutate(deleteTarget.id)} loading={deleteWorker.isPending} />

      <Tabs defaultValue="attendance">
        <TabsList className="flex-wrap">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="workers">Workers ({workers.length})</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} className="w-[180px]" />
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>{projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Present</p><p className="text-2xl font-bold text-success">{totalPresent}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Absent</p><p className="text-2xl font-bold text-destructive">{totalAbsent}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Day's Payroll</p><p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p></CardContent></Card>
          </div>

          {!selectedProject ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Select a project to mark attendance</CardContent></Card>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <Card className="min-w-[600px] sm:min-w-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Worker</TableHead><TableHead className="hidden sm:table-cell">Trade</TableHead><TableHead className="hidden sm:table-cell">Daily Rate</TableHead><TableHead>Status</TableHead><TableHead>Deduction (₹)</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAttendanceWorkers.map((worker: any) => {
                      const record = attendanceMap.get(worker.id) as any;
                      return (
                        <TableRow key={worker.id}>
                          <TableCell>
                            <div className="font-medium">{worker.name}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{worker.trade || ""} • {formatCurrency(worker.daily_rate)}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{worker.trade || "—"}</TableCell>
                          <TableCell className="hidden sm:table-cell">{formatCurrency(worker.daily_rate)}</TableCell>
                          <TableCell>
                            <Select value={record?.status || ""} onValueChange={(v) => markAttendance.mutate({ workerId: worker.id, status: v, deduction: record?.deduction })}>
                              <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder="Mark" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Present</SelectItem><SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="half_day">Half Day</SelectItem><SelectItem value="overtime">Overtime</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8 w-[100px]"
                              placeholder="0"
                              defaultValue={record?.deduction || ""}
                              onBlur={(e) => {
                                if (record?.status) {
                                  markAttendance.mutate({ workerId: worker.id, status: record.status, deduction: parseFloat(e.target.value) || 0 });
                                }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {activeWorkers.length > 0 && (
                  <TablePagination
                    currentPage={attendancePage}
                    totalPages={attendanceTotalPages}
                    totalItems={activeWorkers.length}
                    pageSize={attendancePageSize}
                    onPageChange={setAttendancePage}
                    onPageSizeChange={(size) => { setAttendancePageSize(size); setAttendancePage(1); }}
                  />
                )}
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <AttendanceCalendar />
        </TabsContent>

        <TabsContent value="workers" className="mt-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search workers..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10" />
            </div>
            
          </div>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <Card className="min-w-[600px] sm:min-w-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Name</TableHead><TableHead>Trade</TableHead><TableHead>Daily Rate</TableHead><TableHead className="hidden sm:table-cell">Contractor</TableHead><TableHead className="hidden sm:table-cell">Phone</TableHead><TableHead>Status</TableHead>{(selectedProject || projectId) && <TableHead>Project</TableHead>}<TableHead>Actions</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedWorkers.length === 0 ? (
                     <TableRow><TableCell colSpan={(selectedProject || projectId) ? 8 : 7} className="text-center text-muted-foreground py-8">No workers found</TableCell></TableRow>
                   ) : paginatedWorkers.map((w: any) => {
                     const isAssigned = projectWorkerIds.includes(w.id);
                     return (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.name}</TableCell>
                      <TableCell>{w.trade || "—"}</TableCell>
                      <TableCell>{formatCurrency(w.daily_rate)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{w.contractor || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell">{w.phone || "—"}</TableCell>
                       <TableCell><Badge className={w.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"} variant="secondary">{w.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                       {(selectedProject || projectId) && (
                         <TableCell>
                           {can("workers:manage") && w.is_active ? (
                             isAssigned ? (
                               <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => unassignWorker.mutate(w.id)} disabled={mutatingWorkerId === w.id}>
                                 <UserMinus className="mr-1 h-3 w-3" />{mutatingWorkerId === w.id ? "..." : "Unassign"}
                               </Button>
                             ) : (
                               <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => assignWorker.mutate(w.id)} disabled={mutatingWorkerId === w.id}>
                                 <UserPlus className="mr-1 h-3 w-3" />{mutatingWorkerId === w.id ? "..." : "Assign"}
                               </Button>
                             )
                           ) : <span className="text-xs text-muted-foreground">{isAssigned ? "Assigned" : "—"}</span>}
                         </TableCell>
                       )}
                       <TableCell>
                       {can("workers:manage") ? (
                         <div className="flex gap-1">
                           <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                           {w.is_active && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(w)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                         </div>
                       ) : <span className="text-xs text-muted-foreground">—</span>}
                       </TableCell>
                     </TableRow>
                   );
                   })}
                </TableBody>
              </Table>
              {filteredWorkers.length > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredWorkers.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                />
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <WorkerTaskAssignment />
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <PayrollCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
