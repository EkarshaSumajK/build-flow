import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Building2, Phone, Mail } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useRole } from "@/hooks/useRole";
import { TablePagination } from "@/components/shared/TablePagination";

const CATEGORIES = ["General", "Material Supplier", "Subcontractor", "Equipment", "Transport", "Labour Contractor", "Consultant", "Other"];

const emptyForm = { name: "", contact_person: "", phone: "", email: "", address: "", gst_number: "", pan_number: "", category: "General", notes: "" };

export default function Vendors({ projectId }: { projectId?: string }) {
  const { data: orgId } = useOrganization();
  const { can } = useRole();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").eq("organization_id", orgId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, organization_id: orgId! };
      if (editing) {
        const { error } = await supabase.from("vendors").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast.success(editing ? "Vendor updated" : "Vendor added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendors"] });
      setDeleteTarget(null);
      toast.success("Vendor deleted");
    },
  });

  const openEdit = (v: any) => {
    setEditing(v);
    setForm({
      name: v.name, contact_person: v.contact_person || "", phone: v.phone || "",
      email: v.email || "", address: v.address || "", gst_number: v.gst_number || "",
      pan_number: v.pan_number || "", category: v.category, notes: v.notes || "",
    });
    setOpen(true);
  };

  const filtered = vendors
    .filter((v: any) => categoryFilter === "all" || v.category === categoryFilter)
    .filter((v: any) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.contact_person || "").toLowerCase().includes(search.toLowerCase()) ||
      (v.gst_number || "").toLowerCase().includes(search.toLowerCase())
    );

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedVendors = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };
  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1);
  };

  const activeCount = vendors.filter((v: any) => v.is_active).length;
  const categoryCount = new Set(vendors.map((v: any) => v.category)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendors & Subcontractors</h1>
          <p className="text-muted-foreground">Manage your vendor directory</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          {can("vendors:manage") && <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Vendor</Button></DialogTrigger>}
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label>GST Number</Label><Input value={form.gst_number} onChange={e => setForm(p => ({ ...p, gst_number: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>PAN Number</Label><Input value={form.pan_number} onChange={e => setForm(p => ({ ...p, pan_number: e.target.value }))} /></div>
                <div />
              </div>
              <div><Label>Address</Label><Textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} rows={2} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
              <Button className="w-full" disabled={!form.name || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "Saving..." : editing ? "Update Vendor" : "Add Vendor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Vendors</p><p className="text-2xl font-bold">{vendors.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold text-success">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Categories</p><p className="text-2xl font-bold">{categoryCount}</p></CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search vendors..." value={search} onChange={e => handleSearchChange(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">GST</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : paginatedVendors.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No vendors found</TableCell></TableRow>
                ) : paginatedVendors.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <span className="font-medium">{v.name}</span>
                          {v.contact_person && <div className="text-xs text-muted-foreground">{v.contact_person}</div>}
                          <div className="text-xs text-muted-foreground sm:hidden">{v.category}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline">{v.category}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-0.5">
                        {v.phone && <div className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{v.phone}</div>}
                        {v.email && <div className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{v.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{v.gst_number || "—"}</TableCell>
                    <TableCell>
                      <Badge className={v.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"} variant="secondary">
                        {v.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {can("vendors:manage") && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Vendor"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
