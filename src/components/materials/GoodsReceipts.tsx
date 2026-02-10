import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, FileText, Printer, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { exportGRNPdf } from "@/lib/pdf-export";

export function GoodsReceipts() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<any>(null);
  const [form, setForm] = useState({ project_id: "", vendor_name: "", po_id: "", received_date: new Date().toISOString().split("T")[0], notes: "" });
  const [items, setItems] = useState<{ material_id: string; quantity_received: string; quantity_accepted: string; notes: string }[]>([]);

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
      const { data, error } = await supabase.from("purchase_orders").select("id, po_number, vendor_name").eq("organization_id", orgId!).eq("status", "approved");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: goodsReceipts = [] } = useQuery({
    queryKey: ["goods-receipts", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("goods_receipts").select("*, projects(name), purchase_orders(po_number)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: grnItems = [] } = useQuery({
    queryKey: ["grn-items", selectedGRN?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("grn_items").select("*, materials(name, unit)").eq("grn_id", selectedGRN!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedGRN,
  });

  const createGRN = useMutation({
    mutationFn: async () => {
      const grnNumber = `GRN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const { data: grn, error } = await supabase.from("goods_receipts").insert({
        organization_id: orgId!,
        project_id: form.project_id,
        po_id: form.po_id || null,
        grn_number: grnNumber,
        vendor_name: form.vendor_name,
        received_date: form.received_date,
        notes: form.notes || null,
        received_by: user!.id,
      }).select().single();
      if (error) throw error;

      const grnItemsData = items.filter(i => i.material_id && i.quantity_received).map(i => ({
        grn_id: grn.id,
        material_id: i.material_id,
        quantity_received: parseFloat(i.quantity_received),
        quantity_accepted: parseFloat(i.quantity_accepted) || parseFloat(i.quantity_received),
        notes: i.notes || null,
      }));
      if (grnItemsData.length > 0) {
        const { error: itemsError } = await supabase.from("grn_items").insert(grnItemsData);
        if (itemsError) throw itemsError;

        // Auto-create stock entries for accepted quantities
        const stockEntries = grnItemsData.map(i => ({
          organization_id: orgId!,
          project_id: form.project_id,
          material_id: i.material_id,
          quantity: i.quantity_accepted,
          entry_type: "in",
          notes: `GRN: ${grnNumber}`,
          recorded_by: user!.id,
        }));
        const { error: stockError } = await supabase.from("stock_entries").insert(stockEntries);
        if (stockError) throw new Error(`GRN created but stock update failed: ${stockError.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goods-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["stock-entries"] });
      setDialogOpen(false);
      setForm({ project_id: "", vendor_name: "", po_id: "", received_date: new Date().toISOString().split("T")[0], notes: "" });
      setItems([]);
      toast.success("GRN created & stock updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const addItem = () => setItems([...items, { material_id: "", quantity_received: "", quantity_accepted: "", notes: "" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  const selectPO = (poId: string) => {
    const po = purchaseOrders.find((p: any) => p.id === poId);
    if (po) {
      setForm({ ...form, po_id: poId, vendor_name: (po as any).vendor_name });
    }
  };

  const printGRN = (grn: any) => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const rows = grnItems.map((i: any) =>
      `<tr><td>${i.materials?.name}</td><td>${i.quantity_received} ${i.materials?.unit}</td><td>${i.quantity_accepted} ${i.materials?.unit}</td><td>${i.notes || ""}</td></tr>`
    ).join("");
    pw.document.write(`<html><head><title>${grn.grn_number}</title><style>body{font-family:system-ui;padding:24px;font-size:13px}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:12px}th{background:#f5f5f5}@media print{body{padding:0}}</style></head><body><h1>Goods Receipt Note: ${grn.grn_number}</h1><p>Vendor: ${grn.vendor_name}</p><p>Project: ${(grn as any).projects?.name}</p><p>Received: ${formatDate(grn.received_date)}</p>${grn.purchase_orders ? `<p>PO: ${(grn as any).purchase_orders.po_number}</p>` : ""}<table><thead><tr><th>Material</th><th>Qty Received</th><th>Qty Accepted</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    pw.document.close();
    pw.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ project_id: "", vendor_name: "", po_id: "", received_date: new Date().toISOString().split("T")[0], notes: "" }); setItems([{ material_id: "", quantity_received: "", quantity_accepted: "", notes: "" }]); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Create GRN
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Goods Receipt Note</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createGRN.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Linked PO (optional)</Label>
                <Select value={form.po_id || "none"} onValueChange={(v) => { if (v === "none") { setForm({ ...form, po_id: "" }); } else { selectPO(v); } }}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No PO</SelectItem>
                    {purchaseOrders.map((po: any) => (<SelectItem key={po.id} value={po.id}>{po.po_number} — {po.vendor_name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Vendor Name *</Label><Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Received Date</Label><Input type="date" value={form.received_date} onChange={(e) => setForm({ ...form, received_date: e.target.value })} /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Items Received</Label><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" />Add</Button></div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_70px_32px] gap-2 mb-2 items-end">
                  <Select value={item.material_id} onValueChange={(v) => updateItem(i, "material_id", v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Material" /></SelectTrigger>
                    <SelectContent>{materials.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
                  </Select>
                  <Input className="h-9" type="number" placeholder="Recv" value={item.quantity_received} onChange={(e) => updateItem(i, "quantity_received", e.target.value)} />
                  <Input className="h-9" type="number" placeholder="Accept" value={item.quantity_accepted} onChange={(e) => updateItem(i, "quantity_accepted", e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(i)}>×</Button>
                </div>
              ))}
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={createGRN.isPending}>{createGRN.isPending ? "Creating..." : "Create GRN"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedGRN} onOpenChange={(v) => { if (!v) setSelectedGRN(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedGRN?.grn_number}</DialogTitle></DialogHeader>
          {selectedGRN && (
            <div className="space-y-3">
              <div className="text-sm space-y-1">
                <p><strong>Vendor:</strong> {selectedGRN.vendor_name}</p>
                <p><strong>Project:</strong> {(selectedGRN as any).projects?.name}</p>
                <p><strong>Received:</strong> {formatDate(selectedGRN.received_date)}</p>
                {selectedGRN.purchase_orders && <p><strong>PO:</strong> {(selectedGRN as any).purchase_orders.po_number}</p>}
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Received</TableHead><TableHead>Accepted</TableHead></TableRow></TableHeader>
                <TableBody>
                  {grnItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.materials?.name}</TableCell>
                      <TableCell>{item.quantity_received} {item.materials?.unit}</TableCell>
                      <TableCell>{item.quantity_accepted} {item.materials?.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => printGRN(selectedGRN)}><Printer className="mr-2 h-4 w-4" />Print</Button>
                <Button variant="outline" className="flex-1" onClick={() => exportGRNPdf(selectedGRN, grnItems)}><Download className="mr-2 h-4 w-4" />PDF</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <Table>
          <TableHeader>
            <TableRow><TableHead>GRN #</TableHead><TableHead>Vendor</TableHead><TableHead>Project</TableHead><TableHead>PO</TableHead><TableHead>Received</TableHead><TableHead>Actions</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {goodsReceipts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No goods receipts yet</TableCell></TableRow>
            ) : goodsReceipts.map((grn: any) => (
              <TableRow key={grn.id} className="cursor-pointer" onClick={() => setSelectedGRN(grn)}>
                <TableCell className="font-medium">{grn.grn_number}</TableCell>
                <TableCell>{grn.vendor_name}</TableCell>
                <TableCell>{(grn as any).projects?.name}</TableCell>
                <TableCell>{(grn as any).purchase_orders?.po_number || "—"}</TableCell>
                <TableCell>{formatDate(grn.received_date)}</TableCell>
                <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setSelectedGRN(grn); }}><FileText className="h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
