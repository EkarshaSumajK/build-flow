import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/database";

/**
 * Invite a member to the organization via the create-team-member edge function.
 */
export async function inviteMember(orgId: string, email: string, role: AppRole) {
  const { data, error } = await supabase.functions.invoke("create-team-member", {
    body: {
      email,
      full_name: email.split("@")[0],
      role,
      organization_id: orgId,
    },
  });

  if (error) throw new Error(error.message || "Failed to invite member");
  if (data && !data.success) throw new Error(data.error || "Failed to invite member");

  return { status: "added" as const, userId: data?.user_id };
}

/**
 * Remove a member from the organization
 */
export async function removeMember(orgId: string, userId: string) {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", orgId);
  if (error) throw error;
}
