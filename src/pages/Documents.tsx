import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatters";
import { Plus, Upload, FileText, Download, Trash2, Search, Folder, File, Eye, X } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TablePagination } from "@/components/shared/TablePagination";

const FOLDERS = ["General", "Contracts", "Permits", "Reports", "Correspondence", "BOQ", "Specifications", "Other"];
const DEFAULT_PAGE_SIZE = 10;

// Check if file can be previewed in browser
const canPreview = (fileType: string | null, fileName: string | null) => {
  if (!fileType && !fileName) return false;
  const type = fileType?.toLowerCase() || "";
  const name = fileName?.toLowerCase() || "";
  // Images
  if (type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return true;
  // PDFs
  if (type === "application/pdf" || name.endsWith(".pdf")) return true;
  // Text files
  if (type.startsWith("text/") || /\.(txt|md|json|xml|csv)$/i.test(name)) return true;
  return false;
};

export default function Documents({ projectId }: { projectId?: string }) {
  const { data: orgId } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ title: "", project_id: "", folder: "General", notes: "" });
  const [file, setFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("organization_id", orgId!);
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", orgId, selectedProject, selectedFolder],
    queryFn: async () => {
      let q = supabase.from("documents").select("*, projects(name)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (selectedProject !== "all") q = q.eq("project_id", selectedProject);
      if (selectedFolder !== "all") q = q.eq("folder", selectedFolder);
      const { data, error } = await q; if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let file_url = null, file_name = null, file_type = null, file_size = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${orgId}/${form.project_id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
        file_url = urlData.publicUrl;
        file_name = file.name;
        file_type = file.type;
        file_size = file.size;
      }
      const { error } = await supabase.from("documents").insert({
        organization_id: orgId!, project_id: form.project_id,
        title: form.title, folder: form.folder,
        uploaded_by: user!.id, notes: form.notes || null,
        file_url, file_name, file_type, file_size,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      setOpen(false);
      setForm({ title: "", project_id: "", folder: "General", notes: "" });
      setFile(null);
      toast.success("Document uploaded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Cleanup storage file
      const doc = documents.find((d: any) => d.id === id);
      if (doc?.file_url) {
        const url = new URL(doc.file_url);
        const pathParts = url.pathname.split("/storage/v1/object/public/documents/");
        if (pathParts[1]) {
          await supabase.storage.from("documents").remove([decodeURIComponent(pathParts[1])]);
        }
      }
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      setDeleteId(null);
      toast.success("Document deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = documents.filter((d: any) => d.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedData = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset to page 1 when filters change
  const handleFilterChange = () => setCurrentPage(1);

  const folderCounts = FOLDERS.reduce((acc, f) => {
    acc[f] = documents.filter((d: any) => d.folder === f).length;
    return acc;
  }, {} as Record<string, number>);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Document Management</h1><p className="text-muted-foreground">Organize and manage project documents</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Upload Document</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Project *</Label>
                <Select value={form.project_id} onValueChange={v => setForm(p => ({ ...p, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Folder</Label>
                <Select value={form.folder} onValueChange={v => setForm(p => ({ ...p, folder: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>File</Label><Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button className="w-full" disabled={!form.title || !form.project_id || createMutation.isPending} onClick={() => createMutation.mutate()}>
                <Upload className="mr-2 h-4 w-4" /> {createMutation.isPending ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Folder chips */}
      <div className="flex flex-wrap gap-2">
        <Button variant={selectedFolder === "all" ? "default" : "outline"} size="sm" onClick={() => { setSelectedFolder("all"); handleFilterChange(); }}>
          <Folder className="h-3 w-3 mr-1" /> All ({documents.length})
        </Button>
        {FOLDERS.map(f => (
          <Button key={f} variant={selectedFolder === f ? "default" : "outline"} size="sm" onClick={() => { setSelectedFolder(f); handleFilterChange(); }}>
            <Folder className="h-3 w-3 mr-1" /> {f} ({folderCounts[f] || 0})
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search documents..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); handleFilterChange(); }} />
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
                  <TableHead>Document</TableHead>
                  <TableHead className="hidden sm:table-cell">Folder</TableHead>
                  <TableHead className="hidden md:table-cell">Project</TableHead>
                  <TableHead className="hidden sm:table-cell">Size</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No documents found</TableCell></TableRow>
                ) : paginatedData.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <span className="font-medium">{d.title}</span>
                          {d.file_name && <div className="text-xs text-muted-foreground">{d.file_name}</div>}
                          <div className="text-xs text-muted-foreground sm:hidden">{d.folder} · {formatFileSize(d.file_size)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline">{d.folder}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell">{(d as any).projects?.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatFileSize(d.file_size)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(d.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {d.file_url && canPreview(d.file_type, d.file_name) && (
                          <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(d)} title="Preview">
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
        title="Delete Document"
        description="This will permanently delete this document and its file. This cannot be undone."
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        destructive
      />

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(v) => { if (!v) setPreviewDoc(null); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{previewDoc?.title}</DialogTitle>
                {previewDoc?.file_name && (
                  <p className="text-sm text-muted-foreground mt-1">{previewDoc.file_name}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {previewDoc?.file_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={previewDoc.file_url} target="_blank" rel="noreferrer" download>
                      <Download className="h-4 w-4 mr-2" /> Download
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/30">
            {previewDoc?.file_url && (
              previewDoc.file_type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewDoc.file_name || "") ? (
                <div className="h-full flex items-center justify-center p-4">
                  <img 
                    src={previewDoc.file_url} 
                    alt={previewDoc.title} 
                    className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : previewDoc.file_type === "application/pdf" || previewDoc.file_name?.endsWith(".pdf") ? (
                <iframe 
                  src={previewDoc.file_url} 
                  className="w-full h-full border-0"
                  title={previewDoc.title}
                />
              ) : (
                <iframe 
                  src={previewDoc.file_url} 
                  className="w-full h-full border-0 bg-white"
                  title={previewDoc.title}
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
