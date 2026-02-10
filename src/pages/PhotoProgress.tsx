import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Camera, MapPin, Calendar } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { TablePagination } from "@/components/shared/TablePagination";

export default function PhotoProgress() {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ project_id: "", location: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["photo-progress", orgId, projectFilter],
    queryFn: async () => {
      let query = supabase.from("photo_progress").select("*, projects(name)").eq("organization_id", orgId!).order("taken_at", { ascending: false });
      if (projectFilter !== "all") query = query.eq("project_id", projectFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const locations = [...new Set(photos.map((p: any) => p.location))];

  const savePhoto = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please select a photo");
      const ext = file.name.split(".").pop();
      const path = `${form.project_id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("photo-progress").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("photo-progress").getPublicUrl(path);

      const { error } = await supabase.from("photo_progress").insert({
        organization_id: orgId!,
        project_id: form.project_id,
        location: form.location,
        description: form.description || null,
        photo_url: urlData.publicUrl,
        taken_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photo-progress"] });
      setDialogOpen(false);
      setForm({ project_id: "", location: "", description: "" });
      setFile(null);
      setPreview(null);
      toast.success("Photo uploaded!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const filtered = photos.filter((p: any) => locationFilter === "all" || p.location === locationFilter);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedPhotos = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleProjectFilterChange = (value: string) => {
    setProjectFilter(value);
    setCurrentPage(1);
  };

  const handleLocationFilterChange = (value: string) => {
    setLocationFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Photo Progress</h1>
          <p className="text-muted-foreground">Track site progress with photos over time</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Photo</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Progress Photo</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); savePhoto.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Project *</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location / Area *</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Floor 3 - East Wing" required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Photo *</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />{file ? file.name : "Choose Photo"}
              </Button>
              {preview && <img src={preview} alt="preview" className="h-32 w-auto rounded-md border object-cover mt-2" />}
            </div>
            <Button type="submit" className="w-full" disabled={savePhoto.isPending || !file}>
              {savePhoto.isPending ? "Uploading..." : "Upload Photo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPhoto} onOpenChange={(v) => !v && setSelectedPhoto(null)}>
        <DialogContent className="max-w-2xl">
          {selectedPhoto && (
            <div className="space-y-3">
              <img src={selectedPhoto.photo_url} alt={selectedPhoto.location} className="w-full rounded-lg" />
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selectedPhoto.location}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(selectedPhoto.taken_at)}</span>
              </div>
              {selectedPhoto.description && <p className="text-sm">{selectedPhoto.description}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap gap-2">
        <Select value={projectFilter} onValueChange={handleProjectFilterChange}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={handleLocationFilterChange}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Locations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading photos...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">No photos yet. Start capturing site progress!</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedPhotos.map((photo: any) => (
              <Card key={photo.id} className="cursor-pointer overflow-hidden hover:shadow-md transition-shadow" onClick={() => setSelectedPhoto(photo)}>
                <img src={photo.photo_url} alt={photo.location} className="h-48 w-full object-cover" />
                <CardContent className="p-3 space-y-1">
                  <p className="font-medium text-sm truncate">{photo.location}</p>
                  <p className="text-xs text-muted-foreground">{(photo as any).projects?.name} • {formatDate(photo.taken_at)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {filtered.length > 0 && (
            <Card className="mt-4">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                pageSizeOptions={[12, 24, 48, 96]}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
