import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

export type AppPermission =
  | "projects:create"
  | "projects:edit"
  | "projects:delete"
  | "tasks:create"
  | "tasks:edit"
  | "tasks:delete"
  | "issues:create"
  | "issues:edit"
  | "issues:delete"
  | "materials:manage"
  | "materials:request"
  | "materials:approve"
  | "vendors:manage"
  | "workers:manage"
  | "attendance:mark"
  | "attendance:manage"
  | "billing:manage"
  | "billing:approve"
  | "petty_cash:create"
  | "petty_cash:delete"
  | "scheduling:manage"
  | "drawings:manage"
  | "documents:manage"
  | "checklists:manage"
  | "reports:view"
  | "reports:manage"
  | "roles:manage"
  | "settings:manage";

const ROLE_PERMISSIONS: Record<string, AppPermission[]> = {
  owner: [
    "projects:create", "projects:edit", "projects:delete",
    "tasks:create", "tasks:edit", "tasks:delete",
    "issues:create", "issues:edit", "issues:delete",
    "materials:manage", "materials:request", "materials:approve",
    "vendors:manage", "workers:manage",
    "attendance:mark", "attendance:manage",
    "billing:manage", "billing:approve",
    "petty_cash:create", "petty_cash:delete",
    "scheduling:manage", "drawings:manage", "documents:manage",
    "checklists:manage", "reports:view", "reports:manage",
    "roles:manage", "settings:manage",
  ],
  project_manager: [
    "projects:create", "projects:edit",
    "tasks:create", "tasks:edit", "tasks:delete",
    "issues:create", "issues:edit", "issues:delete",
    "materials:manage", "materials:request", "materials:approve",
    "vendors:manage", "workers:manage",
    "attendance:mark", "attendance:manage",
    "billing:manage",
    "petty_cash:create", "petty_cash:delete",
    "scheduling:manage", "drawings:manage", "documents:manage",
    "checklists:manage", "reports:view", "reports:manage",
  ],
  site_engineer: [
    "tasks:create", "tasks:edit",
    "issues:create", "issues:edit",
    "materials:request",
    "attendance:mark",
    "petty_cash:create",
    "drawings:manage", "documents:manage",
    "checklists:manage", "reports:view",
  ],
};

export function useRole() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();

  const { data: role, isLoading } = useQuery({
    queryKey: ["user-role", user?.id, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("organization_id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data?.role as string | null;
    },
    enabled: !!user && !!orgId,
  });

  const permissions = role ? (ROLE_PERMISSIONS[role] || []) : [];

  const can = (permission: AppPermission): boolean => {
    return permissions.includes(permission);
  };

  return {
    role: role ?? null,
    isOwner: role === "owner",
    isProjectManager: role === "project_manager",
    isSiteEngineer: role === "site_engineer",
    canManage: role === "owner" || role === "project_manager",
    can,
    permissions,
    isLoading,
  };
}
