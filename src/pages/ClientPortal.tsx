import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Copy, ExternalLink, Trash2, Link2 } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { TablePagination } from "@/components/shared/TablePagination";

const PERMISSION_OPTIONS = [
  { id: "progress", label: "Project Progress" },
  { id: "photos", label: "Photo Updates" },
  { id: "reports", label: "Reports" },
  { id: "billing", label: "Billing/RA Bills" },
  { id: "schedule", label: "Schedule" },
];

export default function ClientPortal() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const emptyForm = { project_id: "", client_name: "", client_email: "", permissions: ["progress", "photos", "reports"] };
  const [form, setForm] = useState(emptyForm);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name, client_name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ["client-portal-tokens", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_portal_tokens" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!orgId,
  });

  const createToken = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_portal_tokens" as any).insert({
        organization_id: orgId!,
        project_id: form.project_id,
        client_name: form.client_name,
        client_email: form.client_email || null,
        permissions: form.permissions,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-portal-tokens"] });
      setDialogOpen(false);
      setForm(emptyForm);
      toast.success("Portal link created!");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("client_portal_tokens" as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-portal-tokens"] });
      toast.success("Link updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteToken = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_portal_tokens" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-portal-tokens"] });
      toast.success("Link deleted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Portal link copied to clipboard!");
  };

  const getProjectName = (projectId: string) => {
    return projects.find((p: any) => p.id === projectId)?.name || "Unknown";
  };

  // Pagination
  const totalPages = Math.ceil(tokens.length / pageSize);
  const paginatedTokens = tokens.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const togglePermission = (perm: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Portal</h1>
          <p className="text-muted-foreground">Share read-only project views with clients & subcontractors</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Portal Link</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Portal Link</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createToken.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client/Subcontractor Name *</Label>
                <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSION_OPTIONS.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.permissions.includes(opt.id)}
                      onCheckedChange={() => togglePermission(opt.id)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createToken.isPending || !form.project_id || !form.client_name}>
              {createToken.isPending ? "Creating..." : "Create Portal Link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Active Links</p><p className="text-2xl font-bold">{tokens.filter((t: any) => t.is_active).length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Links</p><p className="text-2xl font-bold">{tokens.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Projects Shared</p><p className="text-2xl font-bold">{new Set(tokens.map((t: any) => t.project_id)).size}</p></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="hidden sm:table-cell">Permissions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : tokens.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                <Link2 className="mx-auto h-8 w-8 mb-2 opacity-40" />
                No portal links created yet
              </TableCell></TableRow>
            ) : paginatedTokens.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-medium">{t.client_name}</div>
                  {t.client_email && <div className="text-xs text-muted-foreground">{t.client_email}</div>}
                </TableCell>
                <TableCell>{getProjectName(t.project_id)}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(t.permissions as string[])?.map((p: string) => (
                      <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={t.is_active ? "bg-success/10 text-success cursor-pointer" : "bg-muted text-muted-foreground cursor-pointer"}
                    onClick={() => toggleActive.mutate({ id: t.id, is_active: !t.is_active })}
                  >
                    {t.is_active ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm">{formatDate(t.created_at)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyLink(t.token)} title="Copy link">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(`/portal/${t.token}`, "_blank")} title="Preview">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteToken.mutate(t.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {tokens.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={tokens.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        )}
      </Card>
    </div>
  );
}