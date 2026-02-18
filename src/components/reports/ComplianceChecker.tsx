import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";

interface ComplianceCheck {
  id: string;
  category: string;
  rule: string;
  status: "pass" | "fail" | "warning";
  details: string;
  severity: "critical" | "high" | "medium" | "low";
}

export function ComplianceChecker() {
  const { data: orgId } = useOrganization();
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [running, setRunning] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => { const { data, error } = await supabase.from("projects").select("*").eq("organization_id", orgId!); if (error) throw error; return data; },
    enabled: !!orgId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["compliance-tasks", orgId],
    queryFn: async () => { const { data, error } = await supabase.from("tasks").select("*").eq("organization_id", orgId!); if (error) throw error; return data; },
    enabled: !!orgId,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["compliance-issues", orgId],
    queryFn: async () => { const { data, error } = await supabase.from("issues").select("*").eq("organization_id", orgId!); if (error) throw error; return data; },
    enabled: !!orgId,
  });

  const { data: safetyIncidents = [] } = useQuery({
    queryKey: ["compliance-safety", orgId],
    queryFn: async () => { const { data, error } = await supabase.from("safety_incidents").select("*").eq("organization_id", orgId!); if (error) throw error; return data; },
    enabled: !!orgId,
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["compliance-checklists", orgId],
    queryFn: async () => { const { data, error } = await supabase.from("inspections").select("*").eq("organization_id", orgId!); if (error) throw error; return data; },
    enabled: !!orgId,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["compliance-workers", orgId],
    queryFn: async () => { const { data, error } = await supabase.from("workers").select("*").eq("organization_id", orgId!); if (error) throw error; return data; },
    enabled: !!orgId,
  });

  const runComplianceChecks = () => {
    setRunning(true);
    const results: ComplianceCheck[] = [];

    // 1. Project Budget Compliance
    projects.forEach((p: any) => {
      const budget = Number(p.budget) || 0;
      const spent = Number(p.spent) || 0;
      if (budget > 0 && spent > budget) {
        results.push({
          id: `budget-${p.id}`, category: "Budget", rule: "Projects must not exceed budget",
          status: "fail", details: `"${p.name}" is over budget by ${Math.round(((spent - budget) / budget) * 100)}%`, severity: "critical",
        });
      } else if (budget > 0 && spent > budget * 0.9) {
        results.push({
          id: `budget-warn-${p.id}`, category: "Budget", rule: "Budget utilization watch",
          status: "warning", details: `"${p.name}" is at ${Math.round((spent / budget) * 100)}% budget utilization`, severity: "high",
        });
      }
    });

    // 2. Safety Compliance
    const unresolvedSafety = safetyIncidents.filter((s: any) => s.status === "open" || s.status === "investigating");
    if (unresolvedSafety.length > 0) {
      results.push({
        id: "safety-unresolved", category: "Safety", rule: "All safety incidents must be resolved",
        status: "fail", details: `${unresolvedSafety.length} unresolved safety incident(s)`, severity: "critical",
      });
    } else {
      results.push({
        id: "safety-ok", category: "Safety", rule: "All safety incidents resolved",
        status: "pass", details: "No unresolved safety incidents", severity: "low",
      });
    }

    // 3. Critical Issues Check
    const criticalIssues = issues.filter((i: any) => i.severity === "critical" && i.status !== "closed");
    if (criticalIssues.length > 0) {
      results.push({
        id: "critical-issues", category: "Issues", rule: "No unresolved critical issues",
        status: "fail", details: `${criticalIssues.length} critical issue(s) still open`, severity: "critical",
      });
    } else {
      results.push({
        id: "critical-ok", category: "Issues", rule: "No unresolved critical issues",
        status: "pass", details: "All critical issues resolved", severity: "low",
      });
    }

    // 4. Overdue Tasks Check
    const overdueTasks = tasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed");
    if (overdueTasks.length > tasks.length * 0.2) {
      results.push({
        id: "overdue-tasks", category: "Schedule", rule: "Less than 20% tasks should be overdue",
        status: "fail", details: `${overdueTasks.length} of ${tasks.length} tasks are overdue (${Math.round((overdueTasks.length / tasks.length) * 100)}%)`, severity: "high",
      });
    } else if (overdueTasks.length > 0) {
      results.push({
        id: "overdue-warn", category: "Schedule", rule: "Task overdue monitoring",
        status: "warning", details: `${overdueTasks.length} task(s) are past due date`, severity: "medium",
      });
    } else {
      results.push({
        id: "schedule-ok", category: "Schedule", rule: "Tasks on schedule",
        status: "pass", details: "No overdue tasks", severity: "low",
      });
    }

    // 5. Checklist Completion
    const incompleteChecklists = checklists.filter((c: any) => c.status !== "completed");
    if (incompleteChecklists.length > 0) {
      results.push({
        id: "checklists", category: "Quality", rule: "All checklists should be completed regularly",
        status: "warning", details: `${incompleteChecklists.length} incomplete checklist(s)`, severity: "medium",
      });
    } else {
      results.push({
        id: "checklists-ok", category: "Quality", rule: "Checklists up to date",
        status: "pass", details: "All checklists completed", severity: "low",
      });
    }

    // 6. Worker Registration
    const workersWithoutPhone = workers.filter((w: any) => w.is_active && !w.phone);
    if (workersWithoutPhone.length > 0) {
      results.push({
        id: "worker-info", category: "Compliance", rule: "All active workers must have contact info",
        status: "warning", details: `${workersWithoutPhone.length} active worker(s) missing phone number`, severity: "medium",
      });
    }

    // 7. Project without end date
    const projectsNoEnd = projects.filter((p: any) => p.status === "active" && !p.end_date);
    if (projectsNoEnd.length > 0) {
      results.push({
        id: "project-dates", category: "Planning", rule: "Active projects should have end dates",
        status: "warning", details: `${projectsNoEnd.length} active project(s) without end date`, severity: "medium",
      });
    }

    setChecks(results);
    setRunning(false);
  };

  const passCount = checks.filter(c => c.status === "pass").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const warnCount = checks.filter(c => c.status === "warning").length;
  const score = checks.length > 0 ? Math.round((passCount / checks.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Automated Compliance Checker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Run automated checks against project management best practices, safety requirements, and budget compliance rules.
          </p>
          <Button onClick={runComplianceChecks} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {running ? "Running..." : "Run Compliance Check"}
          </Button>
        </CardContent>
      </Card>

      {checks.length > 0 && (
        <>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <Card><CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Compliance Score</p>
              <p className={`text-3xl font-bold ${score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive"}`}>{score}%</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Passed</p>
              <p className="text-2xl font-bold text-success">{passCount}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Warnings</p>
              <p className="text-2xl font-bold text-warning">{warnCount}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-destructive">{failCount}</p>
            </CardContent></Card>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.sort((a, b) => {
                  const order = { fail: 0, warning: 1, pass: 2 };
                  return order[a.status] - order[b.status];
                }).map((check) => (
                  <TableRow key={check.id}>
                    <TableCell>
                      {check.status === "pass" && <CheckCircle2 className="h-5 w-5 text-success" />}
                      {check.status === "warning" && <AlertTriangle className="h-5 w-5 text-warning" />}
                      {check.status === "fail" && <XCircle className="h-5 w-5 text-destructive" />}
                    </TableCell>
                    <TableCell className="font-medium">{check.category}</TableCell>
                    <TableCell className="text-sm">{check.rule}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{check.details}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        check.severity === "critical" ? "bg-destructive/10 text-destructive" :
                        check.severity === "high" ? "bg-warning/10 text-warning" :
                        check.severity === "medium" ? "bg-primary/10 text-primary" :
                        "bg-muted text-muted-foreground"
                      }>{check.severity}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
