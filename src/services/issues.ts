import { supabase } from "@/integrations/supabase/client";
import type { Issue } from "@/types/database";
import type { Database } from "@/integrations/supabase/types";

type IssueStatus = Database["public"]["Enums"]["issue_status"];
type IssueSeverity = Database["public"]["Enums"]["issue_severity"];

export interface IssueFilters {
  orgId: string;
  projectId?: string;
  status?: string;
  severity?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchIssues(filters: IssueFilters) {
  const { orgId, projectId, status, severity, page = 1, pageSize = 50 } = filters;

  let query = supabase
    .from("issues")
    .select("*, projects(name)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (projectId && projectId !== "all") query = query.eq("project_id", projectId);
  if (status && status !== "all") query = query.eq("status", status as IssueStatus);
  if (severity && severity !== "all") query = query.eq("severity", severity as IssueSeverity);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as unknown as (Issue & { projects: { name: string } | null })[], count: count ?? 0 };
}

export async function createIssue(orgId: string, payload: Partial<Issue>) {
  const { data, error } = await supabase
    .from("issues")
    .insert([{ ...payload, organization_id: orgId } as any])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateIssue(id: string, payload: Partial<Issue>) {
  const { error } = await supabase.from("issues").update(payload as any).eq("id", id);
  if (error) throw error;
}
