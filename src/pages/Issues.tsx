import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CommentsSection } from "@/components/shared/CommentsSection";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { formatDate, statusColor, priorityColor } from "@/lib/formatters";
import { IssueAttachments } from "@/components/issues/IssueAttachments";
import { TablePagination } from "@/components/shared/TablePagination";

const DEFAULT_PAGE_SIZE = 10;

export default function Issues({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { data: members = [] } = useOrgMembers();
  const { can } = useRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const emptyForm = { title: "", description: "", category: "other", severity: "medium", project_id: projectId || "", due_date: "", assigned_to: "", attachments: [] as string[] };
  const [form, setForm] = useState(emptyForm);

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["issues", orgId, statusFilter, projectId],
    queryFn: async () => {
      let query = supabase.from("issues").select("*, projects(name)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (projectId) query = query.eq("project_id", projectId);
      if (statusFilter !== "all") query = query.eq("status", statusFilter as any);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !projectId,
  });

  const saveIssue = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        category: form.category as any,
        severity: form.severity as any,
        due_date: form.due_date || null,
        assigned_to: form.assigned_to || null,
        project_id: projectId || form.project_id,
        attachments: form.attachments,
      };
      if (editingIssue) {
        const { error } = await supabase.from("issues").update(payload).eq("id", editingIssue.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("issues").insert({ ...payload, organization_id: orgId!, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      setDialogOpen(false);
      setEditingIssue(null);
      setForm(emptyForm);
      toast.success(editingIssue ? "Issue updated!" : "Issue reported!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteIssue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("issues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      setDeleteTarget(null);
      toast.success("Issue deleted!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "resolved") update.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("issues").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["issues"] }); toast.success("Status updated!"); },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (issue: any) => {
    setEditingIssue(issue);
    setForm({ title: issue.title, description: issue.description || "", category: issue.category, severity: issue.severity, project_id: issue.project_id, due_date: issue.due_date || "", assigned_to: issue.assigned_to || "", attachments: issue.attachments || [] });
    setDialogOpen(true);
  };

  const getMemberName = (userId: string) => members.find((m) => m.user_id === userId)?.full_name || "—";

  const filtered = issues.filter((i: any) => i.title.toLowerCase().includes(search.toLowerCase()));
  
  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  const openCount = issues.filter((i: any) => i.status === "open").length;
  const inProgressCount = issues.filter((i: any) => i.status === "in_progress").length;
  const resolvedCount = issues.filter((i: any) => i.status === "resolved" || i.status === "closed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Issues</h1><p className="text-muted-foreground">Track and resolve site issues</p></div>
        {can("issues:create") && <Button onClick={() => { setEditingIssue(null); setForm(emptyForm); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />Report Issue</Button>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingIssue(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingIssue ? "Edit Issue" : "Report Issue"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveIssue.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            {!projectId && (
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safety">Safety</SelectItem><SelectItem value="quality">Quality</SelectItem>
                    <SelectItem value="delay">Delay</SelectItem><SelectItem value="material">Material</SelectItem>
                    <SelectItem value="labour">Labour</SelectItem><SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={form.assigned_to || "unassigned"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "unassigned" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((m) => (<SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Photos / Videos</Label>
              <IssueAttachments
                attachments={form.attachments}
                onChange={(a) => setForm({ ...form, attachments: a })}
                issueId={editingIssue?.id}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saveIssue.isPending}>{saveIssue.isPending ? "Saving..." : editingIssue ? "Update Issue" : "Report Issue"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)} title="Delete Issue" description={`Delete "${deleteTarget?.title}"?`} onConfirm={() => deleteIssue.mutate(deleteTarget.id)} loading={deleteIssue.isPending} />

      <Dialog open={!!selectedIssue} onOpenChange={(v) => !v && setSelectedIssue(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedIssue?.title}</DialogTitle></DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selectedIssue.description || "No description"}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge className={priorityColor(selectedIssue.severity)} variant="secondary">{selectedIssue.severity}</Badge>
                <Badge className={statusColor(selectedIssue.status)} variant="secondary">{selectedIssue.status.replace("_", " ")}</Badge>
                {selectedIssue.assigned_to && <Badge variant="outline">{getMemberName(selectedIssue.assigned_to)}</Badge>}
              </div>
              {selectedIssue.attachments?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Attachments</p>
                  <IssueAttachments attachments={selectedIssue.attachments} onChange={() => {}} readOnly />
                </div>
              )}
              <CommentsSection parentId={selectedIssue.id} parentType="issue" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold text-warning">{openCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">In Progress</p><p className="text-2xl font-bold text-primary">{inProgressCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold text-success">{resolvedCount}</p></CardContent></Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search issues..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <Card className="min-w-[700px] sm:min-w-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>{!projectId && <TableHead className="hidden sm:table-cell">Project</TableHead>}<TableHead className="hidden md:table-cell">Assigned To</TableHead>
                <TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Due</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No issues found</TableCell></TableRow>
              ) : paginatedData.map((issue: any) => (
                <TableRow key={issue.id} className="cursor-pointer" onClick={() => setSelectedIssue(issue)}>
                  <TableCell>
                    <div className="font-medium">{issue.title}</div>
                    {!projectId && <div className="text-xs text-muted-foreground sm:hidden">{issue.projects?.name}</div>}
                  </TableCell>
                  {!projectId && <TableCell className="hidden sm:table-cell">{issue.projects?.name}</TableCell>}
                  <TableCell className="hidden md:table-cell">{issue.assigned_to ? getMemberName(issue.assigned_to) : "—"}</TableCell>
                  <TableCell><Badge className={priorityColor(issue.severity)} variant="secondary">{issue.severity}</Badge></TableCell>
                  <TableCell>
                    <Select value={issue.status} onValueChange={(v) => updateStatus.mutate({ id: issue.id, status: v })}>
                      <SelectTrigger className="h-7 w-[110px] text-xs" onClick={(e) => e.stopPropagation()}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{formatDate(issue.due_date)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {can("issues:edit") && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(issue)}><Pencil className="h-3.5 w-3.5" /></Button>}
                      {can("issues:delete") && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(issue)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalItems > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
