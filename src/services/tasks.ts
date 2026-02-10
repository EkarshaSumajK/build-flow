import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/types/database";

export interface TaskFilters {
  orgId: string;
  projectId?: string;
  assigneeId?: string;
  status?: string;
  priority?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchTasks(filters: TaskFilters) {
  const { orgId, projectId, assigneeId, status, priority, page = 1, pageSize = 50 } = filters;

  let query = supabase
    .from("tasks")
    .select("*, projects(name), profiles(full_name)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (projectId && projectId !== "all") query = query.eq("project_id", projectId);
  if (assigneeId && assigneeId !== "all") query = query.eq("assignee_id", assigneeId);
  if (status && status !== "all") query = query.eq("status", status);
  if (priority && priority !== "all") query = query.eq("priority", priority);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as (Task & { projects: { name: string } | null; profiles: { full_name: string } | null })[], count: count ?? 0 };
}

export async function createTask(orgId: string, payload: Partial<Task>) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...payload, organization_id: orgId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, payload: Partial<Task>) {
  const { error } = await supabase.from("tasks").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
