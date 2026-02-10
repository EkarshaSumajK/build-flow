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
import { toast } from "sonner";
import { Building2, Users, Shield, Save, UserPlus, Mail, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export default function Settings() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { role, isOwner, canManage } = useRole();
  const { data: members } = useOrgMembers();
  const queryClient = useQueryClient();

  const [orgName, setOrgName] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("site_engineer");
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  
  // Create member state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    role: "site_engineer" as AppRole,
  });
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

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

  const inviteMember = useMutation({
    mutationFn: async () => {
      if (!inviteEmail) throw new Error("Email is required");
      // Try to find existing user by looking up profiles
      // If user exists, add them; otherwise, they need to sign up first
      const { error } = await supabase.from("user_roles").insert({
        user_id: crypto.randomUUID(), // placeholder - will be resolved
        organization_id: orgId!,
        role: inviteRole,
      });
      // Since we can't directly invite via client-side admin API,
      // we'll create an invite record and use magic link approach
      if (error) {
        // Fallback: inform user to share signup link
        toast.success(`Invite noted! Ask ${inviteEmail} to sign up at ${window.location.origin}/auth, then assign their role from Team Members.`);
        setInviteDialogOpen(false);
        setInviteEmail("");
        return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-roles"] });
      setInviteDialogOpen(false);
      setInviteEmail("");
    },
    onError: () => {
      // Show the friendly message instead of error
      toast.success(`Share this link with ${inviteEmail}: ${window.location.origin}/auth — they can sign up and join your organization.`);
      setInviteDialogOpen(false);
      setInviteEmail("");
    },
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
          email: createForm.email,
          full_name: createForm.full_name,
          phone: createForm.phone || null,
          role: createForm.role,
          organization_id: orgId,
          created_by: user?.id,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to create member");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["member-roles"] });
      queryClient.invalidateQueries({ queryKey: ["org-members"] });
      setCreatedPassword(data.default_password || "Test@123");
      toast.success("Team member created successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
            <div className="flex justify-end gap-2">
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" /> Create Member
              </Button>
              <Button variant="outline" onClick={() => setInviteDialogOpen(true)} className="gap-2">
                <Mail className="h-4 w-4" /> Invite Existing
              </Button>
            </div>
          )}

          {/* Create Member Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={(v) => {
            setCreateDialogOpen(v);
            if (!v) {
              setCreateForm({ email: "", full_name: "", phone: "", role: "site_engineer" });
              setCreatedPassword(null);
            }
          }}>
            <DialogContent>
              <DialogHeader><DialogTitle>{createdPassword ? "Member Created!" : "Create Team Member"}</DialogTitle></DialogHeader>
              {createdPassword ? (
                <div className="space-y-4">
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Account created for</p>
                    <p className="font-semibold">{createForm.full_name}</p>
                    <p className="text-sm text-muted-foreground">{createForm.email}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">Default Password</p>
                    <div className="flex items-center gap-2">
                      <code className="text-lg font-mono font-bold">{createdPassword}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(createdPassword);
                          toast.success("Password copied!");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Share these credentials securely. The user should change their password after first login.
                    </p>
                  </div>
                  <Button className="w-full" onClick={() => {
                    setCreateDialogOpen(false);
                    setCreateForm({ email: "", full_name: "", phone: "", role: "site_engineer" });
                    setCreatedPassword(null);
                  }}>
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); createMember.mutate(); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="createName">Full Name *</Label>
                    <Input
                      id="createName"
                      value={createForm.full_name}
                      onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="createEmail">Email *</Label>
                    <Input
                      id="createEmail"
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="john@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="createPhone">Phone</Label>
                    <Input
                      id="createPhone"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v as AppRole })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                        <SelectItem value="site_engineer">Site Engineer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                    <p>A new account will be created with default password: <strong>Test@123</strong></p>
                    <p className="mt-1">The user can login immediately and should change their password.</p>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={createMember.isPending}>
                    {createMember.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
                    ) : (
                      <><UserPlus className="h-4 w-4" /> Create Account</>
                    )}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* Invite Dialog */}
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project_manager">Project Manager</SelectItem>
                      <SelectItem value="site_engineer">Site Engineer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                  <p>The invited member will need to sign up at <strong>{window.location.origin}/auth</strong>.</p>
                  <p className="mt-1">After they sign up, you can assign their role from this page.</p>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    if (!inviteEmail) { toast.error("Email is required"); return; }
                    navigator.clipboard.writeText(`${window.location.origin}/auth`);
                    toast.success(`Signup link copied! Share it with ${inviteEmail}. Assign their role after they join.`);
                    setInviteDialogOpen(false);
                    setInviteEmail("");
                  }}
                >
                  <Mail className="h-4 w-4" /> Copy Invite Link
                </Button>
              </div>
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
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.map((member) => {
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
      </Tabs>
    </div>
  );
}
