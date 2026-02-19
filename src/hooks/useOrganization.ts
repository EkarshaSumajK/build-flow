import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useOrganization() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["organization", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.organization_id as string | null;
    },
    enabled: !!user,
  });
}

/** Returns all org IDs the current user can access (own + child orgs if owner) */
export function useAccessibleOrgs() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();

  return useQuery({
    queryKey: ["accessible-orgs", user?.id, orgId],
    queryFn: async () => {
      // Get user's own org + any child orgs they can access
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, parent_organization_id")
        .order("name");
      if (error) throw error;
      // RLS already filters to accessible orgs only
      return data;
    },
    enabled: !!user && !!orgId,
  });
}
