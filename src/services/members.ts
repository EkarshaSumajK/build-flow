import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/database";

/**
 * Invite a member to the organization via email.
 * Creates a user_roles entry so when they sign up, they'll be auto-assigned.
 * If the user already exists with that email, links them directly.
 */
export async function inviteMember(orgId: string, email: string, role: AppRole) {
  // Check if a user with this email already exists in profiles
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", (
      await supabase.rpc("get_user_id_by_email", { email_arg: email })
    ).data)
    .maybeSingle();

  if (existingProfile) {
    // User exists - add them to the organization directly
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: existingProfile.user_id,
      organization_id: orgId,
      role,
    });
    if (roleError) {
      if (roleError.code === "23505") throw new Error("This user is already a member of your organization");
      throw roleError;
    }
    return { status: "added", userId: existingProfile.user_id };
  }

  // User doesn't exist - send an invite email via Supabase Auth
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { invited_org_id: orgId, invited_role: role },
    redirectTo: `${window.location.origin}/auth`,
  });

  // Fallback: if admin API isn't available, create a pending invite record
  if (error) {
    // Store as a pending invite that gets resolved on signup
    const { error: inviteError } = await supabase.from("pending_invites").insert({
      organization_id: orgId,
      email,
      role,
    });
    // If table doesn't exist, just inform user to share signup link
    if (inviteError) {
      throw new Error(`Could not send invite. Please ask ${email} to sign up and then add them from Team Members.`);
    }
    return { status: "pending_invite" };
  }

  return { status: "invited", userId: data?.user?.id };
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
