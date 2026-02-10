import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer, Calendar } from "lucide-react";
import { formatCurrency, formatDate, statusColor, priorityColor } from "@/lib/formatters";
import { TablePagination } from "@/components/shared/TablePagination";

export function DailyProgressReport() {
  const { data: orgId } = useOrganization();
  const { data: members = [] } = useOrgMembers();
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [tasksPage, setTasksPage] = useState(1);
  const [issuesPage, setIssuesPage] = useState(1);
  const [materialsPage, setMaterialsPage] = useState(1);
  const [pageSize] = useState(10);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["dpr-tasks", orgId, selectedProject, reportDate],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*, projects(name)").eq("organization_id", orgId!);
      if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      // Tasks updated on this date or still active
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["dpr-issues", orgId, selectedProject, reportDate],
    queryFn: async () => {
      let q = supabase.from("issues").select("*, projects(name)").eq("organization_id", orgId!);
      if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["dpr-attendance", orgId, selectedProject, reportDate],
    queryFn: async () => {
      let q = supabase.from("attendance").select("*, workers(name, trade, daily_rate)").eq("organization_id", orgId!).eq("date", reportDate);
      if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: stockEntries = [] } = useQuery({
    queryKey: ["dpr-stock", orgId, selectedProject, reportDate],
    queryFn: async () => {
      let q = supabase.from("stock_entries").select("*, materials(name, unit)").eq("organization_id", orgId!);
      if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      q = q.gte("recorded_at", `${reportDate}T00:00:00`).lte("recorded_at", `${reportDate}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const getMemberName = (id: string) => members.find((m) => m.user_id === id)?.full_name || "—";

  const totalPresent = attendance.filter((a: any) => a.status === "present" || a.status === "overtime").length;
  const totalAbsent = attendance.filter((a: any) => a.status === "absent").length;
  const totalPayroll = attendance.reduce((sum: number, a: any) => {
    const rate = a.workers?.daily_rate || 0;
    const ded = Number(a.deduction) || 0;
    if (a.status === "present") return sum + rate - ded;
    if (a.status === "half_day") return sum + rate / 2 - ded;
    if (a.status === "overtime") return sum + rate + (a.overtime_hours * rate / 8) - ded;
    return sum;
  }, 0);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>DPR — ${reportDate}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; font-size: 13px; color: #1a1a1a; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 15px; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; font-weight: 600; }
        .stats { display: flex; gap: 24px; margin: 12px 0; }
        .stat { padding: 8px 12px; background: #f5f5f5; border-radius: 6px; }
        .stat-label { font-size: 11px; color: #666; }
        .stat-value { font-size: 18px; font-weight: 700; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const projectName = selectedProject === "all"
    ? "All Projects"
    : projects.find((p: any) => p.id === selectedProject)?.name || "";

  const activeTasks = tasks.filter((t: any) => t.status === "in_progress");
  const completedToday = tasks.filter((t: any) => t.status === "completed" && t.updated_at?.split("T")[0] === reportDate);
  const blockedTasks = tasks.filter((t: any) => t.status === "blocked");
  const openIssues = issues.filter((i: any) => i.status === "open" || i.status === "in_progress");

  // Pagination for UI only (not PDF)
  const paginatedActiveTasks = activeTasks.slice((tasksPage - 1) * pageSize, tasksPage * pageSize);
  const activeTasksTotalPages = Math.ceil(activeTasks.length / pageSize);
  const paginatedOpenIssues = openIssues.slice((issuesPage - 1) * pageSize, issuesPage * pageSize);
  const openIssuesTotalPages = Math.ceil(openIssues.length / pageSize);
  const paginatedStockEntries = stockEntries.slice((materialsPage - 1) * pageSize, materialsPage * pageSize);
  const stockEntriesTotalPages = Math.ceil(stockEntries.length / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-[180px]" />
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />Print DPR
        </Button>
      </div>

      <div ref={printRef}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Progress Report</CardTitle>
            <p className="text-sm text-muted-foreground">{formatDate(reportDate)} • {projectName}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Active Tasks</p>
                <p className="text-xl font-bold">{activeTasks.length}</p>
              </div>
              <div className="rounded-lg bg-success/10 p-3">
                <p className="text-xs text-muted-foreground">Completed Today</p>
                <p className="text-xl font-bold text-success">{completedToday.length}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-xs text-muted-foreground">Open Issues</p>
                <p className="text-xl font-bold text-destructive">{openIssues.length}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground">Workers Present</p>
                <p className="text-xl font-bold">{totalPresent}</p>
              </div>
            </div>

            {/* Active Tasks */}
            <div>
              <h3 className="font-semibold mb-2">Tasks In Progress ({activeTasks.length})</h3>
              {activeTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks in progress</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Task</TableHead><TableHead>Project</TableHead><TableHead>Priority</TableHead><TableHead>Assignee</TableHead><TableHead>Progress</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedActiveTasks.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.title}</TableCell>
                          <TableCell>{(t as any).projects?.name}</TableCell>
                          <TableCell><Badge className={priorityColor(t.priority)} variant="secondary">{t.priority}</Badge></TableCell>
                          <TableCell>{t.assignee_id ? getMemberName(t.assignee_id) : "—"}</TableCell>
                          <TableCell>{t.progress || 0}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {activeTasks.length > pageSize && (
                    <div className="print:hidden">
                      <TablePagination
                        currentPage={tasksPage}
                        totalPages={activeTasksTotalPages}
                        totalItems={activeTasks.length}
                        pageSize={pageSize}
                        onPageChange={setTasksPage}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Blocked Tasks */}
            {blockedTasks.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-destructive">Blocked Tasks ({blockedTasks.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Task</TableHead><TableHead>Project</TableHead><TableHead>Assignee</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedTasks.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.title}</TableCell>
                        <TableCell>{(t as any).projects?.name}</TableCell>
                        <TableCell>{t.assignee_id ? getMemberName(t.assignee_id) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Open Issues */}
            {openIssues.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Open Issues ({openIssues.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Issue</TableHead><TableHead>Category</TableHead><TableHead>Severity</TableHead><TableHead>Assigned To</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOpenIssues.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.title}</TableCell>
                        <TableCell className="capitalize">{i.category}</TableCell>
                        <TableCell><Badge className={priorityColor(i.severity)} variant="secondary">{i.severity}</Badge></TableCell>
                        <TableCell>{i.assigned_to ? getMemberName(i.assigned_to) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {openIssues.length > pageSize && (
                  <div className="print:hidden">
                    <TablePagination
                      currentPage={issuesPage}
                      totalPages={openIssuesTotalPages}
                      totalItems={openIssues.length}
                      pageSize={pageSize}
                      onPageChange={setIssuesPage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Attendance */}
            <div>
              <h3 className="font-semibold mb-2">Workforce Summary</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="rounded-lg bg-success/10 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Present</p>
                  <p className="font-bold text-success">{totalPresent}</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-2 text-center">
                  <p className="text-xs text-muted-foreground">Absent</p>
                  <p className="font-bold text-destructive">{totalAbsent}</p>
                </div>
                <div className="rounded-lg bg-muted p-2 text-center">
                  <p className="text-xs text-muted-foreground">Day's Payroll</p>
                  <p className="font-bold">{formatCurrency(totalPayroll)}</p>
                </div>
              </div>
            </div>

            {/* Material Movement */}
            {stockEntries.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Material Movement ({stockEntries.length})</h3>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Material</TableHead><TableHead>Type</TableHead><TableHead>Quantity</TableHead><TableHead>Notes</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStockEntries.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.materials?.name}</TableCell>
                        <TableCell><Badge variant="secondary" className={s.entry_type === "in" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{s.entry_type === "in" ? "Stock In" : "Stock Out"}</Badge></TableCell>
                        <TableCell>{s.quantity} {s.materials?.unit}</TableCell>
                        <TableCell>{s.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {stockEntries.length > pageSize && (
                  <div className="print:hidden">
                    <TablePagination
                      currentPage={materialsPage}
                      totalPages={stockEntriesTotalPages}
                      totalItems={stockEntries.length}
                      pageSize={pageSize}
                      onPageChange={setMaterialsPage}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
