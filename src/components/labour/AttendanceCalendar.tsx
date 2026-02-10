import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Worker, Attendance, Project } from "@/types/database";
import { TablePagination } from "@/components/shared/TablePagination";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-success",
  absent: "bg-destructive",
  half_day: "bg-warning",
  overtime: "bg-primary",
};

const STATUS_LABELS: Record<string, string> = {
  present: "P",
  absent: "A",
  half_day: "½",
  overtime: "OT",
};

export function AttendanceCalendar() {
  const { data: orgId } = useOrganization();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-active", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!).eq("status", "active");
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

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance-calendar", orgId, selectedProject, days[0], days[29]],
    queryFn: async () => {
      let q = supabase
        .from("attendance")
        .select("worker_id, date, status")
        .eq("organization_id", orgId!)
        .gte("date", days[0])
        .lte("date", days[29]);
      if (selectedProject && selectedProject !== "all") q = q.eq("project_id", selectedProject);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Build lookup: workerId-date -> status
  const lookup = new Map<string, string>();
  attendance.forEach((a: Pick<Attendance, "worker_id" | "date" | "status">) => {
    lookup.set(`${a.worker_id}-${a.date}`, a.status);
  });

  // Pagination
  const totalPages = Math.ceil(workers.length / pageSize);
  const paginatedWorkers = workers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">30-Day Attendance Calendar</CardTitle>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-4 text-xs">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`h-3 w-3 rounded-sm ${color}`} />
              <span className="capitalize">{status.replace("_", " ")}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm bg-muted" />
            <span>No record</span>
          </div>
        </div>
        <ScrollArea className="w-full">
          <TooltipProvider delayDuration={100}>
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left font-medium p-1 pr-3 sticky left-0 bg-background z-10 min-w-[120px]">Worker</th>
                  {days.map((d) => {
                    const date = new Date(d);
                    return (
                      <th key={d} className="p-1 text-center font-normal text-muted-foreground min-w-[28px]">
                        <div>{date.getDate()}</div>
                        <div>{date.toLocaleDateString("en-IN", { month: "short" }).slice(0, 3)}</div>
                      </th>
                    );
                  })}
                  <th className="p-1 pl-3 text-center font-medium">P</th>
                  <th className="p-1 text-center font-medium">A</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWorkers.map((w) => {
                  let presentCount = 0;
                  let absentCount = 0;
                  days.forEach((d) => {
                    const s = lookup.get(`${w.id}-${d}`);
                    if (s === "present" || s === "overtime") presentCount++;
                    if (s === "absent") absentCount++;
                  });
                  return (
                    <tr key={w.id} className="border-t border-border/50">
                      <td className="p-1 pr-3 font-medium sticky left-0 bg-background z-10 truncate max-w-[120px]">{w.name}</td>
                      {days.map((d) => {
                        const status = lookup.get(`${w.id}-${d}`);
                        const color = status ? STATUS_COLORS[status] : "bg-muted/50";
                        const label = status ? STATUS_LABELS[status] : "";
                        return (
                          <td key={d} className="p-0.5 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`h-6 w-6 rounded-sm flex items-center justify-center text-[10px] font-medium ${color} ${status ? "text-white" : "text-muted-foreground"}`}>
                                  {label}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{w.name} — {d}</p>
                                <p className="capitalize">{status ? status.replace("_", " ") : "No record"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        );
                      })}
                      <td className="p-1 pl-3 text-center font-semibold text-success">{presentCount}</td>
                      <td className="p-1 text-center font-semibold text-destructive">{absentCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TooltipProvider>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        {workers.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={workers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
        {workers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No active workers found</p>
        )}
      </CardContent>
    </Card>
  );
}
