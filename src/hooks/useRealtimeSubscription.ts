import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

type TableName = "tasks" | "issues" | "notifications" | "attendance" | "projects" | "material_requests" | "chat_messages";

/**
 * Subscribe to real-time changes on a table and auto-invalidate React Query cache.
 * Use this hook in components that need live updates.
 */
export function useRealtimeSubscription(
  table: TableName,
  queryKeys: string[][],
  options?: { events?: ("INSERT" | "UPDATE" | "DELETE")[]; enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const { data: orgId } = useOrganization();
  const events = options?.events || ["INSERT", "UPDATE", "DELETE"];
  const enabled = options?.enabled !== false && !!orgId;

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`realtime-${table}-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          if (events.includes(payload.eventType as any)) {
            queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, orgId, table, queryClient, JSON.stringify(queryKeys), JSON.stringify(events)]);
}
