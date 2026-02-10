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
