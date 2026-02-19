import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, Plus, Loader2, Trash2, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export default function SubOrganizations() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const queryClient = useQueryClient();

  const [newSubOrgName, setNewSubOrgName] = useState("");
  const [removingSubOrg, setRemovingSubOrg] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      {/* Create sub-org */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Sub-Organization
          </CardTitle>
          <CardDescription>
            Create a child company that operates under your organization. You'll have full access to their data.
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

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!removingSubOrg}
        onOpenChange={(v) => { if (!v) setRemovingSubOrg(null); }}
        title="Delete Sub-Organization"
        description="This will permanently delete this sub-organization and all its data (projects, tasks, materials, etc.). This action cannot be undone."
        onConfirm={() => removingSubOrg && deleteSubOrg.mutate(removingSubOrg)}
        loading={deleteSubOrg.isPending}
        destructive
      />

      {/* List child orgs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sub-Organizations</CardTitle>
          <CardDescription>
            {childOrgs?.length || 0} sub-organization{(childOrgs?.length || 0) !== 1 ? "s" : ""} under your company
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !childOrgs?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sub-organizations yet. Create one above to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {childOrgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {org.slug}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {memberCounts?.[org.id] ?? 0}
                      </div>
                    </TableCell>
                    <TableCell>{projectCounts?.[org.id] ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setRemovingSubOrg(org.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
