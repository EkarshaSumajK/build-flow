import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area } from "recharts";
import { formatCurrency, formatDate, statusColor, priorityColor } from "@/lib/formatters";
import { exportDPRPdf, exportPayrollPdf } from "@/lib/pdf-export";
import { DailyProgressReport } from "@/components/reports/DailyProgressReport";
import { AIReportGenerator } from "@/components/reports/AIReportGenerator";
import { ComplianceChecker } from "@/components/reports/ComplianceChecker";
import { Download, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, BarChart3, Sparkles, ShieldCheck } from "lucide-react";

const COLORS = ["hsl(220, 70%, 50%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(210, 15%, 47%)", "hsl(280, 60%, 50%)"];

export default function Reports({ projectId }: { projectId?: string }) {
  const { data: orgId } = useOrganization();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [drillDownType, setDrillDownType] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => { const { data, error } = await supabase.from("projects").select("*").eq("organization_id", orgId!); if (error) throw error; return data; },
    enabled: !!orgId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["report-tasks", orgId, selectedProject],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*, projects(name)").eq("organization_id", orgId!);
      if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      const { data, error } = await q; if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["report-issues", orgId, selectedProject],
    queryFn: async () => {
      let q = supabase.from("issues").select("*, projects(name)").eq("organization_id", orgId!);
      if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      const { data, error } = await q; if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["report-attendance", orgId, selectedProject],
    queryFn: async () => {
      let q = supabase.from("attendance").select("*, workers(name, daily_rate, trade)").eq("organization_id", orgId!);
      if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      const { data, error } = await q; if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const { data: stockEntries = [] } = useQuery({
    queryKey: ["report-stock", orgId, selectedProject],
    queryFn: async () => {
      let q = supabase.from("stock_entries").select("*, materials(name, unit)").eq("organization_id", orgId!);
      if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      const { data, error } = await q; if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  // ============ ANALYTICS DATA ============

  const taskStatusData = [
    { name: "Not Started", value: tasks.filter((t: any) => t.status === "not_started").length, status: "not_started" },
    { name: "In Progress", value: tasks.filter((t: any) => t.status === "in_progress").length, status: "in_progress" },
    { name: "Completed", value: tasks.filter((t: any) => t.status === "completed").length, status: "completed" },
    { name: "Blocked", value: tasks.filter((t: any) => t.status === "blocked").length, status: "blocked" },
  ].filter(d => d.value > 0);

  const issueCategoryData = [
    { name: "Safety", value: issues.filter((i: any) => i.category === "safety").length },
    { name: "Quality", value: issues.filter((i: any) => i.category === "quality").length },
    { name: "Delay", value: issues.filter((i: any) => i.category === "delay").length },
    { name: "Material", value: issues.filter((i: any) => i.category === "material").length },
    { name: "Labour", value: issues.filter((i: any) => i.category === "labour").length },
    { name: "Other", value: issues.filter((i: any) => i.category === "other").length },
  ].filter(d => d.value > 0);

  const budgetData = projects.map((p: any) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    fullName: p.name,
    Budget: Number(p.budget) || Number(p.total_budget) || Number(p.estimated_budget) || 0,
    Spent: Number(p.spent) || Number(p.total_spent) || Number(p.actual_cost) || 0,
    Remaining: Math.max(0, (Number(p.budget) || Number(p.total_budget) || 0) - (Number(p.spent) || Number(p.total_spent) || 0)),
    utilization: (Number(p.budget) || Number(p.total_budget) || 0) > 0 ? Math.round(((Number(p.spent) || Number(p.total_spent) || 0) / (Number(p.budget) || Number(p.total_budget) || 0)) * 100) : 0,
  }));

  // Debug: log budget data
  console.log("Budget data:", budgetData);

  // Project Comparison: task completion rates
  const projectComparisonData = projects.map((p: any) => {
    const pTasks = tasks.filter((t: any) => t.project_id === p.id);
    const completed = pTasks.filter((t: any) => t.status === "completed").length;
    const total = pTasks.length;
    const pIssues = issues.filter((i: any) => i.project_id === p.id);
    return {
      name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
      "Completion %": total > 0 ? Math.round((completed / total) * 100) : 0,
      "Total Tasks": total,
      "Open Issues": pIssues.filter((i: any) => i.status === "open" || i.status === "in_progress").length,
    };
  });

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i)); return d.toISOString().split("T")[0];
  });
  const last7Days = last30Days.slice(-7);

  const attendanceByDay = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    Present: attendance.filter((a: any) => a.date === date && (a.status === "present" || a.status === "overtime")).length,
    Absent: attendance.filter((a: any) => a.date === date && a.status === "absent").length,
  }));

  // Attendance trend (30 days)
  const attendanceTrend = last30Days.map(date => ({
    date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    Workers: attendance.filter((a: any) => a.date === date && (a.status === "present" || a.status === "overtime")).length,
  }));

  const consumptionByDay = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    "Stock In": stockEntries.filter((s: any) => s.recorded_at?.split("T")[0] === date && s.entry_type === "in").reduce((sum: number, s: any) => sum + Number(s.quantity), 0),
    "Stock Out": stockEntries.filter((s: any) => s.recorded_at?.split("T")[0] === date && s.entry_type === "out").reduce((sum: number, s: any) => sum + Number(s.quantity), 0),
  }));

  const totalPayroll = attendance.reduce((sum: number, a: any) => {
    const rate = a.workers?.daily_rate || 0;
    const ded = Number(a.deduction) || 0;
    if (a.status === "present") return sum + rate - ded;
    if (a.status === "half_day") return sum + rate / 2 - ded;
    if (a.status === "overtime") return sum + rate + (a.overtime_hours * rate / 8) - ded;
    return sum;
  }, 0);

  const completionRate = tasks.length > 0 ? Math.round((tasks.filter((t: any) => t.status === "completed").length / tasks.length) * 100) : 0;
  const overdueTasks = tasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed").length;

  // Drill-down data
  const getDrillDownTasks = (status: string) => tasks.filter((t: any) => t.status === status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Reports & Analytics</h1><p className="text-muted-foreground">Advanced insights with drill-down</p></div>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Completion Rate</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{completionRate}%</p>
            {completionRate >= 50 ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Tasks</p>
          <p className="text-2xl font-bold">{tasks.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className={`text-2xl font-bold ${overdueTasks > 0 ? "text-destructive" : ""}`}>{overdueTasks}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Open Issues</p>
          <p className="text-2xl font-bold text-warning">{issues.filter((i: any) => i.status === "open").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total Payroll</p>
          <p className="text-2xl font-bold">{formatCurrency(totalPayroll)}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comparison">Project Comparison</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="labour">Labour</TabsTrigger>
          <TabsTrigger value="dpr">DPR</TabsTrigger>
          <TabsTrigger value="ai-dpr" className="gap-1"><Sparkles className="h-3 w-3" />AI DPR</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-1"><ShieldCheck className="h-3 w-3" />Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Budget vs Spent</CardTitle></CardHeader>
              <CardContent className="h-[350px]">
                {budgetData.filter(d => d.Budget > 0 || d.Spent > 0).length === 0 ? <p className="text-center text-muted-foreground py-8">No budget data available</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={budgetData.filter(d => d.Budget > 0 || d.Spent > 0)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={11} angle={-20} textAnchor="end" height={60} interval={0} />
                      <YAxis fontSize={11} tickFormatter={(v) => {
                        if (v >= 10000000) return `${(v/10000000).toFixed(0)}Cr`;
                        if (v >= 100000) return `${(v/100000).toFixed(0)}L`;
                        if (v >= 1000) return `${(v/1000).toFixed(0)}K`;
                        return v;
                      }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="Budget" fill="hsl(220, 70%, 50%)" radius={[4,4,0,0]} />
                      <Bar dataKey="Spent" fill="hsl(38, 92%, 50%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Task Status with Drill-down */}
            <Card>
              <CardHeader><CardTitle className="text-base">Task Status (Click to drill down)</CardTitle></CardHeader>
              <CardContent>
                {taskStatusData.length === 0 ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label
                        onClick={(data) => setDrillDownType(data.status)}
                        style={{ cursor: "pointer" }}
                      >
                        {taskStatusData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Drill-down panel */}
            {drillDownType && (
              <Card className="md:col-span-2 border-primary/20 bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base capitalize">Tasks — {drillDownType.replace("_", " ")}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setDrillDownType(null)}>Close</Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Project</TableHead><TableHead>Priority</TableHead><TableHead>Due Date</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {getDrillDownTasks(drillDownType).slice(0, 20).map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.title}</TableCell>
                          <TableCell>{t.projects?.name || "—"}</TableCell>
                          <TableCell><Badge className={priorityColor(t.priority)} variant="secondary">{t.priority}</Badge></TableCell>
                          <TableCell>{formatDate(t.due_date)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {getDrillDownTasks(drillDownType).length > 20 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">Showing 20 of {getDrillDownTasks(drillDownType).length}</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="text-base">Issues by Category</CardTitle></CardHeader>
              <CardContent>
                {issueCategoryData.length === 0 ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart><Pie data={issueCategoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>{issueCategoryData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Attendance (Last 7 Days)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={attendanceByDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="Present" fill="hsl(142, 71%, 45%)" radius={[4,4,0,0]} /><Bar dataKey="Absent" fill="hsl(0, 72%, 51%)" radius={[4,4,0,0]} /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Project Comparison Tab */}
        <TabsContent value="comparison" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Project Completion Rate Comparison</CardTitle></CardHeader>
              <CardContent>
                {projectComparisonData.length === 0 ? <p className="text-center text-muted-foreground py-8">No projects</p> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectComparisonData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="Completion %" fill="hsl(220, 70%, 50%)" radius={[4,4,0,0]} /></BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">Budget Utilization by Project</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Project</TableHead><TableHead>Budget</TableHead><TableHead>Spent</TableHead>
                    <TableHead>Remaining</TableHead><TableHead>Utilization</TableHead><TableHead>Health</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {budgetData.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.fullName}</TableCell>
                        <TableCell>{formatCurrency(p.Budget)}</TableCell>
                        <TableCell>{formatCurrency(p.Spent)}</TableCell>
                        <TableCell>{formatCurrency(p.Remaining)}</TableCell>
                        <TableCell>{p.utilization}%</TableCell>
                        <TableCell>
                          {p.utilization > 90 ? (
                            <Badge className="bg-destructive/10 text-destructive" variant="secondary">Over Budget Risk</Badge>
                          ) : p.utilization > 70 ? (
                            <Badge className="bg-warning/10 text-warning" variant="secondary">Watch</Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success" variant="secondary">Healthy</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Workforce Trend (30 Days)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={attendanceTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} interval={4} /><YAxis fontSize={12} /><Tooltip /><Area type="monotone" dataKey="Workers" stroke="hsl(220, 70%, 50%)" fill="hsl(220, 70%, 50%)" fillOpacity={0.15} /></AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Issues per Project</CardTitle></CardHeader>
              <CardContent>
                {projectComparisonData.length === 0 ? <p className="text-center text-muted-foreground py-8">No data</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={projectComparisonData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="Open Issues" fill="hsl(0, 72%, 51%)" radius={[4,4,0,0]} /></BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="materials" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Stock Movement (Last 7 Days)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={consumptionByDay}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="Stock In" fill="hsl(142, 71%, 45%)" radius={[4,4,0,0]} /><Bar dataKey="Stock Out" fill="hsl(38, 92%, 50%)" radius={[4,4,0,0]} /></BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Top Consumed Materials</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const consumption = stockEntries.filter((s: any) => s.entry_type === "out");
                  const byMaterial: Record<string, { name: string; qty: number }> = {};
                  consumption.forEach((s: any) => {
                    const name = s.materials?.name || "Unknown";
                    if (!byMaterial[name]) byMaterial[name] = { name, qty: 0 };
                    byMaterial[name].qty += Number(s.quantity);
                  });
                  const data = Object.values(byMaterial).sort((a, b) => b.qty - a.qty).slice(0, 5);
                  if (data.length === 0) return <p className="text-center text-muted-foreground py-8">No consumption data</p>;
                  return (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" fontSize={12} /><YAxis dataKey="name" type="category" fontSize={12} width={100} /><Tooltip /><Bar dataKey="qty" fill="hsl(220, 70%, 50%)" radius={[0,4,4,0]} /></BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="labour" className="mt-4 space-y-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {
              // Build payroll data for PDF
              const workerMap: Record<string, any> = {};
              attendance.forEach((a: any) => {
                if (!workerMap[a.worker_id]) {
                  workerMap[a.worker_id] = { name: a.workers?.name || "—", trade: a.workers?.trade, daily_rate: a.workers?.daily_rate || 0, daysPresent: 0, daysHalf: 0, daysOvertime: 0, deductions: 0, grossPay: 0 };
                }
                const w = workerMap[a.worker_id];
                const rate = a.workers?.daily_rate || 0;
                if (a.status === "present") { w.daysPresent++; w.grossPay += rate; }
                if (a.status === "half_day") { w.daysHalf++; w.grossPay += rate / 2; }
                if (a.status === "overtime") { w.daysOvertime++; w.grossPay += rate + (a.overtime_hours * rate / 8); }
                w.deductions += Number(a.deduction) || 0;
              });
              exportPayrollPdf("Current Period", Object.values(workerMap));
            }}>
              <Download className="h-4 w-4" /> Export Payroll PDF
            </Button>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Payroll Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold mb-4">{formatCurrency(totalPayroll)}</p>
              <p className="text-sm text-muted-foreground">Based on {attendance.length} attendance records across all projects.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dpr" className="mt-4">
          <DailyProgressReport />
        </TabsContent>

        <TabsContent value="ai-dpr" className="mt-4">
          <AIReportGenerator />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <ComplianceChecker />
        </TabsContent>
      </Tabs>
    </div>
  );
}
