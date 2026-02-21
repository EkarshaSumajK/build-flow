import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Shield, Save, Loader2, Network } from "lucide-react";
import { lazy, Suspense } from "react";

const SubOrganizations = lazy(() => import("@/components/settings/SubOrganizations"));

export default function Settings() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { isOwner } = useRole();
  const queryClient = useQueryClient();

  const [orgName, setOrgName] = useState("");

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

  if (org && orgName === "" && org.name) {
    setOrgName(org.name);
  }

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
          <TabsTrigger value="orgs" className="gap-2">
            <Network className="h-4 w-4" />
            Organizations
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

        <TabsContent value="orgs" className="space-y-4">
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <SubOrganizations />
          </Suspense>
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
