import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export function useOrgMembers() {
  const { data: orgId } = useOrganization();

  return useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      // Fetch members from user's own org + all accessible child orgs
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id");
      
      if (!orgs?.length) return [];

      const orgIds = orgs.map(o => o.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url, email, temp_password, organization_id")
        .in("organization_id", orgIds);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}
