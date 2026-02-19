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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, AlertCircle, Package } from "lucide-react";
import { formatCurrency, formatDate, statusColor, priorityColor } from "@/lib/formatters";
import { PurchaseOrders } from "@/components/materials/PurchaseOrders";
import { GoodsReceipts } from "@/components/materials/GoodsReceipts";
import { createPOFromRequest, fetchVendors } from "@/services/materials";
import { FileOutput } from "lucide-react";

export default function Materials({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { can } = useRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [poFromRequest, setPOFromRequest] = useState<any>(null);
  const [poVendorId, setPOVendorId] = useState<string>("");

  const emptyMaterialForm = { name: "", category: "", unit: "nos", standard_rate: "", description: "" };
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm);
  const [requestForm, setRequestForm] = useState({ project_id: projectId || "", material_id: "", quantity: "", unit_price: "", priority: "medium", required_date: "", notes: "" });
  const [stockForm, setStockForm] = useState({ project_id: projectId || "", material_id: "", quantity: "", entry_type: "in", notes: "" });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("materials").select("*").eq("organization_id", orgId!).order("name");
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["material-requests", orgId, projectId],
    queryFn: async () => {
      let q = supabase.from("material_requests").select("*, materials(name, unit), projects(name)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const { data: stockEntries = [] } = useQuery({
    queryKey: ["stock-entries", orgId, projectId],
    queryFn: async () => {
      let q = supabase.from("stock_entries").select("*, materials(name, unit), projects(name)").eq("organization_id", orgId!).order("recorded_at", { ascending: false }).limit(100);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  // Compute stock levels
  const stockLevels = materials.map((m: any) => {
    const entries = stockEntries.filter((s: any) => s.material_id === m.id);
    const totalIn = entries.filter((s: any) => s.entry_type === "in").reduce((sum: number, s: any) => sum + Number(s.quantity), 0);
    const totalOut = entries.filter((s: any) => s.entry_type === "out").reduce((sum: number, s: any) => sum + Number(s.quantity), 0);
    return { ...m, stock: totalIn - totalOut, totalIn, totalOut };
  });

  const lowStockItems = stockLevels.filter(m => m.stock <= 0 && m.totalIn > 0);

  const saveMaterial = useMutation({
    mutationFn: async () => {
      const payload = { name: materialForm.name, category: materialForm.category || null, unit: materialForm.unit, standard_rate: materialForm.standard_rate ? parseFloat(materialForm.standard_rate) : 0, description: materialForm.description || null };
      if (editingMaterial) {
        const { error } = await supabase.from("materials").update(payload).eq("id", editingMaterial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("materials").insert({ ...payload, organization_id: orgId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setMaterialDialogOpen(false); setEditingMaterial(null); setMaterialForm(emptyMaterialForm);
      toast.success(editingMaterial ? "Material updated!" : "Material added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setDeleteTarget(null); toast.success("Material deleted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("material_requests").insert({
        organization_id: orgId!, project_id: requestForm.project_id, material_id: requestForm.material_id,
        quantity: parseFloat(requestForm.quantity), unit_price: requestForm.unit_price ? parseFloat(requestForm.unit_price) : null,
        priority: requestForm.priority as any, required_date: requestForm.required_date || null,
        notes: requestForm.notes || null, requested_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      setRequestDialogOpen(false);
      setRequestForm({ project_id: "", material_id: "", quantity: "", unit_price: "", priority: "medium", required_date: "", notes: "" });
      toast.success("Request created!");
    },
    onError: (e) => toast.error(e.message),
  });

  const addStockEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_entries").insert({
        organization_id: orgId!, project_id: stockForm.project_id, material_id: stockForm.material_id,
        quantity: parseFloat(stockForm.quantity), entry_type: stockForm.entry_type,
        notes: stockForm.notes || null, recorded_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
      setStockDialogOpen(false);
      setStockForm({ project_id: "", material_id: "", quantity: "", entry_type: "in", notes: "" });
      toast.success("Stock entry recorded!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "approved") { update.approved_by = user!.id; update.approved_at = new Date().toISOString(); }
      const { error } = await supabase.from("material_requests").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["material-requests"] }); toast.success("Status updated!"); },
    onError: (e) => toast.error(e.message),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("id, name").eq("organization_id", orgId!);
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const convertToPO = useMutation({
    mutationFn: async () => {
      if (!poFromRequest || !poVendorId) return;
      const vendor = vendors.find((v: any) => v.id === poVendorId);
      await createPOFromRequest(orgId!, user!.id, poFromRequest, poVendorId, vendor?.name || "Unknown");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setPOFromRequest(null);
      setPOVendorId("");
      toast.success("PO created from request!");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (material: any) => {
    setEditingMaterial(material);
    setMaterialForm({ name: material.name, category: material.category || "", unit: material.unit, standard_rate: material.standard_rate?.toString() || "", description: material.description || "" });
    setMaterialDialogOpen(true);
  };

  const filteredMaterials = stockLevels.filter((m: any) =>
    m.name.toLowerCase().includes(search.toLowerCase()) || (m.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Materials</h1><p className="text-muted-foreground">Manage inventory, requests, and stock</p></div>
        <div className="flex gap-2 flex-wrap">
          {can("materials:manage") && <Button variant="outline" onClick={() => { setEditingMaterial(null); setMaterialForm(emptyMaterialForm); setMaterialDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Material</Button>}
          {can("materials:manage") && <Button variant="outline" onClick={() => setStockDialogOpen(true)}><Package className="mr-2 h-4 w-4" />Stock Entry</Button>}
          {can("materials:request") && <Button onClick={() => setRequestDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />New Request</Button>}
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="font-medium text-sm">Low Stock Alert</p>
              <p className="text-sm text-muted-foreground">{lowStockItems.map(m => m.name).join(", ")} — stock depleted or below zero</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material dialog */}
      <Dialog open={materialDialogOpen} onOpenChange={(v) => { setMaterialDialogOpen(v); if (!v) setEditingMaterial(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingMaterial ? "Edit Material" : "Add Material"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMaterial.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><Input value={materialForm.category} onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })} placeholder="e.g. Cement" /></div>
              <div className="space-y-2"><Label>Unit</Label><Input value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Standard Rate (₹)</Label><Input type="number" value={materialForm.standard_rate} onChange={(e) => setMaterialForm({ ...materialForm, standard_rate: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={saveMaterial.isPending}>{saveMaterial.isPending ? "Saving..." : editingMaterial ? "Update Material" : "Add Material"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock entry dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Stock Entry</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addStockEntry.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={stockForm.project_id} onValueChange={(v) => setStockForm({ ...stockForm, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Material *</Label>
                <Select value={stockForm.material_id} onValueChange={(v) => setStockForm({ ...stockForm, material_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{materials.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} required /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={stockForm.entry_type} onValueChange={(v) => setStockForm({ ...stockForm, entry_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="in">Stock In</SelectItem><SelectItem value="out">Stock Out (Consumption)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={stockForm.notes} onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })} placeholder="e.g. Delivered by truck" /></div>
            <Button type="submit" className="w-full" disabled={addStockEntry.isPending}>{addStockEntry.isPending ? "Recording..." : "Record Entry"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Material Request</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createRequest.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={requestForm.project_id} onValueChange={(v) => setRequestForm({ ...requestForm, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material *</Label>
              <Select value={requestForm.material_id} onValueChange={(v) => setRequestForm({ ...requestForm, material_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{materials.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={requestForm.quantity} onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Unit Price (₹)</Label><Input type="number" value={requestForm.unit_price} onChange={(e) => setRequestForm({ ...requestForm, unit_price: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={requestForm.priority} onValueChange={(v) => setRequestForm({ ...requestForm, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Required Date</Label><Input type="date" value={requestForm.required_date} onChange={(e) => setRequestForm({ ...requestForm, required_date: e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full" disabled={createRequest.isPending}>{createRequest.isPending ? "Creating..." : "Create Request"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} title="Delete Material" description={`Delete "${deleteTarget?.name}"?`} onConfirm={() => deleteMaterial.mutate(deleteTarget.id)} loading={deleteMaterial.isPending} />

      {/* Convert Request to PO Dialog */}
      <Dialog open={!!poFromRequest} onOpenChange={(v) => { if (!v) { setPOFromRequest(null); setPOVendorId(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create PO from Request</DialogTitle></DialogHeader>
          {poFromRequest && (
            <div className="space-y-4">
              <div className="text-sm space-y-1 bg-muted/50 p-3 rounded-lg">
                <p><strong>Material:</strong> {poFromRequest.materials?.name}</p>
                <p><strong>Quantity:</strong> {poFromRequest.quantity} {poFromRequest.materials?.unit}</p>
                <p><strong>Project:</strong> {poFromRequest.projects?.name}</p>
                {poFromRequest.unit_price && <p><strong>Unit Price:</strong> {formatCurrency(poFromRequest.unit_price)}</p>}
              </div>
              <div className="space-y-2">
                <Label>Select Vendor *</Label>
                <Select value={poVendorId} onValueChange={setPOVendorId}>
                  <SelectTrigger><SelectValue placeholder="Choose vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={!poVendorId || convertToPO.isPending} onClick={() => convertToPO.mutate()}>
                {convertToPO.isPending ? "Creating PO..." : "Create Purchase Order"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="master">
        <TabsList className="flex-wrap">
          <TabsTrigger value="master">Material Master</TabsTrigger>
          <TabsTrigger value="stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="po">Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn">Goods Receipts</TabsTrigger>
          <TabsTrigger value="log">Consumption Log</TabsTrigger>
        </TabsList>

        <TabsContent value="master" className="mt-4">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Unit</TableHead><TableHead>Standard Rate</TableHead><TableHead>Stock</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredMaterials.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No materials found</TableCell></TableRow>
                ) : filteredMaterials.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.category || "—"}</TableCell>
                    <TableCell>{m.unit}</TableCell>
                    <TableCell>{formatCurrency(m.standard_rate)}</TableCell>
                    <TableCell><Badge variant="secondary" className={m.stock <= 0 ? "bg-destructive/10 text-destructive" : ""}>{m.stock} {m.unit}</Badge></TableCell>
                    <TableCell>
                      {can("materials:manage") ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stockLevels.map((m: any) => (
              <Card key={m.id}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{m.name}</CardTitle></CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${m.stock <= 0 ? "text-destructive" : ""}`}>{m.stock} <span className="text-sm font-normal text-muted-foreground">{m.unit}</span></p>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>In: {m.totalIn}</span><span>Out: {m.totalOut}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Project</TableHead><TableHead>Qty</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Required</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No requests yet</TableCell></TableRow>
                ) : requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.materials?.name}</TableCell>
                    <TableCell>{r.projects?.name}</TableCell>
                    <TableCell>{r.quantity} {r.materials?.unit}</TableCell>
                    <TableCell><Badge className={priorityColor(r.priority)} variant="secondary">{r.priority}</Badge></TableCell>
                    <TableCell><Badge className={statusColor(r.status)} variant="secondary">{r.status}</Badge></TableCell>
                    <TableCell>{formatDate(r.required_date)}</TableCell>
                    <TableCell>
                      {r.status === "pending" && can("materials:approve") && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateRequestStatus.mutate({ id: r.id, status: "approved" })}>Approve</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => updateRequestStatus.mutate({ id: r.id, status: "rejected" })}>Reject</Button>
                        </div>
                      )}
                      {r.status === "approved" && can("materials:manage") && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setPOFromRequest(r)}>
                          <FileOutput className="h-3 w-3" />Create PO
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Project</TableHead><TableHead>Type</TableHead><TableHead>Qty</TableHead><TableHead>Notes</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {stockEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No stock entries yet</TableCell></TableRow>
                ) : stockEntries.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.materials?.name}</TableCell>
                    <TableCell>{s.projects?.name}</TableCell>
                    <TableCell><Badge variant="secondary" className={s.entry_type === "in" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{s.entry_type === "in" ? "Stock In" : "Stock Out"}</Badge></TableCell>
                    <TableCell>{s.quantity} {s.materials?.unit}</TableCell>
                    <TableCell>{s.notes || "—"}</TableCell>
                    <TableCell>{formatDate(s.recorded_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="po" className="mt-4">
          <PurchaseOrders />
        </TabsContent>

        <TabsContent value="grn" className="mt-4">
          <GoodsReceipts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
