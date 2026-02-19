import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useRole } from "@/hooks/useRole";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/shared/TablePagination";
import { toast } from "sonner";
import { Building2, Users, Shield, Save, UserPlus, Trash2, Loader2, Copy, Check, Network } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Database } from "@/integrations/supabase/types";
import { lazy, Suspense } from "react";

const SubOrganizations = lazy(() => import("@/components/settings/SubOrganizations"));

type AppRole = Database["public"]["Enums"]["app_role"];

export default function Settings() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { role: _role, isOwner, canManage } = useRole();
  const { data: members } = useOrgMembers();
  const queryClient = useQueryClient();

  const [orgName, setOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("site_engineer");
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [memberPage, setMemberPage] = useState(1);
  const memberPageSize = 10;

  const { data: org } = useQuery({
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

  // Sync org name when data loads
  if (org && orgName === "" && org.name) {
    setOrgName(org.name);
  }

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

  const updateOrg = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organizations")
        .update({ name: orgName })
        .eq("id", orgId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-details"] });
      toast.success("Organization updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
      queryClient.invalidateQueries({ queryKey: ["member-roles"] });
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
      queryClient.invalidateQueries({ queryKey: ["member-roles"] });
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      setRemovingMember(null);
      toast.success("Member removed from organization");
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
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      queryClient.invalidateQueries({ queryKey: ["member-roles"] });
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

  const getRoleForUser = (userId: string): AppRole => {
    const found = memberRoles?.find((r) => r.user_id === userId);
    return (found?.role as AppRole) || "site_engineer";
  };

  const roleLabel = (r: string) => {
    switch (r) {
      case "owner": return "Owner";
      case "project_manager": return "Project Manager";
      case "site_engineer": return "Site Engineer";
      default: return r;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your organization and team</p>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="sub-orgs" className="gap-2">
              <Network className="h-4 w-4" />
              Sub-Organizations
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization Details</CardTitle>
              <CardDescription>Update your organization's information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Your organization name"
                  disabled={!isOwner}
                />
              </div>
              {org && (
                <div className="space-y-2">
                  <Label>Organization ID</Label>
                  <Input value={org.slug} disabled className="bg-muted font-mono text-xs" />
                </div>
              )}
              {isOwner && (
                <>
                  <Separator />
                  <Button
                    onClick={() => updateOrg.mutate()}
                    disabled={updateOrg.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateOrg.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add Team Member
                </CardTitle>
                <CardDescription>Create a new account for a team member</CardDescription>
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
            description="This will remove the member from your organization. They will lose access to all data."
            onConfirm={() => removingMember && removeMember.mutate(removingMember)}
            loading={removeMember.isPending}
            destructive
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Team Members</CardTitle>
              <CardDescription>
                {members?.length || 0} members in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
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
                        <TableCell className="text-muted-foreground">
                          {member.phone || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{roleLabel(memberRole)}</Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isCurrentUser && !isMemberOwner && isOwner && (
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
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Roles & Permissions</CardTitle>
              <CardDescription>Overview of what each role can do</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  {
                    name: "Owner",
                    desc: "Full access to everything including organization settings, billing, and role management.",
                    color: "bg-destructive/10 text-destructive",
                  },
                  {
                    name: "Project Manager",
                    desc: "Can manage projects, tasks, materials, labour, vendors, billing, and generate reports. Cannot manage roles or organization settings.",
                    color: "bg-primary/10 text-primary",
                  },
                  {
                    name: "Site Engineer",
                    desc: "Can create/edit tasks and issues, request materials, mark attendance, manage drawings, documents, and checklists.",
                    color: "bg-success/10 text-[hsl(var(--success))]",
                  },
                ].map((r) => (
                  <div key={r.name} className="flex items-start gap-4">
                    <Badge className={`${r.color} border-0 mt-0.5`}>{r.name}</Badge>
                    <p className="text-sm text-muted-foreground">{r.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {isOwner && (
          <TabsContent value="sub-orgs" className="space-y-4">
            <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
              <SubOrganizations />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
