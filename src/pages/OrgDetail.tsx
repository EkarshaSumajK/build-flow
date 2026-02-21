import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/shared/TablePagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { ArrowLeft, UserPlus, Loader2, Trash2, Copy, Check, FolderOpen } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleLabel = (r: string) => {
  switch (r) {
    case "owner": return "Owner";
    case "project_manager": return "Project Manager";
    case "site_engineer": return "Site Engineer";
    default: return r;
  }
};

export default function OrgDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOwner } = useRole();
  const queryClient = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("site_engineer");
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [memberPage, setMemberPage] = useState(1);
  const memberPageSize = 10;

  // Fetch org details
  const { data: org } = useQuery({
    queryKey: ["org-detail", orgId],
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

  // Fetch members of this org
  const { data: members } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url, email, temp_password")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch member roles
  const { data: memberRoles } = useQuery({
    queryKey: ["member-roles", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch projects for this org
  const { data: projects } = useQuery({
    queryKey: ["org-projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, project_code, status")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const getRoleForUser = (userId: string): AppRole => {
    const found = memberRoles?.find((r) => r.user_id === userId);
    return (found?.role as AppRole) || "site_engineer";
  };

  const updateMemberRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId)
        .eq("organization_id", orgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-roles", orgId] });
      toast.success("Role updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("organization_id", orgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-roles", orgId] });
      queryClient.invalidateQueries({ queryKey: ["org-members", orgId] });
      setRemovingMember(null);
      toast.success("Member removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createMember = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          email: inviteEmail,
          full_name: inviteFullName,
          phone: invitePhone || null,
          role: inviteRole,
          organization_id: orgId,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create member");
      return data;
    },
    onSuccess: (data) => {
      setCreatedCredentials({ email: inviteEmail, password: data.temp_password });
      setInviteEmail("");
      setInviteFullName("");
      setInvitePhone("");
      setInviteRole("site_engineer");
      queryClient.invalidateQueries({ queryKey: ["org-members", orgId] });
      queryClient.invalidateQueries({ queryKey: ["member-roles", orgId] });
      toast.success("Team member created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyCredentials = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{org?.name || "Organization"}</h1>
          <p className="text-muted-foreground text-sm">
            {org?.parent_organization_id ? "Sub-organization" : "Parent organization"} · {members?.length || 0} members · {projects?.length || 0} projects
          </p>
        </div>
      </div>

      {/* Add Member */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Team Member
            </CardTitle>
            <CardDescription>Create a new account for this organization</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMember.mutate();
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <Input
                placeholder="Full name"
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <Input
                placeholder="Phone (optional)"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
              />
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_manager">Project Manager</SelectItem>
                  <SelectItem value="site_engineer">Site Engineer</SelectItem>
                </SelectContent>
              </Select>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createMember.isPending} className="gap-2">
                  {createMember.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                  ) : (
                    <><UserPlus className="h-4 w-4" /> Add Member</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Credentials Dialog */}
      <Dialog open={!!createdCredentials} onOpenChange={(open) => { if (!open) setCreatedCredentials(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team Member Created</DialogTitle>
            <DialogDescription>
              Share these login credentials with the new team member. The password cannot be retrieved later.
            </DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4 font-mono text-sm space-y-1">
                <p><span className="text-muted-foreground">Email:</span> {createdCredentials.email}</p>
                <p><span className="text-muted-foreground">Password:</span> {createdCredentials.password}</p>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={copyCredentials}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Credentials"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove member confirmation */}
      <ConfirmDialog
        open={!!removingMember}
        onOpenChange={(v) => { if (!v) setRemovingMember(null); }}
        title="Remove Member"
        description="This will remove the member from this organization. They will lose access to all data."
        onConfirm={() => removingMember && removeMember.mutate(removingMember)}
        loading={removeMember.isPending}
        destructive
      />

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
          <CardDescription>{members?.length || 0} members</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Role</TableHead>
                {isOwner && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members
                ?.slice((memberPage - 1) * memberPageSize, memberPage * memberPageSize)
                .map((member) => {
                  const memberRole = getRoleForUser(member.user_id);
                  const isCurrentUser = member.user_id === user?.id;
                  const isMemberOwner = memberRole === "owner";
                  return (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.full_name}</span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {member.email || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {member.temp_password || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{roleLabel(memberRole)}</Badge>
                      </TableCell>
                      {isOwner && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isCurrentUser && !isMemberOwner && (
                              <>
                                <Select
                                  value={memberRole}
                                  onValueChange={(v) =>
                                    updateMemberRole.mutate({
                                      userId: member.user_id,
                                      newRole: v as AppRole,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="project_manager">Project Manager</SelectItem>
                                    <SelectItem value="site_engineer">Site Engineer</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => setRemovingMember(member.user_id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          {(members?.length || 0) > memberPageSize && (
            <TablePagination
              currentPage={memberPage}
              totalPages={Math.ceil((members?.length || 0) / memberPageSize)}
              totalItems={members?.length || 0}
              pageSize={memberPageSize}
              onPageChange={setMemberPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Projects</CardTitle>
          <CardDescription>{projects?.length || 0} projects in this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {!projects?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">No projects yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/projects/${p.project_code}`)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{p.project_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.status}</Badge>
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
