import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Plus, Loader2, Trash2, Users, FolderOpen, ChevronRight } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function SubOrganizations() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { isOwner } = useRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [newSubOrgName, setNewSubOrgName] = useState("");
  const [removingSubOrg, setRemovingSubOrg] = useState<string | null>(null);

  // Fetch parent org
  const { data: parentOrg } = useQuery({
    queryKey: ["org-details", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch parent org member count
  const { data: parentMemberCount } = useQuery({
    queryKey: ["parent-org-member-count", orgId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!orgId,
  });

  // Fetch parent org project count
  const { data: parentProjectCount } = useQuery({
    queryKey: ["parent-org-project-count", orgId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!orgId,
  });

  // Fetch child orgs
  const { data: childOrgs, isLoading } = useQuery({
    queryKey: ["child-orgs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("parent_organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch member counts per child org
  const { data: memberCounts } = useQuery({
    queryKey: ["child-org-member-counts", orgId, childOrgs?.map(o => o.id)],
    queryFn: async () => {
      if (!childOrgs?.length) return {};
      const counts: Record<string, number> = {};
      for (const org of childOrgs) {
        const { count, error } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id);
        if (!error) counts[org.id] = count || 0;
      }
      return counts;
    },
    enabled: !!childOrgs && childOrgs.length > 0,
  });

  // Fetch project counts per child org
  const { data: projectCounts } = useQuery({
    queryKey: ["child-org-project-counts", orgId, childOrgs?.map(o => o.id)],
    queryFn: async () => {
      if (!childOrgs?.length) return {};
      const counts: Record<string, number> = {};
      for (const org of childOrgs) {
        const { count, error } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id);
        if (!error) counts[org.id] = count || 0;
      }
      return counts;
    },
    enabled: !!childOrgs && childOrgs.length > 0,
  });

  const createSubOrg = useMutation({
    mutationFn: async () => {
      const slug =
        newSubOrgName.toLowerCase().replace(/[^a-z0-9]+/g, "-") +
        "-" +
        Math.floor(Date.now() / 1000);
      const { error } = await supabase.from("organizations").insert({
        name: newSubOrgName,
        slug,
        parent_organization_id: orgId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-orgs"] });
      setNewSubOrgName("");
      toast.success("Sub-organization created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSubOrg = useMutation({
    mutationFn: async (subOrgId: string) => {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", subOrgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-orgs"] });
      setRemovingSubOrg(null);
      toast.success("Sub-organization removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const OrgCard = ({ id, name, isParent, memberCount, projectCount }: {
    id: string;
    name: string;
    isParent: boolean;
    memberCount: number;
    projectCount: number;
  }) => (
    <div
      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/settings/org/${id}`)}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{name}</span>
            {isParent && <Badge variant="secondary" className="text-xs">Parent</Badge>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{memberCount} members</span>
            <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" />{projectCount} projects</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isParent && isOwner && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setRemovingSubOrg(id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Create sub-org */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Sub-Organization
            </CardTitle>
            <CardDescription>
              Create a child company under your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSubOrg.mutate();
              }}
              className="flex gap-3"
            >
              <div className="flex-1">
                <Label htmlFor="subOrgName" className="sr-only">Sub-Organization Name</Label>
                <Input
                  id="subOrgName"
                  placeholder="Sub-organization name"
                  value={newSubOrgName}
                  onChange={(e) => setNewSubOrgName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={createSubOrg.isPending} className="gap-2">
                {createSubOrg.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><Building2 className="h-4 w-4" /> Create</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!removingSubOrg}
        onOpenChange={(v) => { if (!v) setRemovingSubOrg(null); }}
        title="Delete Sub-Organization"
        description="This will permanently delete this sub-organization and all its data. This action cannot be undone."
        onConfirm={() => removingSubOrg && deleteSubOrg.mutate(removingSubOrg)}
        loading={deleteSubOrg.isPending}
        destructive
      />

      {/* Organizations list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organizations</CardTitle>
          <CardDescription>
            Click an organization to manage its members and view projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Parent org */}
          {parentOrg && (
            <OrgCard
              id={parentOrg.id}
              name={parentOrg.name}
              isParent
              memberCount={parentMemberCount || 0}
              projectCount={parentProjectCount || 0}
            />
          )}

          {/* Child orgs */}
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            childOrgs?.map((org) => (
              <OrgCard
                key={org.id}
                id={org.id}
                name={org.name}
                isParent={false}
                memberCount={memberCounts?.[org.id] ?? 0}
                projectCount={projectCounts?.[org.id] ?? 0}
              />
            ))
          )}

          {!isLoading && !childOrgs?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sub-organizations yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
