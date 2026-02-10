import React, { useMemo, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, statusColor, priorityColor } from "@/lib/formatters";
import { differenceInDays, addDays, format, startOfDay, isWeekend } from "date-fns";

interface Task {
  id: string;
  title: string;
  start_date: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  progress: number | null;
  assignee_id: string | null;
  projects?: { name: string } | null;
}

interface GanttChartProps {
  tasks: Task[];
  getMemberName: (userId: string) => string;
}

const STATUS_COLORS: Record<string, string> = {
  not_started: "hsl(var(--muted-foreground))",
  in_progress: "hsl(var(--primary))",
  completed: "hsl(var(--success, 142 71% 45%))",
  blocked: "hsl(var(--destructive))",
};

export function GanttChart({ tasks, getMemberName }: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter tasks that have at least a start_date or due_date
  const ganttTasks = useMemo(
    () =>
      tasks.filter((t) => t.start_date || t.due_date).sort((a, b) => {
        const aDate = a.start_date || a.due_date || "";
        const bDate = b.start_date || b.due_date || "";
        return aDate.localeCompare(bDate);
      }),
    [tasks]
  );

  // Calculate timeline range
  const { timelineStart, timelineEnd, days, totalDays } = useMemo(() => {
    if (ganttTasks.length === 0) {
      const today = startOfDay(new Date());
      const end = addDays(today, 30);
      const d = Array.from({ length: 31 }, (_, i) => addDays(today, i));
      return { timelineStart: today, timelineEnd: end, days: d, totalDays: 31 };
    }

    const dates = ganttTasks.flatMap((t) => [
      t.start_date ? new Date(t.start_date) : null,
      t.due_date ? new Date(t.due_date) : null,
    ]).filter(Boolean) as Date[];

    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Add padding
    const start = addDays(startOfDay(min), -3);
    const end = addDays(startOfDay(max), 7);
    const total = differenceInDays(end, start) + 1;
    const d = Array.from({ length: total }, (_, i) => addDays(start, i));

    return { timelineStart: start, timelineEnd: end, days: d, totalDays: total };
  }, [ganttTasks]);

  // Group days by month
  const months = useMemo(() => {
    const m: { label: string; span: number }[] = [];
    let currentMonth = "";
    for (const day of days) {
      const label = format(day, "MMM yyyy");
      if (label !== currentMonth) {
        m.push({ label, span: 1 });
        currentMonth = label;
      } else {
        m[m.length - 1].span++;
      }
    }
    return m;
  }, [days]);

  const DAY_WIDTH = 36;
  const ROW_HEIGHT = 40;
  const LABEL_WIDTH = 260;

  const getBarPosition = (task: Task) => {
    const start = task.start_date
      ? startOfDay(new Date(task.start_date))
      : task.due_date
      ? startOfDay(new Date(task.due_date))
      : timelineStart;

    const end = task.due_date
      ? startOfDay(new Date(task.due_date))
      : task.start_date
      ? addDays(startOfDay(new Date(task.start_date)), 1)
      : addDays(timelineStart, 1);

    const left = differenceInDays(start, timelineStart) * DAY_WIDTH;
    const width = Math.max((differenceInDays(end, start) + 1) * DAY_WIDTH - 4, DAY_WIDTH - 4);

    return { left, width };
  };

  const today = startOfDay(new Date());
  const todayOffset = differenceInDays(today, timelineStart) * DAY_WIDTH;

  if (ganttTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">No tasks with dates</p>
        <p className="text-sm">Add start/due dates to your tasks to see them on the Gantt chart</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="flex">
        {/* Left panel - task labels */}
        <div className="shrink-0 border-r bg-muted/30" style={{ width: LABEL_WIDTH }}>
          {/* Header rows for months + days */}
          <div className="h-[28px] border-b flex items-center px-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</span>
          </div>
          <div className="h-[28px] border-b" />

          {/* Task rows */}
          {ganttTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 px-3 border-b hover:bg-muted/50 transition-colors"
              style={{ height: ROW_HEIGHT }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {(task as any).projects?.name}
                  {task.assignee_id ? ` • ${getMemberName(task.assignee_id)}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Right panel - timeline */}
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
          <div style={{ width: totalDays * DAY_WIDTH, minWidth: "100%" }}>
            {/* Month headers */}
            <div className="flex h-[28px] border-b">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="border-r text-xs font-semibold text-muted-foreground flex items-center px-2"
                  style={{ width: m.span * DAY_WIDTH }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* Day headers */}
            <div className="flex h-[28px] border-b">
              {days.map((day, i) => (
                <div
                  key={i}
                  className={`border-r text-center text-[10px] flex flex-col items-center justify-center ${
                    isWeekend(day) ? "bg-muted/50 text-muted-foreground/60" : "text-muted-foreground"
                  } ${
                    format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
                      ? "bg-primary/10 text-primary font-bold"
                      : ""
                  }`}
                  style={{ width: DAY_WIDTH }}
                >
                  <span>{format(day, "d")}</span>
                </div>
              ))}
            </div>

            {/* Task bars */}
            <div className="relative">
              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays * DAY_WIDTH && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-primary z-10"
                  style={{ left: todayOffset + DAY_WIDTH / 2 }}
                />
              )}

              {/* Weekend shading + grid */}
              <div className="absolute inset-0 flex pointer-events-none">
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={`border-r ${isWeekend(day) ? "bg-muted/30" : ""}`}
                    style={{ width: DAY_WIDTH, height: ganttTasks.length * ROW_HEIGHT }}
                  />
                ))}
              </div>

              {/* Bars */}
              {ganttTasks.map((task, rowIndex) => {
                const { left, width } = getBarPosition(task);
                const progress = task.progress ?? 0;
                const barColor = STATUS_COLORS[task.status] || STATUS_COLORS.not_started;

                return (
                  <div
                    key={task.id}
                    className="relative border-b"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute top-[8px] rounded-md cursor-pointer transition-all hover:brightness-110 hover:shadow-md overflow-hidden"
                          style={{
                            left: left + 2,
                            width,
                            height: ROW_HEIGHT - 16,
                            backgroundColor: barColor,
                            opacity: 0.4,
                          }}
                        >
                          {/* Progress fill - darker shade on top of lighter background */}
                          {progress > 0 && (
                            <div
                              className="absolute inset-y-0 left-0 rounded-l-md"
                              style={{
                                width: `${Math.min(progress, 100)}%`,
                                backgroundColor: barColor,
                                opacity: 1,
                              }}
                            />
                          )}
                          {/* Label on bar */}
                          <div className="relative z-10 flex items-center h-full px-2">
                            <span className="text-[10px] font-medium text-white truncate drop-shadow-sm">
                              {task.title}
                            </span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px]">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">{task.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={statusColor(task.status)} variant="secondary">
                              {task.status.replace("_", " ")}
                            </Badge>
                            <Badge className={priorityColor(task.priority)} variant="secondary">
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(task.start_date)} → {formatDate(task.due_date)}
                          </p>
                          {progress > 0 && (
                            <p className="text-xs">Progress: {progress}%</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
