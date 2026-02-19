import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization, useAccessibleOrgs } from "@/hooks/useOrganization";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { useRole } from "@/hooks/useRole";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Plus, Search, MapPin, Calendar, IndianRupee, Pencil, Trash2, Building2 } from "lucide-react";
import { formatCurrency, formatDate, statusColor } from "@/lib/formatters";

const emptyForm = { name: "", description: "", location: "", client_name: "", start_date: "", end_date: "", budget: "", status: "active", organization_id: "" };

export default function Projects() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { data: accessibleOrgs = [] } = useAccessibleOrgs();
  const { data: members = [] } = useOrgMembers();
  const { can } = useRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const [form, setForm] = useState(emptyForm);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", orgId, accessibleOrgs.map(o => o.id)],
    queryFn: async () => {
      const orgIds = accessibleOrgs.map(o => o.id);
      if (!orgIds.length) return [];
      const { data, error } = await supabase.from("projects").select("*").in("organization_id", orgIds).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && accessibleOrgs.length > 0,
  });

  const saveProject = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description || null,
        location: form.location || null,
        client_name: form.client_name || null,
        status: form.status as any,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: form.budget ? parseFloat(form.budget) : 0,
      };
      if (editingProject) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editingProject.id);
        if (error) throw error;
      } else {
        const targetOrgId = form.organization_id || orgId!;
        const { error } = await supabase.from("projects").insert({ ...payload, organization_id: targetOrgId, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDialogOpen(false);
      setEditingProject(null);
      setForm(emptyForm);
      toast.success(editingProject ? "Project updated!" : "Project created!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteTarget(null);
      toast.success("Project deleted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setForm({
      name: project.name, description: project.description || "", location: project.location || "",
      client_name: project.client_name || "", start_date: project.start_date || "", end_date: project.end_date || "",
      budget: project.budget?.toString() || "", status: project.status, organization_id: project.organization_id || orgId || "",
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingProject(null);
    setForm({ ...emptyForm, organization_id: orgId || "" });
    setDialogOpen(true);
  };

  const getOrgName = (orgIdVal: string) => accessibleOrgs.find(o => o.id === orgIdVal)?.name || "";

  const filtered = projects.filter((p: any) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.location ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchOrg = orgFilter === "all" || p.organization_id === orgFilter;
    return matchSearch && matchStatus && matchOrg;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your construction projects</p>
        </div>
        {can("projects:create") && (
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Project</Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingProject(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveProject.mutate(); }} className="space-y-4">
            {accessibleOrgs.length > 1 && (
              <div className="space-y-2">
                <Label>Organization</Label>
                <Select value={form.organization_id} onValueChange={(v) => setForm({ ...form, organization_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>
                    {accessibleOrgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" />
                          {org.name}
                          {org.parent_organization_id && <Badge variant="outline" className="text-[10px] ml-1">Sub-org</Badge>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div className="space-y-2"><Label>Client Name</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Budget (₹)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saveProject.isPending}>
              {saveProject.isPending ? "Saving..." : editingProject ? "Update Project" : "Create Project"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This will also delete all related tasks, issues, and data.`}
        onConfirm={() => deleteProject.mutate(deleteTarget.id)}
        loading={deleteProject.isPending}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        {accessibleOrgs.length > 1 && (
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Organizations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {accessibleOrgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><p className="text-muted-foreground">No projects found. Create your first project!</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginated.map((project: any) => (
            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => navigate(`/projects/${project.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {can("projects:edit") && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => openEdit(project, e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {can("projects:delete") && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Badge className={statusColor(project.status)} variant="secondary">{(project.status ?? "active").replace("_", " ")}</Badge>
                  </div>
                </div>
                {project.client_name && <p className="text-sm text-muted-foreground">{project.client_name}</p>}
                {accessibleOrgs.length > 1 && getOrgName(project.organization_id) && (
                  <div className="flex items-center gap-1 mt-1">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{getOrgName(project.organization_id)}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {project.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{project.location}</div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />{formatDate(project.start_date)} — {formatDate(project.end_date)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm font-medium"><IndianRupee className="h-3.5 w-3.5" />{formatCurrency(project.budget)}</div>
                  <div className="text-sm text-muted-foreground">{project.progress ?? 0}% done</div>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${project.progress ?? 0}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} projects</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
