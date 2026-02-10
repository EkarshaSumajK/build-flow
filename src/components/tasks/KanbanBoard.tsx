import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { priorityColor, formatDate } from "@/lib/formatters";
import { GripVertical } from "lucide-react";

const COLUMNS = [
  { id: "not_started", label: "Not Started", color: "bg-muted" },
  { id: "in_progress", label: "In Progress", color: "bg-primary/10" },
  { id: "completed", label: "Completed", color: "bg-success/10" },
  { id: "blocked", label: "Blocked", color: "bg-destructive/10" },
] as const;

interface KanbanBoardProps {
  tasks: any[];
  getMemberName: (userId: string) => string;
}

export function KanbanBoard({ tasks, getMemberName }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      toast.success("Task moved!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t: any) => t.id === taskId);
    if (task && task.status !== columnId) {
      updateStatus.mutate({ id: taskId, status: columnId });
    }
    setDraggedTaskId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t: any) => t.status === col.id);
        const isOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            className={`rounded-lg border p-3 min-h-[300px] transition-colors ${
              isOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
            }`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                <h3 className="text-sm font-semibold">{col.label}</h3>
              </div>
              <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
            </div>

            <div className="space-y-2">
              {columnTasks.map((task: any) => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-grab active:cursor-grabbing shadow-soft transition-all hover:shadow-md ${
                    draggedTaskId === task.id ? "opacity-40 scale-95" : ""
                  }`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-sm font-medium leading-tight line-clamp-2">{task.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate pl-5">
                      {task.projects?.name}
                    </p>
                    <div className="flex items-center gap-1.5 pl-5 flex-wrap">
                      <Badge className={`${priorityColor(task.priority)} text-[10px] px-1.5 py-0`} variant="secondary">
                        {task.priority}
                      </Badge>
                      {task.assignee_id && (
                        <span className="text-[10px] text-muted-foreground">{getMemberName(task.assignee_id)}</span>
                      )}
                      {task.due_date && (
                        <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(task.due_date)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-md">
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
