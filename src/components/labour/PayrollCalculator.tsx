import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { Download, Calculator } from "lucide-react";
import { TablePagination } from "@/components/shared/TablePagination";

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  return { start, end };
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function PayrollCalculator() {
  const { data: orgId } = useOrganization();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { start, end } = getMonthRange(selectedYear, selectedMonth);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-active", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("workers").select("*").eq("organization_id", orgId!).eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ["monthly-attendance", orgId, start, end, selectedProject],
    queryFn: async () => {
      let query = supabase
        .from("attendance")
        .select("*")
        .eq("organization_id", orgId!)
        .gte("date", start)
        .lte("date", end);
      if (selectedProject !== "all") query = query.eq("project_id", selectedProject);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Calculate per-worker payroll
  const payrollData = workers.map((worker: any) => {
    const workerAttendance = attendance.filter((a: any) => a.worker_id === worker.id);
    const rate = worker.daily_rate || 0;

    let presentDays = 0, halfDays = 0, overtimeDays = 0, absentDays = 0;
    let totalOvertimeHours = 0, totalDeductions = 0, grossPay = 0;

    workerAttendance.forEach((a: any) => {
      const ded = Number(a.deduction) || 0;
      totalDeductions += ded;
      switch (a.status) {
        case "present":
          presentDays++;
          grossPay += rate;
          break;
        case "half_day":
          halfDays++;
          grossPay += rate / 2;
          break;
        case "overtime":
          overtimeDays++;
          totalOvertimeHours += Number(a.overtime_hours) || 0;
          grossPay += rate + ((Number(a.overtime_hours) || 0) * rate / 8);
          break;
        case "absent":
          absentDays++;
          break;
      }
    });

    const netPay = grossPay - totalDeductions;
    const totalWorkingDays = presentDays + halfDays + overtimeDays;

    return {
      ...worker,
      presentDays,
      halfDays,
      overtimeDays,
      absentDays,
      totalWorkingDays,
      totalOvertimeHours,
      totalDeductions,
      grossPay,
      netPay,
    };
  }).filter(w => w.totalWorkingDays > 0 || w.absentDays > 0);

  // Pagination
  const totalPages = Math.ceil(payrollData.length / pageSize);
  const paginatedPayroll = payrollData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totals = payrollData.reduce(
    (acc, w) => ({
      grossPay: acc.grossPay + w.grossPay,
      deductions: acc.deductions + w.totalDeductions,
      netPay: acc.netPay + w.netPay,
      workers: acc.workers + 1,
    }),
    { grossPay: 0, deductions: 0, netPay: 0, workers: 0 }
  );

  const exportCSV = () => {
    const headers = ["Worker", "Trade", "Contractor", "Daily Rate", "Present", "Half Day", "Overtime", "Absent", "OT Hours", "Gross Pay", "Deductions", "Net Pay"];
    const rows = payrollData.map(w => [
      w.name, w.trade || "", w.contractor || "", w.daily_rate,
      w.presentDays, w.halfDays, w.overtimeDays, w.absentDays,
      w.totalOvertimeHours, w.grossPay.toFixed(0), w.totalDeductions.toFixed(0), w.netPay.toFixed(0),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${MONTHS[selectedMonth - 1]}-${selectedYear}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={payrollData.length === 0}>
          <Download className="mr-2 h-4 w-4" />Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Workers</p><p className="text-2xl font-bold">{totals.workers}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Gross Pay</p><p className="text-2xl font-bold">{formatCurrency(totals.grossPay)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Deductions</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totals.deductions)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Net Payable</p><p className="text-2xl font-bold text-success">{formatCurrency(totals.netPay)}</p></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead className="hidden sm:table-cell">Trade</TableHead>
              <TableHead className="hidden md:table-cell">Contractor</TableHead>
              <TableHead className="text-center">P</TableHead>
              <TableHead className="text-center">½</TableHead>
              <TableHead className="text-center">OT</TableHead>
              <TableHead className="text-center">A</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Gross</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Ded.</TableHead>
              <TableHead className="text-right">Net Pay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : payrollData.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                <Calculator className="mx-auto h-8 w-8 mb-2 opacity-40" />
                No attendance data for {MONTHS[selectedMonth - 1]} {selectedYear}
              </TableCell></TableRow>
            ) : paginatedPayroll.map((w) => (
              <TableRow key={w.id}>
                <TableCell>
                  <div className="font-medium">{w.name}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">{w.trade} • {formatCurrency(w.daily_rate)}/day</div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{w.trade || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{w.contractor || "—"}</TableCell>
                <TableCell className="text-center"><Badge variant="secondary" className="bg-success/10 text-success text-xs">{w.presentDays}</Badge></TableCell>
                <TableCell className="text-center"><Badge variant="secondary" className="bg-warning/10 text-warning text-xs">{w.halfDays}</Badge></TableCell>
                <TableCell className="text-center"><Badge variant="secondary" className="bg-primary/10 text-primary text-xs">{w.overtimeDays}</Badge></TableCell>
                <TableCell className="text-center"><Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">{w.absentDays}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-right">{formatCurrency(w.grossPay)}</TableCell>
                <TableCell className="hidden sm:table-cell text-right text-destructive">{w.totalDeductions > 0 ? `-${formatCurrency(w.totalDeductions)}` : "—"}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(w.netPay)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {payrollData.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={payrollData.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </Card>
    </div>
  );
}