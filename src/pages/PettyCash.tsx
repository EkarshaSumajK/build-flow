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
import { Plus, Search, Trash2, Printer, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TablePagination } from "@/components/shared/TablePagination";

const EXPENSE_CATEGORIES = ["general", "transport", "food", "tools", "office", "utilities", "miscellaneous"];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-primary/10 text-primary", transport: "bg-blue-100 text-blue-700",
  food: "bg-orange-100 text-orange-700", tools: "bg-purple-100 text-purple-700",
  office: "bg-green-100 text-green-700", utilities: "bg-yellow-100 text-yellow-700",
  miscellaneous: "bg-muted text-muted-foreground",
};

const CHART_COLORS = ["hsl(220, 70%, 50%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)", "hsl(180, 60%, 45%)", "hsl(210, 15%, 47%)"];

export default function PettyCash({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { can } = useRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  const emptyForm = { project_id: projectId || "", amount: "", category: "general", description: "", date: new Date().toISOString().split("T")[0], receipt_number: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error; return data;
    },
    enabled: !!orgId && !projectId,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["petty-cash", orgId, projectId, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase.from("petty_cash_entries").select("*, projects(name)").eq("organization_id", orgId!).gte("date", dateFrom).lte("date", dateTo).order("date", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("petty_cash_entries").insert({
        organization_id: orgId!, project_id: projectId || form.project_id,
        amount: parseFloat(form.amount), category: form.category,
        description: form.description || null, date: form.date,
        receipt_number: form.receipt_number || null, recorded_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash"] });
      setDialogOpen(false); setForm(emptyForm);
      toast.success("Expense recorded!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("petty_cash_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["petty-cash"] });
      setDeleteTarget(null); toast.success("Entry deleted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const totalExpenses = entries.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  const categoryData = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: entries.filter((e: any) => (e.category || "").toLowerCase() === cat.toLowerCase()).reduce((s: number, e: any) => s + Number(e.amount), 0),
  })).filter((d) => d.value > 0);

  const otherCategories = entries
    .filter((e: any) => !EXPENSE_CATEGORIES.includes((e.category || "").toLowerCase()))
    .reduce((acc: Record<string, number>, e: any) => { const cat = e.category || "uncategorized"; acc[cat] = (acc[cat] || 0) + Number(e.amount); return acc; }, {});
  
  const allCategoryData = [...categoryData, ...Object.entries(otherCategories).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))];

  const filtered = entries.filter((e: any) =>
    (e.description ?? "").toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedEntries = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchChange = (value: string) => { setSearch(value); setCurrentPage(1); };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const rows = filtered.map((e: any) =>
      `<tr><td>${e.date}</td><td>${(e as any).projects?.name || ""}</td><td style="text-transform:capitalize">${e.category}</td><td>${e.description || ""}</td><td>${e.receipt_number || ""}</td><td style="text-align:right">${formatCurrency(e.amount)}</td></tr>`
    ).join("");
    printWindow.document.write(`<html><head><title>Petty Cash Report</title><style>body{font-family:system-ui;padding:24px;font-size:13px}h1{font-size:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:12px}th{background:#f5f5f5;font-weight:600}.total{font-size:16px;font-weight:700;margin:12px 0}@media print{body{padding:0}}</style></head><body><h1>Petty Cash Report</h1><p>${dateFrom} to ${dateTo}</p><p class="total">Total: ${formatCurrency(totalExpenses)}</p><table><thead><tr><th>Date</th><th>Project</th><th>Category</th><th>Description</th><th>Receipt #</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Petty Cash</h1><p className="text-muted-foreground">Track daily expenses and petty cash</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print Report</Button>
          {can("petty_cash:create") && <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Expense</Button>}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addEntry.mutate(); }} className="space-y-4">
            {!projectId && (
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATEGORIES.map((c) => (<SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Bought nails from local store" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Receipt #</Label><Input value={form.receipt_number} onChange={(e) => setForm({ ...form, receipt_number: e.target.value })} placeholder="Optional" /></div>
            </div>
            <Button type="submit" className="w-full" disabled={addEntry.isPending}>{addEntry.isPending ? "Saving..." : "Record Expense"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} title="Delete Expense" description={`Delete this ₹${deleteTarget?.amount} expense?`} onConfirm={() => deleteEntry.mutate(deleteTarget.id)} loading={deleteEntry.isPending} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px]" />
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px]" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Transactions</p><p className="text-2xl font-bold">{entries.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Avg per Transaction</p><p className="text-2xl font-bold">{entries.length > 0 ? formatCurrency(totalExpenses / entries.length) : "₹0"}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList><TabsTrigger value="transactions">Transactions</TabsTrigger><TabsTrigger value="reports">Reports</TabsTrigger></TabsList>

        <TabsContent value="transactions" className="mt-4">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search expenses..." value={search} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10" />
          </div>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <Card className="min-w-[600px] sm:min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>{!projectId && <TableHead>Project</TableHead>}<TableHead>Category</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead><TableHead className="hidden md:table-cell">Receipt #</TableHead><TableHead>Amount</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No expenses found</TableCell></TableRow>
                  ) : paginatedEntries.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>{formatDate(e.date)}</TableCell>
                      {!projectId && <TableCell>{(e as any).projects?.name}</TableCell>}
                      <TableCell><Badge className={CATEGORY_COLORS[e.category] || ""} variant="secondary">{e.category}</Badge></TableCell>
                      <TableCell className="hidden sm:table-cell">{e.description || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{e.receipt_number || "—"}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(e.amount)}</TableCell>
                      <TableCell>
                        {can("petty_cash:delete") && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(e)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 0 && (
                <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }} />
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Expenses by Category</CardTitle></CardHeader>
              <CardContent className="h-[350px]">
                {allCategoryData.length === 0 ? <p className="text-center text-muted-foreground py-8">No data for selected period</p> : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={allCategoryData} cx="50%" cy="45%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                        {allCategoryData.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
