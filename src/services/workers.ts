import { supabase } from "@/integrations/supabase/client";
import type { Worker, Attendance } from "@/types/database";

export async function fetchWorkers(orgId: string) {
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data as Worker[];
}

export async function createWorker(orgId: string, payload: Partial<Worker>) {
  const { data, error } = await supabase
    .from("workers")
    .insert({ ...payload, organization_id: orgId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorker(id: string, payload: Partial<Worker>) {
  const { error } = await supabase.from("workers").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deactivateWorker(id: string) {
  const { error } = await supabase.from("workers").update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

export async function markAttendance(
  orgId: string,
  projectId: string,
  workerId: string,
  date: string,
  status: string,
  recordedBy: string,
  overtimeHours?: number,
  deduction?: number
) {
  const { error } = await supabase.from("attendance").upsert({
    organization_id: orgId,
    project_id: projectId,
    worker_id: workerId,
    date,
    status: status as any,
    overtime_hours: overtimeHours || 0,
    deduction: deduction || 0,
    recorded_by: recordedBy,
  }, { onConflict: "worker_id,date" });
  if (error) throw error;
}
