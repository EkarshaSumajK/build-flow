import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, FileText, Printer, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { exportPOPdf } from "@/lib/pdf-export";

const PO_STATUSES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  approved: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export function PurchaseOrders() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [form, setForm] = useState({ project_id: "", vendor_name: "", vendor_id: "", notes: "" });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("id, name, contact_person, phone").eq("organization_id", orgId!).order("name");
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });
  const [items, setItems] = useState<{ material_id: string; quantity: string; unit_price: string }[]>([]);

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
      const { data, error } = await supabase.from("materials").select("*").eq("organization_id", orgId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase-orders", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("*, projects(name)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: poItems = [] } = useQuery({
    queryKey: ["po-items", selectedPO?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("po_items").select("*, materials(name, unit)").eq("po_id", selectedPO!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPO,
  });

  const createPO = useMutation({
    mutationFn: async () => {
      const poNumber = `PO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const totalAmount = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);

      const { data: po, error } = await supabase.from("purchase_orders").insert({
        organization_id: orgId!,
        project_id: form.project_id,
        po_number: poNumber,
        vendor_name: form.vendor_name,
        total_amount: totalAmount,
        notes: form.notes || null,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;

      if (items.length > 0) {
        const poItemsData = items.filter(i => i.material_id && i.quantity).map(i => ({
          po_id: po.id,
          material_id: i.material_id,
          quantity: parseFloat(i.quantity),
          unit_price: parseFloat(i.unit_price) || 0,
        }));
        if (poItemsData.length > 0) {
          const { error: itemsError } = await supabase.from("po_items").insert(poItemsData);
          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setDialogOpen(false);
      setForm({ project_id: "", vendor_name: "", vendor_id: "", notes: "" });
      setItems([]);
      toast.success("Purchase Order created!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePOStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "approved") { update.approved_by = user!.id; update.approved_at = new Date().toISOString(); }
      const { error } = await supabase.from("purchase_orders").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("PO status updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const addItem = () => setItems([...items, { material_id: "", quantity: "", unit_price: "" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  const printPO = (po: any) => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const itemRows = poItems.map((i: any) =>
      `<tr><td>${i.materials?.name}</td><td>${i.quantity} ${i.materials?.unit}</td><td style="text-align:right">${formatCurrency(i.unit_price)}</td><td style="text-align:right">${formatCurrency(i.quantity * i.unit_price)}</td></tr>`
    ).join("");
    pw.document.write(`<html><head><title>${po.po_number}</title><style>body{font-family:system-ui;padding:24px;font-size:13px}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:12px}th{background:#f5f5f5}.total{font-weight:700;font-size:16px}@media print{body{padding:0}}</style></head><body><h1>Purchase Order: ${po.po_number}</h1><p>Vendor: ${po.vendor_name}</p><p>Project: ${(po as any).projects?.name}</p><p>Date: ${formatDate(po.created_at)}</p><table><thead><tr><th>Material</th><th>Quantity</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemRows}</tbody></table><p class="total">Total: ${formatCurrency(po.total_amount)}</p>${po.notes ? `<p>Notes: ${po.notes}</p>` : ""}</body></html>`);
    pw.document.close();
    pw.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ project_id: "", vendor_name: "", vendor_id: "", notes: "" }); setItems([{ material_id: "", quantity: "", unit_price: "" }]); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Create PO
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createPO.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select value={form.vendor_id || "__manual"} onValueChange={(v) => {
                  if (v === "__manual") { setForm({ ...form, vendor_id: "", vendor_name: "" }); return; }
                  const vendor = vendors.find((ven: any) => ven.id === v);
                  setForm({ ...form, vendor_id: v, vendor_name: vendor?.name || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual">Type manually</SelectItem>
                    {vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(!form.vendor_id || form.vendor_id === "") && (
                  <Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} placeholder="Vendor name" required />
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Line Items</Label><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" />Add Item</Button></div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_80px_32px] gap-2 mb-2 items-end">
                  <Select value={item.material_id} onValueChange={(v) => updateItem(i, "material_id", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Material" /></SelectTrigger>
                    <SelectContent>{materials.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <Input className="h-9" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} />
                  <Input className="h-9" type="number" placeholder="₹ Price" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(i)}>×</Button>
                </div>
              ))}
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={createPO.isPending}>{createPO.isPending ? "Creating..." : "Create PO"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPO} onOpenChange={(v) => { if (!v) setSelectedPO(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedPO?.po_number}</DialogTitle></DialogHeader>
          {selectedPO && (
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p><strong>Vendor:</strong> {selectedPO.vendor_name}</p>
                <p><strong>Project:</strong> {(selectedPO as any).projects?.name}</p>
                <p><strong>Date:</strong> {formatDate(selectedPO.created_at)}</p>
                <p><strong>Total:</strong> {formatCurrency(selectedPO.total_amount)}</p>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Qty</TableHead><TableHead>Price</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {poItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.materials?.name}</TableCell>
                      <TableCell>{item.quantity} {item.materials?.unit}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(item.quantity * item.unit_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => printPO(selectedPO)}><Printer className="mr-2 h-4 w-4" />Print</Button>
                <Button variant="outline" className="flex-1" onClick={() => exportPOPdf(selectedPO, poItems)}><Download className="mr-2 h-4 w-4" />PDF</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <Table>
          <TableHeader>
            <TableRow><TableHead>PO #</TableHead><TableHead>Vendor</TableHead><TableHead>Project</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No purchase orders yet</TableCell></TableRow>
            ) : purchaseOrders.map((po: any) => (
              <TableRow key={po.id} className="cursor-pointer" onClick={() => setSelectedPO(po)}>
                <TableCell className="font-medium">{po.po_number}</TableCell>
                <TableCell>{po.vendor_name}</TableCell>
                <TableCell>{(po as any).projects?.name}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(po.total_amount)}</TableCell>
                <TableCell>
                  <Select value={po.status} onValueChange={(v) => updatePOStatus.mutate({ id: po.id, status: v })}>
                    <SelectTrigger className="h-7 w-[110px] text-xs" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{formatDate(po.created_at)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedPO(po); }}><FileText className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
