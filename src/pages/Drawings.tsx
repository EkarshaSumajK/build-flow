import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate, statusColor } from "@/lib/formatters";
import { Plus, Upload, FileImage, Download, Trash2, Search, Eye } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TablePagination } from "@/components/shared/TablePagination";

const CATEGORIES = ["architectural", "structural", "electrical", "plumbing", "mechanical", "landscape", "interior", "other"];
const DEFAULT_PAGE_SIZE = 10;

// Check if file can be previewed in browser
const canPreview = (fileName: string | null) => {
  if (!fileName) return false;
  const name = fileName.toLowerCase();
  // Images
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return true;
  // PDFs
  if (name.endsWith(".pdf")) return true;
  return false;
};

export default function Drawings({ projectId }: { projectId?: string }) {
  const { data: orgId } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ title: "", drawing_number: "", category: "architectural", project_id: "", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewDrawing, setPreviewDrawing] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: drawings = [], isLoading } = useQuery({
    queryKey: ["drawings", orgId, projectId || selectedProject],
    queryFn: async () => {
      let q = supabase.from("drawings").select("*, projects(name)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      else if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let file_url = null;
      let file_name = null;
      let file_size = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${orgId}/${form.project_id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("drawings").upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("drawings").getPublicUrl(path);
        file_url = urlData.publicUrl;
        file_name = file.name;
        file_size = file.size;
      }
      const { error } = await supabase.from("drawings").insert({
        organization_id: orgId!,
        project_id: form.project_id,
        title: form.title,
        drawing_number: form.drawing_number || null,
        category: form.category,
        uploaded_by: user!.id,
        notes: form.notes || null,
        file_url,
        file_name,
        file_size,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drawings"] });
      setOpen(false);
      setForm({ title: "", drawing_number: "", category: "architectural", project_id: "", notes: "" });
      setFile(null);
      toast.success("Drawing uploaded successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Find the drawing to get file path for storage cleanup
      const drawing = drawings.find((d: any) => d.id === id);
      if (drawing?.file_url) {
        const url = new URL(drawing.file_url);
        const pathParts = url.pathname.split("/storage/v1/object/public/drawings/");
        if (pathParts[1]) {
          await supabase.storage.from("drawings").remove([decodeURIComponent(pathParts[1])]);
        }
      }
      const { error } = await supabase.from("drawings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drawings"] });
      setDeleteId(null);
      toast.success("Drawing deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = drawings.filter((d: any) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.drawing_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleFilterChange = () => setCurrentPage(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drawing Management</h1>
          <p className="text-muted-foreground">Manage project drawings and revisions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Upload Drawing</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Upload Drawing</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Project *</Label>
                <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Drawing Number</Label><Input value={form.drawing_number} onChange={e => setForm(p => ({ ...p, drawing_number: e.target.value }))} placeholder="e.g. ARCH-001" /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>File</Label><Input type="file" accept=".pdf,.png,.jpg,.jpeg,.dwg" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button className="w-full" disabled={!form.title || !form.project_id || createMutation.isPending} onClick={() => createMutation.mutate()}>
                <Upload className="mr-2 h-4 w-4" /> {createMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search drawings..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); handleFilterChange(); }} />
        </div>
        <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); handleFilterChange(); }}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Drawing #</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Project</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No drawings found</TableCell></TableRow>
                ) : paginatedData.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <span className="font-medium">{d.title}</span>
                          <div className="text-xs text-muted-foreground sm:hidden">{d.drawing_number} · {d.category}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{d.drawing_number || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="capitalize">{d.category}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell">{(d as any).projects?.name}</TableCell>
                    <TableCell><Badge variant="secondary">v{d.revision}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(d.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {d.file_url && canPreview(d.file_name) && (
                          <Button variant="ghost" size="icon" onClick={() => setPreviewDrawing(d)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {d.file_url && (
                          <Button variant="ghost" size="icon" asChild title="Download">
                            <a href={d.file_url} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => { if (!v) setDeleteId(null); }}
        title="Delete Drawing"
        description="This will permanently delete this drawing and its file. This cannot be undone."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        destructive
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewDrawing} onOpenChange={(v) => { if (!v) setPreviewDrawing(null); }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {previewDrawing?.title}
                  {previewDrawing?.drawing_number && (
                    <Badge variant="outline">{previewDrawing.drawing_number}</Badge>
                  )}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="capitalize">{previewDrawing?.category}</Badge>
                  <span className="text-sm text-muted-foreground">Rev {previewDrawing?.revision}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewDrawing?.file_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={previewDrawing.file_url} target="_blank" rel="noreferrer" download>
                      <Download className="h-4 w-4 mr-2" /> Download
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/30">
            {previewDrawing?.file_url && (
              /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewDrawing.file_name || "") ? (
                <div className="h-full flex items-center justify-center p-4 overflow-auto">
                  <img 
                    src={previewDrawing.file_url} 
                    alt={previewDrawing.title} 
                    className="max-w-full object-contain rounded-lg shadow-lg"
                    style={{ maxHeight: "calc(90vh - 120px)" }}
                  />
                </div>
              ) : previewDrawing.file_name?.endsWith(".pdf") ? (
                <iframe 
                  src={previewDrawing.file_url} 
                  className="w-full h-full border-0"
                  title={previewDrawing.title}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>Preview not available for this file type</p>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
