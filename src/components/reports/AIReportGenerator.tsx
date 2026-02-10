import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { exportDPRPdf } from "@/lib/pdf-export";
import { Sparkles, Download, FileText, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export function AIReportGenerator() {
  const { data: orgId } = useOrganization();
  const [selectedProject, setSelectedProject] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("organization_id", orgId!);
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const generateDPR = async () => {
    if (!selectedProject) { toast.error("Please select a project"); return; }
    setGenerating(true);

    try {
      const project = projects.find((p: any) => p.id === selectedProject);

      // Fetch all data for the selected date and project
      const [tasksRes, attendanceRes, issuesRes, stockRes] = await Promise.all([
        supabase.from("tasks").select("title, status, progress, priority").eq("project_id", selectedProject).eq("organization_id", orgId!),
        supabase.from("attendance").select("status, overtime_hours, workers(name, trade, daily_rate)").eq("project_id", selectedProject).eq("organization_id", orgId!).eq("date", reportDate),
        supabase.from("issues").select("title, severity, status, category").eq("project_id", selectedProject).eq("organization_id", orgId!),
        supabase.from("stock_entries").select("quantity, entry_type, materials(name, unit)").eq("project_id", selectedProject).eq("organization_id", orgId!),
      ]);

      const tasks = tasksRes.data || [];
      const attendance = attendanceRes.data || [];
      const issues = issuesRes.data || [];
      const stockMovements = stockRes.data || [];

      const present = attendance.filter((a: any) => a.status === "present" || a.status === "overtime").length;
      const absent = attendance.filter((a: any) => a.status === "absent").length;
      const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
      const inProgressTasks = tasks.filter((t: any) => t.status === "in_progress").length;
      const blockedTasks = tasks.filter((t: any) => t.status === "blocked").length;
      const openIssues = issues.filter((i: any) => i.status === "open" || i.status === "in_progress").length;
      const criticalIssues = issues.filter((i: any) => i.severity === "critical").length;

      // Generate AI-style report summary
      const avgProgress = tasks.length > 0 ? Math.round(tasks.reduce((s: number, t: any) => s + (t.progress || 0), 0) / tasks.length) : 0;

      let healthStatus = "GREEN";
      if (blockedTasks > 2 || criticalIssues > 0) healthStatus = "RED";
      else if (blockedTasks > 0 || openIssues > 3) healthStatus = "AMBER";

      const report = `
DAILY PROGRESS REPORT
=====================
Project: ${project?.name}
Date: ${formatDate(reportDate)}
Generated: ${new Date().toLocaleString()}

--- PROJECT HEALTH: ${healthStatus} ---

1. EXECUTIVE SUMMARY
   Overall Progress: ${avgProgress}% complete
   ${completedTasks} tasks completed | ${inProgressTasks} in progress | ${blockedTasks} blocked
   ${healthStatus === "GREEN" ? "Project is on track." : healthStatus === "AMBER" ? "Minor concerns - attention needed." : "Critical issues require immediate attention."}

2. WORKFORCE
   Total workforce on site: ${attendance.length}
   Present: ${present} | Absent: ${absent}
   Trades deployed: ${[...new Set(attendance.map((a: any) => a.workers?.trade).filter(Boolean))].join(", ") || "N/A"}

3. TASK UPDATES
${tasks.slice(0, 10).map((t: any) => `   - [${t.status.toUpperCase()}] ${t.title} (${t.progress || 0}% complete, Priority: ${t.priority})`).join("\n")}
${tasks.length > 10 ? `   ... and ${tasks.length - 10} more tasks` : ""}

4. ISSUES & RISKS
${openIssues > 0 ? issues.filter((i: any) => i.status === "open" || i.status === "in_progress").slice(0, 5).map((i: any) => `   ⚠ [${i.severity.toUpperCase()}] ${i.title} (${i.category})`).join("\n") : "   No open issues."}
${criticalIssues > 0 ? `\n   🔴 ${criticalIssues} CRITICAL issue(s) require immediate attention!` : ""}

5. MATERIAL MOVEMENT
   Stock In: ${stockMovements.filter((s: any) => s.entry_type === "in").length} entries
   Stock Out: ${stockMovements.filter((s: any) => s.entry_type === "out").length} entries

6. RECOMMENDATIONS
${blockedTasks > 0 ? "   - Resolve blocked tasks to maintain schedule." : ""}
${absent > present * 0.3 ? "   - High absenteeism detected. Coordinate with contractors." : ""}
${criticalIssues > 0 ? "   - Address critical issues immediately to prevent delays." : ""}
${avgProgress < 40 ? "   - Project progress is below target. Consider additional resources." : ""}
${blockedTasks === 0 && criticalIssues === 0 && avgProgress >= 40 ? "   - Project is progressing well. Continue current pace." : ""}
`.trim();

      setGeneratedReport(report);

      // Also make PDF export available
      toast.success("DPR generated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedProject) return;
    const project = projects.find((p: any) => p.id === selectedProject);

    const [tasksRes, attendanceRes, issuesRes, stockRes] = await Promise.all([
      supabase.from("tasks").select("title, status, progress").eq("project_id", selectedProject),
      supabase.from("attendance").select("status, overtime_hours, workers(name)").eq("project_id", selectedProject).eq("date", reportDate),
      supabase.from("issues").select("title, severity, status").eq("project_id", selectedProject),
      supabase.from("stock_entries").select("quantity, entry_type, materials(name)").eq("project_id", selectedProject),
    ]);

    exportDPRPdf({
      project,
      date: reportDate,
      tasks: tasksRes.data || [],
      attendance: attendanceRes.data || [],
      issues: issuesRes.data || [],
      stockMovements: stockRes.data || [],
    });
    toast.success("PDF exported!");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Daily Progress Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Report Date</Label>
              <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button onClick={generateDPR} disabled={generating || !selectedProject} className="gap-2">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? "Generating..." : "Generate DPR"}
                </Button>
                {generatedReport && (
                  <Button variant="outline" onClick={handleExportPdf} className="gap-2">
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {generatedReport && (
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 p-4 rounded-lg overflow-x-auto">
              {generatedReport}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
