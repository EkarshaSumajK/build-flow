import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/database";

export async function fetchProjects(orgId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Project[];
}

export async function fetchProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*, profiles(full_name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProject(orgId: string, userId: string, payload: Partial<Project>) {
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...payload, organization_id: orgId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, payload: Partial<Project>) {
  const { error } = await supabase.from("projects").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
