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
import { toast } from "sonner";
import { Plus, ArrowRight } from "lucide-react";
import { formatDate, statusColor } from "@/lib/formatters";
import { TablePagination } from "@/components/shared/TablePagination";

export default function InventoryTransfers({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const emptyForm = { from_project_id: "", to_project_id: "", material_id: "", quantity: "", notes: "" };
  const [form, setForm] = useState(emptyForm);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("id, name, unit").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["inventory-transfers", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_transfers")
        .select("*, materials(name, unit), from_project:projects!inventory_transfers_from_project_id_fkey(name), to_project:projects!inventory_transfers_to_project_id_fkey(name)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Pagination
  const totalPages = Math.ceil(transfers.length / pageSize);
  const paginatedTransfers = transfers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const createTransfer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inventory_transfers").insert({
        organization_id: orgId!,
        from_project_id: form.from_project_id,
        to_project_id: form.to_project_id,
        material_id: form.material_id,
        quantity: parseFloat(form.quantity),
        notes: form.notes || null,
        transferred_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Transfer created!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // Get the transfer details for stock updates
      const { data: transfer, error: fetchError } = await supabase
        .from("inventory_transfers")
        .select("from_project_id, to_project_id, material_id, quantity")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const update: any = { status };
      if (status === "approved") {
        update.approved_by = user!.id;

        // Create stock-out entry for source project
        const { error: outError } = await supabase.from("stock_entries").insert({
          organization_id: orgId!,
          project_id: transfer.from_project_id,
          material_id: transfer.material_id,
          quantity: transfer.quantity,
          entry_type: "out",
          notes: `Transfer to project (approved)`,
          recorded_by: user!.id,
        });
        if (outError) throw outError;

        // Create stock-in entry for destination project
        const { error: inError } = await supabase.from("stock_entries").insert({
          organization_id: orgId!,
          project_id: transfer.to_project_id,
          material_id: transfer.material_id,
          quantity: transfer.quantity,
          entry_type: "in",
          notes: `Transfer from project (approved)`,
          recorded_by: user!.id,
        });
        if (inError) throw inError;
      }

      const { error } = await supabase.from("inventory_transfers").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
      toast.success("Status updated & stock adjusted!");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Transfers</h1>
          <p className="text-muted-foreground">Transfer materials between project sites</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />New Transfer</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Transfer</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createTransfer.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Project *</Label>
                <Select value={form.from_project_id} onValueChange={(v) => setForm({ ...form, from_project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>To Project *</Label>
                <Select value={form.to_project_id} onValueChange={(v) => setForm({ ...form, to_project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>{projects.filter((p: any) => p.id !== form.from_project_id).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Material *</Label>
                <Select value={form.material_id} onValueChange={(v) => setForm({ ...form, material_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{materials.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={createTransfer.isPending}>
              {createTransfer.isPending ? "Creating..." : "Create Transfer"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : paginatedTransfers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transfers yet</TableCell></TableRow>
            ) : paginatedTransfers.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.materials?.name}</TableCell>
                <TableCell>
                  <span className="text-xs">{t.from_project?.name}</span>
                  <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                  <span className="text-xs">{t.to_project?.name}</span>
                </TableCell>
                <TableCell>{t.quantity} {t.materials?.unit}</TableCell>
                <TableCell><Badge className={statusColor(t.status)} variant="secondary">{t.status}</Badge></TableCell>
                <TableCell className="text-sm">{formatDate(t.created_at)}</TableCell>
                <TableCell>
                  {t.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: t.id, status: "approved" })}>Approve</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => updateStatus.mutate({ id: t.id, status: "rejected" })}>Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {transfers.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={Math.ceil(transfers.length / pageSize)}
            totalItems={transfers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </Card>
    </div>
  );
}
