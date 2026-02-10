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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/formatters";
import { Plus, Trash2, FileText, Printer, BarChart3, PieChart, TrendingUp, Users, Package, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(220, 70%, 50%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(280, 60%, 50%)", "hsl(210, 15%, 47%)"];

const WIDGETS = [
  { id: "task_status", label: "Task Status Breakdown", icon: BarChart3, category: "Tasks" },
  { id: "task_priority", label: "Tasks by Priority", icon: PieChart, category: "Tasks" },
  { id: "issue_status", label: "Issue Status", icon: AlertTriangle, category: "Issues" },
  { id: "issue_severity", label: "Issues by Severity", icon: AlertTriangle, category: "Issues" },
  { id: "budget_vs_spent", label: "Budget vs Spent", icon: TrendingUp, category: "Finance" },
  { id: "attendance_summary", label: "Attendance Summary", icon: Users, category: "Labour" },
  { id: "material_stock", label: "Material Stock Levels", icon: Package, category: "Materials" },
  { id: "project_progress", label: "Project Progress", icon: BarChart3, category: "Projects" },
];

export default function ReportBuilder() {
  const { data: orgId } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", widgets: [] as string[] });
  const [activeReport, setActiveReport] = useState<any>(null);

  const { data: reportConfigs = [] } = useQuery({
    queryKey: ["report-configs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("report_configs").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Data queries for widgets
  const { data: tasks = [] } = useQuery({
    queryKey: ["rb-tasks", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!activeReport,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["rb-issues", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("issues").select("*").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!activeReport,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["rb-projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["rb-attendance", orgId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const { data, error } = await supabase.from("attendance").select("*").eq("organization_id", orgId!).gte("date", weekAgo).lte("date", today);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!activeReport,
  });

  const { data: stockEntries = [] } = useQuery({
    queryKey: ["rb-stock", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_entries").select("*, materials(name)").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!activeReport,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("report_configs").insert({
        organization_id: orgId!,
        name: form.name,
        description: form.description || null,
        config: { widgets: form.widgets },
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-configs"] });
      setOpen(false);
      setForm({ name: "", description: "", widgets: [] });
      toast.success("Report created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("report_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-configs"] });
      if (activeReport) setActiveReport(null);
      toast.success("Report deleted");
    },
  });

  const toggleWidget = (widgetId: string) => {
    setForm(p => ({
      ...p,
      widgets: p.widgets.includes(widgetId)
        ? p.widgets.filter(w => w !== widgetId)
        : [...p.widgets, widgetId],
    }));
  };

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "task_status": {
        const data = [
          { name: "Not Started", value: tasks.filter((t: any) => t.status === "not_started").length },
          { name: "In Progress", value: tasks.filter((t: any) => t.status === "in_progress").length },
          { name: "Completed", value: tasks.filter((t: any) => t.status === "completed").length },
          { name: "Blocked", value: tasks.filter((t: any) => t.status === "blocked").length },
        ].filter(d => d.value > 0);
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="value" fill="hsl(220, 70%, 50%)" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        );
      }
      case "task_priority": {
        const data = [
          { name: "Low", value: tasks.filter((t: any) => t.priority === "low").length },
          { name: "Medium", value: tasks.filter((t: any) => t.priority === "medium").length },
          { name: "High", value: tasks.filter((t: any) => t.priority === "high").length },
          { name: "Critical", value: tasks.filter((t: any) => t.priority === "critical").length },
        ].filter(d => d.value > 0);
        return (
          <ResponsiveContainer width="100%" height={200}>
            <RPieChart><Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>{data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /><Legend /></RPieChart>
          </ResponsiveContainer>
        );
      }
      case "issue_status": {
        const data = [
          { name: "Open", value: issues.filter((i: any) => i.status === "open").length },
          { name: "In Progress", value: issues.filter((i: any) => i.status === "in_progress").length },
          { name: "Resolved", value: issues.filter((i: any) => i.status === "resolved").length },
          { name: "Closed", value: issues.filter((i: any) => i.status === "closed").length },
        ].filter(d => d.value > 0);
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        );
      }
      case "issue_severity": {
        const data = [
          { name: "Low", value: issues.filter((i: any) => i.severity === "low").length },
          { name: "Medium", value: issues.filter((i: any) => i.severity === "medium").length },
          { name: "High", value: issues.filter((i: any) => i.severity === "high").length },
          { name: "Critical", value: issues.filter((i: any) => i.severity === "critical").length },
        ].filter(d => d.value > 0);
        return (
          <ResponsiveContainer width="100%" height={200}>
            <RPieChart><Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>{data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /><Legend /></RPieChart>
          </ResponsiveContainer>
        );
      }
      case "budget_vs_spent": {
        const data = projects.map((p: any) => ({
          name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
          Budget: Number(p.budget) || 0,
          Spent: Number(p.spent) || 0,
        }));
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Bar dataKey="Budget" fill="hsl(220, 70%, 50%)" radius={[4,4,0,0]} /><Bar dataKey="Spent" fill="hsl(0, 72%, 51%)" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        );
      }
      case "attendance_summary": {
        const present = attendance.filter((a: any) => a.status === "present" || a.status === "overtime").length;
        const absent = attendance.filter((a: any) => a.status === "absent").length;
        const half = attendance.filter((a: any) => a.status === "half_day").length;
        const data = [{ name: "Present", value: present }, { name: "Absent", value: absent }, { name: "Half Day", value: half }].filter(d => d.value > 0);
        return (
          <ResponsiveContainer width="100%" height={200}>
            <RPieChart><Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>{data.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /><Legend /></RPieChart>
          </ResponsiveContainer>
        );
      }
      case "material_stock": {
        const byMaterial: Record<string, { name: string; in: number; out: number }> = {};
        stockEntries.forEach((s: any) => {
          const name = s.materials?.name || "Unknown";
          if (!byMaterial[name]) byMaterial[name] = { name, in: 0, out: 0 };
          if (s.entry_type === "in") byMaterial[name].in += Number(s.quantity);
          else byMaterial[name].out += Number(s.quantity);
        });
        const data = Object.values(byMaterial).slice(0, 8);
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="in" name="Stock In" fill="hsl(142, 71%, 45%)" radius={[4,4,0,0]} /><Bar dataKey="out" name="Stock Out" fill="hsl(38, 92%, 50%)" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        );
      }
      case "project_progress": {
        const data = projects.map((p: any) => ({
          name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
          Progress: Number(p.progress) || 0,
        }));
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} fontSize={11} /><YAxis dataKey="name" type="category" fontSize={10} width={100} /><Tooltip /><Bar dataKey="Progress" fill="hsl(142, 71%, 45%)" radius={[0,4,4,0]} /></BarChart>
          </ResponsiveContainer>
        );
      }
      default:
        return <p className="text-sm text-muted-foreground text-center py-4">Widget not found</p>;
    }
  };

  if (activeReport) {
    const widgets = (activeReport.config as any)?.widgets || [];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{activeReport.name}</h1>
            {activeReport.description && <p className="text-muted-foreground">{activeReport.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Button variant="outline" onClick={() => setActiveReport(null)}>Back</Button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 print:grid-cols-2">
          {widgets.map((wId: string) => {
            const widget = WIDGETS.find(w => w.id === wId);
            return (
              <Card key={wId}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{widget?.label || wId}</CardTitle></CardHeader>
                <CardContent>{renderWidget(wId)}</CardContent>
              </Card>
            );
          })}
        </div>
        {widgets.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">This report has no widgets configured</CardContent></Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Reports</h1>
          <p className="text-muted-foreground">Build and save custom report dashboards</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New Report</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Custom Report</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Report Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Weekly Overview" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div>
                <Label className="mb-3 block">Select Widgets *</Label>
                <div className="space-y-2">
                  {Object.entries(
                    WIDGETS.reduce((acc, w) => { (acc[w.category] = acc[w.category] || []).push(w); return acc; }, {} as Record<string, typeof WIDGETS>)
                  ).map(([category, widgets]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{category}</p>
                      <div className="space-y-1">
                        {widgets.map(w => (
                          <label key={w.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer">
                            <Checkbox checked={form.widgets.includes(w.id)} onCheckedChange={() => toggleWidget(w.id)} />
                            <w.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{w.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="w-full" disabled={!form.name || form.widgets.length === 0 || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? "Creating..." : "Create Report"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportConfigs.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              No custom reports yet. Create one by selecting widgets to build your dashboard.
            </CardContent>
          </Card>
        ) : reportConfigs.map((r: any) => {
          const widgetCount = (r.config as any)?.widgets?.length || 0;
          return (
            <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveReport(r)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />{r.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(r.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {r.description && <p className="text-xs text-muted-foreground mb-2">{r.description}</p>}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{widgetCount} widgets</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
