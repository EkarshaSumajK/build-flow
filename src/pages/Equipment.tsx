import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Plus, Wrench, Pencil, Trash2, Clock } from "lucide-react";
import { formatDate, formatCurrency, statusColor } from "@/lib/formatters";
import { TablePagination } from "@/components/shared/TablePagination";

const DEFAULT_PAGE_SIZE = 10;

export default function Equipment({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const emptyForm = { name: "", equipment_type: "general", model: "", serial_number: "", daily_rate: "", current_project_id: "", next_maintenance: "", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const [logForm, setLogForm] = useState({ log_type: "usage", description: "", hours_used: "", log_date: new Date().toISOString().split("T")[0], project_id: "" });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["equipment", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*, projects(name)").eq("organization_id", orgId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["equipment-logs", selectedEquipment?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_logs").select("*, projects(name)").eq("equipment_id", selectedEquipment!.id).order("log_date", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEquipment,
  });

  const saveEquipment = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name,
        equipment_type: form.equipment_type,
        model: form.model || null,
        serial_number: form.serial_number || null,
        daily_rate: form.daily_rate ? parseFloat(form.daily_rate) : 0,
        current_project_id: form.current_project_id || null,
        next_maintenance: form.next_maintenance || null,
        notes: form.notes || null,
      };
      if (editingEquipment) {
        const { error } = await supabase.from("equipment").update(payload).eq("id", editingEquipment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("equipment").insert({ ...payload, organization_id: orgId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setDialogOpen(false);
      setEditingEquipment(null);
      setForm(emptyForm);
      toast.success(editingEquipment ? "Equipment updated!" : "Equipment added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteEquipment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      setDeleteTarget(null);
      toast.success("Equipment deleted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const addLog = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("equipment_logs").insert({
        equipment_id: selectedEquipment!.id,
        organization_id: orgId!,
        project_id: logForm.project_id || null,
        log_type: logForm.log_type,
        description: logForm.description || null,
        hours_used: logForm.hours_used ? parseFloat(logForm.hours_used) : null,
        log_date: logForm.log_date,
        logged_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-logs"] });
      setLogDialogOpen(false);
      setLogForm({ log_type: "usage", description: "", hours_used: "", log_date: new Date().toISOString().split("T")[0], project_id: "" });
      toast.success("Log added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (eq: any) => {
    setEditingEquipment(eq);
    setForm({ name: eq.name, equipment_type: eq.equipment_type, model: eq.model || "", serial_number: eq.serial_number || "", daily_rate: eq.daily_rate?.toString() || "", current_project_id: eq.current_project_id || "", next_maintenance: eq.next_maintenance || "", notes: eq.notes || "" });
    setDialogOpen(true);
  };

  const equipmentStatus = (s: string) => {
    const map: Record<string, string> = { available: "bg-success/10 text-success", in_use: "bg-primary/10 text-primary", maintenance: "bg-warning/10 text-warning", retired: "bg-muted text-muted-foreground" };
    return map[s] ?? "bg-muted text-muted-foreground";
  };

  // Pagination
  const totalItems = equipment.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedData = equipment.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment</h1>
          <p className="text-muted-foreground">Track machinery and equipment across sites</p>
        </div>
        <Button onClick={() => { setEditingEquipment(null); setForm(emptyForm); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Equipment</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingEquipment(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingEquipment ? "Edit Equipment" : "Add Equipment"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveEquipment.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.equipment_type} onValueChange={(v) => setForm({ ...form, equipment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem><SelectItem value="excavator">Excavator</SelectItem>
                    <SelectItem value="crane">Crane</SelectItem><SelectItem value="mixer">Mixer</SelectItem>
                    <SelectItem value="loader">Loader</SelectItem><SelectItem value="compactor">Compactor</SelectItem>
                    <SelectItem value="pump">Pump</SelectItem><SelectItem value="scaffolding">Scaffolding</SelectItem>
                    <SelectItem value="vehicle">Vehicle</SelectItem><SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Daily Rate (₹)</Label><Input type="number" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
              <div className="space-y-2"><Label>Serial Number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned Project</Label>
                <Select value={form.current_project_id || "none"} onValueChange={(v) => setForm({ ...form, current_project_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Next Maintenance</Label><Input type="date" value={form.next_maintenance} onChange={(e) => setForm({ ...form, next_maintenance: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={saveEquipment.isPending}>{saveEquipment.isPending ? "Saving..." : editingEquipment ? "Update" : "Add Equipment"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} title="Delete Equipment" description={`Delete "${deleteTarget?.name}"?`} onConfirm={() => deleteEquipment.mutate(deleteTarget.id)} loading={deleteEquipment.isPending} />

      {/* Equipment detail with logs */}
      <Dialog open={!!selectedEquipment} onOpenChange={(v) => !v && setSelectedEquipment(null)}>
        <DialogContent className="max-w-lg">
          {selectedEquipment && (
            <div className="space-y-4">
              <DialogHeader><DialogTitle>{selectedEquipment.name}</DialogTitle></DialogHeader>
              <div className="flex gap-2 flex-wrap text-sm">
                <Badge className={equipmentStatus(selectedEquipment.status)} variant="secondary">{selectedEquipment.status}</Badge>
                <Badge variant="outline">{selectedEquipment.equipment_type}</Badge>
                {selectedEquipment.daily_rate > 0 && <Badge variant="outline">{formatCurrency(selectedEquipment.daily_rate)}/day</Badge>}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Usage Logs</p>
                <Button size="sm" variant="outline" onClick={() => setLogDialogOpen(true)}><Plus className="mr-1 h-3 w-3" />Add Log</Button>
              </div>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No logs yet</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {logs.map((log: any) => (
                    <div key={log.id} className="flex justify-between items-start border rounded-md p-2 text-sm">
                      <div>
                        <p className="font-medium">{log.log_type}{log.hours_used ? ` — ${log.hours_used}h` : ""}</p>
                        {log.description && <p className="text-xs text-muted-foreground">{log.description}</p>}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(log.log_date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Log Entry</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addLog.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={logForm.log_type} onValueChange={(v) => setLogForm({ ...logForm, log_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usage">Usage</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem><SelectItem value="idle">Idle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Hours Used</Label><Input type="number" value={logForm.hours_used} onChange={(e) => setLogForm({ ...logForm, hours_used: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={logForm.log_date} onChange={(e) => setLogForm({ ...logForm, log_date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={logForm.description} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={addLog.isPending}>{addLog.isPending ? "Saving..." : "Add Log"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : equipment.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">No equipment added yet.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Project</TableHead><TableHead className="hidden sm:table-cell">Rate/Day</TableHead>
                <TableHead className="hidden md:table-cell">Next Maint.</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((eq: any) => (
                <TableRow key={eq.id} className="cursor-pointer" onClick={() => setSelectedEquipment(eq)}>
                  <TableCell className="font-medium">{eq.name}</TableCell>
                  <TableCell className="capitalize">{eq.equipment_type}</TableCell>
                  <TableCell><Badge className={equipmentStatus(eq.status)} variant="secondary">{eq.status}</Badge></TableCell>
                  <TableCell className="hidden sm:table-cell">{(eq as any).projects?.name || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{formatCurrency(eq.daily_rate)}</TableCell>
                  <TableCell className="hidden md:table-cell">{formatDate(eq.next_maintenance)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(eq)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(eq)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalItems > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            />
          )}
        </Card>
      )}
    </div>
  );
}
