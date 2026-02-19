import { useState } from "react";
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
import { formatCurrency, formatDate, statusColor } from "@/lib/formatters";
import { exportRABillPdf } from "@/lib/pdf-export";
import { Plus, FileText, Trash2, Printer, CheckCircle, Download } from "lucide-react";
import { TablePagination } from "@/components/shared/TablePagination";

type LineItem = { description: string; unit: string; quantity: number; rate: number; previous_quantity: number; current_quantity: number };

export default function Billing({ projectId }: { projectId?: string }) {
  const { data: orgId } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [detailBill, setDetailBill] = useState<any>(null);
  const [form, setForm] = useState({ bill_number: "", project_id: "", period_from: "", period_to: "", retention_percent: "5", notes: "" });
  const [items, setItems] = useState<LineItem[]>([{ description: "", unit: "nos", quantity: 0, rate: 0, previous_quantity: 0, current_quantity: 0 }]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => { const { data, error } = await supabase.from("projects").select("*").eq("organization_id", orgId!); if (error) throw error; return data; },
    enabled: !!orgId,
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["ra-bills", orgId, projectId || selectedProject],
    queryFn: async () => {
      let q = supabase.from("ra_bills").select("*, projects(name)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      else if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      const { data, error } = await q; if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const { data: billItems = [] } = useQuery({
    queryKey: ["ra-bill-items", detailBill?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ra_bill_items").select("*").eq("bill_id", detailBill!.id);
      if (error) throw error; return data;
    },
    enabled: !!detailBill,
  });

  const addItem = () => setItems(p => [...p, { description: "", unit: "nos", quantity: 0, rate: 0, previous_quantity: 0, current_quantity: 0 }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: any) => {
    setItems(p => { const n = [...p]; n[i] = { ...n[i], [field]: value }; return n; });
  };

  const totalAmount = items.reduce((sum, item) => sum + item.current_quantity * item.rate, 0);
  const retentionAmount = totalAmount * (Number(form.retention_percent) / 100);
  const netAmount = totalAmount - retentionAmount;

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: bill, error } = await supabase.from("ra_bills").insert({
        organization_id: orgId!, project_id: form.project_id, bill_number: form.bill_number,
        period_from: form.period_from || null, period_to: form.period_to || null,
        total_amount: totalAmount, retention_percent: Number(form.retention_percent),
        retention_amount: retentionAmount, net_amount: netAmount,
        notes: form.notes || null, created_by: user!.id,
      }).select().single();
      if (error) throw error;
      const billItemsData = items.filter(i => i.description).map(i => ({
        bill_id: bill.id, description: i.description, unit: i.unit,
        quantity: i.quantity, rate: i.rate, amount: i.current_quantity * i.rate,
        previous_quantity: i.previous_quantity, current_quantity: i.current_quantity,
        cumulative_quantity: i.previous_quantity + i.current_quantity,
      }));
      if (billItemsData.length > 0) {
        const { error: itemError } = await supabase.from("ra_bill_items").insert(billItemsData);
        if (itemError) throw itemError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ra-bills"] });
      setOpen(false);
      setForm({ bill_number: "", project_id: "", period_from: "", period_to: "", retention_percent: "5", notes: "" });
      setItems([{ description: "", unit: "nos", quantity: 0, rate: 0, previous_quantity: 0, current_quantity: 0 }]);
      toast.success("RA Bill created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Pagination
  const paginatedBills = bills.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ra_bills").update({ status: "approved", approved_by: user!.id, approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ra-bills"] });
      toast.success("Bill approved");
    },
  });

  const handlePrint = async (bill: any) => {
    const w = window.open("", "_blank");
    if (!w) return;

    // Fetch line items for the print view
    const { data: printItems } = await supabase
      .from("ra_bill_items")
      .select("*")
      .eq("bill_id", bill.id);

    const itemRows = (printItems || []).map((i: any) =>
      `<tr><td>${i.description}</td><td>${i.unit}</td><td style="text-align:right">${formatCurrency(i.rate)}</td><td style="text-align:right">${i.previous_quantity}</td><td style="text-align:right">${i.current_quantity}</td><td style="text-align:right">${i.cumulative_quantity}</td><td style="text-align:right">${formatCurrency(i.amount)}</td></tr>`
    ).join("");

    w.document.write(`<html><head><title>RA Bill - ${bill.bill_number}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}.total{font-weight:bold;font-size:14px;margin-top:12px}</style></head><body>`);
    w.document.write(`<h2>Running Account Bill: ${bill.bill_number}</h2>`);
    w.document.write(`<p>Project: ${(bill as any).projects?.name || "—"}</p>`);
    w.document.write(`<p>Date: ${formatDate(bill.bill_date)}</p>`);
    if (bill.period_from || bill.period_to) {
      w.document.write(`<p>Period: ${formatDate(bill.period_from)} — ${formatDate(bill.period_to)}</p>`);
    }
    w.document.write(`<table><thead><tr><th>Description</th><th>Unit</th><th style="text-align:right">Rate</th><th style="text-align:right">Prev Qty</th><th style="text-align:right">Curr Qty</th><th style="text-align:right">Cumulative</th><th style="text-align:right">Amount</th></tr></thead><tbody>${itemRows}</tbody></table>`);
    w.document.write(`<p class="total">Total: ${formatCurrency(bill.total_amount)}</p>`);
    w.document.write(`<p class="total">Retention (${bill.retention_percent}%): ${formatCurrency(bill.retention_amount)}</p>`);
    w.document.write(`<p class="total">Net Payable: ${formatCurrency(bill.net_amount)}</p>`);
    w.document.write(`<p>Status: ${bill.status}</p></body></html>`);
    w.document.close();
    w.print();
  };

  if (detailBill) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bill: {detailBill.bill_number}</h1>
            <p className="text-muted-foreground">{(detailBill as any).projects?.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePrint(detailBill)}><Printer className="h-4 w-4 mr-1" /> Print</Button>
            <Button variant="outline" size="sm" onClick={async () => {
              const { data: pdfItems } = await supabase.from("ra_bill_items").select("*").eq("bill_id", detailBill.id);
              exportRABillPdf(detailBill, pdfItems || []);
            }}><Download className="h-4 w-4 mr-1" /> PDF</Button>
            <Button variant="outline" size="sm" onClick={() => setDetailBill(null)}>Back</Button>
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{formatCurrency(detailBill.total_amount)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Retention ({detailBill.retention_percent}%)</p><p className="text-lg font-bold">{formatCurrency(detailBill.retention_amount)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Net Payable</p><p className="text-lg font-bold">{formatCurrency(detailBill.net_amount)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Status</p><Badge className={statusColor(detailBill.status)}>{detailBill.status}</Badge></CardContent></Card>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Previous Qty</TableHead>
                    <TableHead>Current Qty</TableHead>
                    <TableHead>Cumulative</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{formatCurrency(item.rate)}</TableCell>
                      <TableCell>{item.previous_quantity}</TableCell>
                      <TableCell>{item.current_quantity}</TableCell>
                      <TableCell>{item.cumulative_quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Client Billing (RA Bills)</h1><p className="text-muted-foreground">Progress-based running account bills</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New RA Bill</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create RA Bill</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Project *</Label>
                  <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Bill Number *</Label><Input value={form.bill_number} onChange={e => setForm(p => ({ ...p, bill_number: e.target.value }))} placeholder="RA-001" /></div>
                <div><Label>Period From</Label><Input type="date" value={form.period_from} onChange={e => setForm(p => ({ ...p, period_from: e.target.value }))} /></div>
                <div><Label>Period To</Label><Input type="date" value={form.period_to} onChange={e => setForm(p => ({ ...p, period_to: e.target.value }))} /></div>
                <div><Label>Retention %</Label><Input type="number" value={form.retention_percent} onChange={e => setForm(p => ({ ...p, retention_percent: e.target.value }))} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><Label>Line Items</Label><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add</Button></div>
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end border p-2 rounded">
                      <div className="col-span-2"><Label className="text-xs">Description</Label><Input value={item.description} onChange={e => updateItem(i, "description", e.target.value)} /></div>
                      <div><Label className="text-xs">Unit</Label><Input value={item.unit} onChange={e => updateItem(i, "unit", e.target.value)} /></div>
                      <div><Label className="text-xs">Rate</Label><Input type="number" value={item.rate} onChange={e => updateItem(i, "rate", Number(e.target.value))} /></div>
                      <div><Label className="text-xs">Prev Qty</Label><Input type="number" value={item.previous_quantity} onChange={e => updateItem(i, "previous_quantity", Number(e.target.value))} /></div>
                      <div className="flex gap-1">
                        <div className="flex-1"><Label className="text-xs">Curr Qty</Label><Input type="number" value={item.current_quantity} onChange={e => updateItem(i, "current_quantity", Number(e.target.value))} /></div>
                        {items.length > 1 && <Button variant="ghost" size="icon" className="mt-5" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-sm">
                <div>Total: <strong>{formatCurrency(totalAmount)}</strong></div>
                <div>Retention ({form.retention_percent}%): <strong>{formatCurrency(retentionAmount)}</strong></div>
                <div>Net Payable: <strong>{formatCurrency(netAmount)}</strong></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button className="w-full" disabled={!form.bill_number || !form.project_id || createMutation.isPending} onClick={() => createMutation.mutate()}>Create Bill</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); setCurrentPage(1); }}>
        <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead className="hidden sm:table-cell">Project</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No bills yet</TableCell></TableRow>
                ) : paginatedBills.map((bill: any) => (
                  <TableRow key={bill.id} className="cursor-pointer" onClick={() => setDetailBill(bill)}>
                    <TableCell className="font-medium">{bill.bill_number}</TableCell>
                    <TableCell className="hidden sm:table-cell">{(bill as any).projects?.name}</TableCell>
                    <TableCell>{formatCurrency(bill.net_amount)}</TableCell>
                    <TableCell><Badge className={statusColor(bill.status)}>{bill.status}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(bill.bill_date)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {bill.status === "draft" && (
                          <Button variant="ghost" size="sm" onClick={() => approveMutation.mutate(bill.id)}><CheckCircle className="h-4 w-4 mr-1" /> Approve</Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(bill)}><Printer className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {bills.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={Math.ceil(bills.length / pageSize)}
              totalItems={bills.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
