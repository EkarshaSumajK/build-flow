import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatters";
import { 
  Plus, ClipboardCheck, Trash2, CheckCircle2, XCircle, AlertCircle, 
  ChevronLeft, Camera, FileText, Calendar, Building2, ArrowRight,
  ClipboardList, Loader2, Upload
} from "lucide-react";
import { TablePagination } from "@/components/shared/TablePagination";

// Types
interface ChecklistItem {
  id: number;
  text: string;
  required: boolean;
  status?: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  items: ChecklistItem[];
  created_at: string;
}

interface Inspection {
  id: string;
  title: string;
  category: string;
  status: string;
  overall_result: string;
  results: ChecklistItem[];
  photo_urls: string[];
  notes: string | null;
  inspection_date: string | null;
  created_at: string;
  projects?: { name: string } | null;
}

interface Project {
  id: string;
  name: string;
}

const CATEGORIES = [
  { value: "quality", label: "Quality", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  { value: "safety", label: "Safety", color: "bg-red-500/10 text-red-600 border-red-200" },
  { value: "structural", label: "Structural", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  { value: "electrical", label: "Electrical", color: "bg-yellow-500/10 text-yellow-600 border-yellow-200" },
  { value: "plumbing", label: "Plumbing", color: "bg-cyan-500/10 text-cyan-600 border-cyan-200" },
  { value: "finishing", label: "Finishing", color: "bg-pink-500/10 text-pink-600 border-pink-200" },
  { value: "other", label: "Other", color: "bg-gray-500/10 text-gray-600 border-gray-200" },
];

// Helper to safely parse items from DB
const parseItems = (items: unknown): ChecklistItem[] => {
  if (!items) return [];
  if (Array.isArray(items)) return items as ChecklistItem[];
  if (typeof items === 'string') {
    try { 
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  if (typeof items === 'object') return Object.values(items) as ChecklistItem[];
  return [];
};

const parsePhotoUrls = (urls: unknown): string[] => {
  if (!urls) return [];
  if (Array.isArray(urls)) return urls as string[];
  if (typeof urls === 'string') {
    try { 
      const parsed = JSON.parse(urls);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
};

const getCategoryStyle = (category: string) => {
  return CATEGORIES.find(c => c.value === category)?.color || CATEGORIES[6].color;
};

const getResultColor = (result: string) => {
  if (result === "pass") return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
  if (result === "fail") return "bg-red-500/10 text-red-600 border-red-200";
  return "bg-amber-500/10 text-amber-600 border-amber-200";
};

export default function Checklists() {
  const { data: orgId } = useOrganization();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", category: "quality", items: "" });
  const [inspectionForm, setInspectionForm] = useState({ title: "", project_id: "", template_id: "", category: "quality", notes: "" });
  const [activeInspection, setActiveInspection] = useState<Inspection | null>(null);
  const [activeTab, setActiveTab] = useState("inspections");
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ["checklist-templates", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("checklist_templates").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Template[];
    },
    enabled: !!orgId,
  });

  const { data: inspections = [], isLoading: inspectionsLoading } = useQuery<Inspection[]>({
    queryKey: ["inspections", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("inspections").select("*, projects(name)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Inspection[];
    },
    enabled: !!orgId,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const items = templateForm.items.split("\n").filter(Boolean).map((text, i) => ({ 
        id: i + 1, text: text.trim(), required: true 
      }));
      if (items.length === 0) throw new Error("Add at least one checklist item");
      const { error } = await supabase.from("checklist_templates").insert({
        organization_id: orgId!, name: templateForm.name, category: templateForm.category,
        items, created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist-templates"] });
      setTemplateOpen(false);
      setTemplateForm({ name: "", category: "quality", items: "" });
      toast.success("Template created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createInspectionMutation = useMutation({
    mutationFn: async () => {
      const template = templates.find(t => t.id === inspectionForm.template_id);
      const results = template 
        ? parseItems(template.items).map(item => ({ ...item, status: "pending" })) 
        : [];
      const { error } = await supabase.from("inspections").insert({
        organization_id: orgId!, project_id: inspectionForm.project_id,
        template_id: inspectionForm.template_id || null,
        title: inspectionForm.title, category: inspectionForm.category,
        inspector_id: user!.id, results: results as any, notes: inspectionForm.notes || null,
        overall_result: "pending", status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspections"] });
      setInspectionOpen(false);
      setInspectionForm({ title: "", project_id: "", template_id: "", category: "quality", notes: "" });
      toast.success("Inspection created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateResultMutation = useMutation({
    mutationFn: async ({ id, results, overall }: { id: string; results: ChecklistItem[]; overall: string }) => {
      const status = overall === "pending" ? "pending" : "completed";
      const { error } = await supabase.from("inspections").update({ results: results as any, overall_result: overall, status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inspections"] }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checklist_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["checklist-templates"] }); toast.success("Template deleted"); },
  });

  const deleteInspectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inspections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inspections"] }); setActiveInspection(null); toast.success("Inspection deleted"); },
  });

  const toggleItem = (itemIndex: number, newStatus: string) => {
    if (!activeInspection) return;
    const results = [...parseItems(activeInspection.results)];
    results[itemIndex] = { ...results[itemIndex], status: newStatus };
    const completed = results.filter(r => r.status !== "pending").length;
    const passed = results.filter(r => r.status === "pass").length;
    const allDone = completed === results.length;
    const allPass = passed === results.length;
    const overall = allDone ? (allPass ? "pass" : "fail") : "pending";
    updateResultMutation.mutate({ id: activeInspection.id, results, overall });
    setActiveInspection({ ...activeInspection, results, overall_result: overall });
  };

  const handlePhotoUpload = async (file: File) => {
    if (!activeInspection || !orgId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${orgId}/${activeInspection.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("inspection-photos").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("inspection-photos").getPublicUrl(path);
      const currentPhotos = parsePhotoUrls(activeInspection.photo_urls);
      const newPhotos = [...currentPhotos, urlData.publicUrl];
      await supabase.from("inspections").update({ photo_urls: newPhotos }).eq("id", activeInspection.id);
      setActiveInspection({ ...activeInspection, photo_urls: newPhotos });
      qc.invalidateQueries({ queryKey: ["inspections"] });
      toast.success("Photo uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getProgress = (inspection: Inspection) => {
    const results = parseItems(inspection.results);
    if (results.length === 0) return 0;
    const completed = results.filter(r => r.status !== "pending").length;
    return Math.round((completed / results.length) * 100);
  };

  // Stats
  const totalInspections = inspections.length;
  const completedInspections = inspections.filter(i => i.status === "completed").length;
  const passedInspections = inspections.filter(i => i.overall_result === "pass").length;

  // Pagination for inspections
  const totalPages = Math.ceil(inspections.length / pageSize);
  const paginatedInspections = inspections.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inspections & Checklists</h1>
        <p className="text-muted-foreground text-sm mt-1">Quality and safety inspection management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-apple">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{totalInspections}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-apple">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{totalInspections - completedInspections}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-apple">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{passedInspections}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-apple">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{templates.length}</p>
                <p className="text-xs text-muted-foreground">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="inspections" className="rounded-lg data-[state=active]:shadow-sm">Inspections</TabsTrigger>
          <TabsTrigger value="templates" className="rounded-lg data-[state=active]:shadow-sm">Templates</TabsTrigger>
        </TabsList>

        {/* Inspections Tab */}
        <TabsContent value="inspections" className="space-y-4 mt-0">
          {activeInspection ? (
            <Card className="border-0 shadow-apple overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setActiveInspection(null)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <CardTitle className="text-lg">{activeInspection.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Building2 className="h-3 w-3" />
                        {activeInspection.projects?.name || "No project"}
                        <span className="text-muted-foreground/50">•</span>
                        <Calendar className="h-3 w-3" />
                        {formatDate(activeInspection.inspection_date || activeInspection.created_at)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getCategoryStyle(activeInspection.category)}>{activeInspection.category}</Badge>
                    <Badge variant="outline" className={getResultColor(activeInspection.overall_result)}>
                      {activeInspection.overall_result === "pass" ? "Passed" : activeInspection.overall_result === "fail" ? "Failed" : "In Progress"}
                    </Badge>
                  </div>
                </div>
                {parseItems(activeInspection.results).length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Progress</span>
                      <span>{getProgress(activeInspection)}% complete</span>
                    </div>
                    <Progress value={getProgress(activeInspection)} className="h-2" />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {/* Photo Section */}
                <div className="p-5 border-b bg-muted/20">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Camera className="h-4 w-4" /> Inspection Photos
                    </Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg flex-shrink-0"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      {uploading ? "Uploading..." : "Upload Photo"}
                    </Button>
                  </div>
                  {parsePhotoUrls(activeInspection.photo_urls).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {parsePhotoUrls(activeInspection.photo_urls).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="block group">
                          <img src={url} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-xl object-cover border-2 border-transparent group-hover:border-primary transition-all duration-200" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No photos uploaded yet</p>
                  )}
                </div>

                {/* Checklist Items */}
                <div className="p-4">
                  <Label className="text-sm font-medium mb-3 block">Checklist Items</Label>
                  {parseItems(activeInspection.results).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No checklist items</p>
                      <p className="text-xs mt-1">Create this inspection from a template to add items</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {parseItems(activeInspection.results).map((item, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                          item.status === "pass" ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20" :
                          item.status === "fail" ? "bg-red-50/50 border-red-200 dark:bg-red-950/20" : "bg-card hover:bg-muted/50"
                        }`}>
                          <div className="flex-shrink-0">
                            {item.status === "pass" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> :
                             item.status === "fail" ? <XCircle className="h-5 w-5 text-red-600" /> :
                             <AlertCircle className="h-5 w-5 text-amber-500" />}
                          </div>
                          <span className="flex-1 text-sm">{item.text}</span>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant={item.status === "pass" ? "default" : "outline"}
                              className={`h-8 px-3 rounded-lg ${item.status === "pass" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                              onClick={() => toggleItem(i, item.status === "pass" ? "pending" : "pass")}>Pass</Button>
                            <Button size="sm" variant={item.status === "fail" ? "destructive" : "outline"} className="h-8 px-3 rounded-lg"
                              onClick={() => toggleItem(i, item.status === "fail" ? "pending" : "fail")}>Fail</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {activeInspection.notes && (
                  <div className="p-4 border-t bg-muted/20">
                    <Label className="text-sm font-medium mb-2 block">Notes</Label>
                    <p className="text-sm text-muted-foreground">{activeInspection.notes}</p>
                  </div>
                )}
                <div className="p-4 border-t flex justify-end">
                  <Button variant="destructive" size="sm" onClick={() => deleteInspectionMutation.mutate(activeInspection.id)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Inspection
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-end">
                <Dialog open={inspectionOpen} onOpenChange={setInspectionOpen}>
                  <DialogTrigger asChild><Button className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> New Inspection</Button></DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Inspection</DialogTitle>
                      <DialogDescription>Start a new site inspection by selecting a project and template.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Project *</Label>
                        <Select value={inspectionForm.project_id} onValueChange={v => setInspectionForm(p => ({ ...p, project_id: v }))}>
                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select a project" /></SelectTrigger>
                          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input value={inspectionForm.title} onChange={e => setInspectionForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Foundation Quality Check" className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Template (optional)</Label>
                        <Select value={inspectionForm.template_id || ""} onValueChange={v => setInspectionForm(p => ({ ...p, template_id: v }))}>
                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select a template" /></SelectTrigger>
                          <SelectContent>
                            {templates.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">No templates available</div>
                            ) : (
                              templates.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} ({parseItems(t.items).length} items)
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {inspectionForm.template_id && (() => {
                          const selectedTemplate = templates.find(t => t.id === inspectionForm.template_id);
                          if (!selectedTemplate) return null;
                          const items = parseItems(selectedTemplate.items);
                          return (
                            <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs font-medium mb-2">Template items ({items.length}):</p>
                              <ul className="space-y-1">
                                {items.slice(0, 3).map((item, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <ClipboardCheck className="h-3 w-3 text-primary/60" />
                                    {item.text}
                                  </li>
                                ))}
                                {items.length > 3 && (
                                  <li className="text-xs text-muted-foreground">+{items.length - 3} more items</li>
                                )}
                              </ul>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={inspectionForm.category} onValueChange={v => setInspectionForm(p => ({ ...p, category: v }))}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes (optional)</Label>
                        <Textarea value={inspectionForm.notes} onChange={e => setInspectionForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." className="rounded-xl" />
                      </div>
                      <Button className="w-full rounded-xl" disabled={!inspectionForm.title || !inspectionForm.project_id || createInspectionMutation.isPending} onClick={() => createInspectionMutation.mutate()}>
                        {createInspectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Inspection
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {inspectionsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : inspections.length === 0 ? (
                <Card className="border-0 shadow-apple">
                  <CardContent className="py-12 text-center">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium mb-1">No inspections yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Create your first inspection to get started</p>
                    <Button onClick={() => setInspectionOpen(true)} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> New Inspection</Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-3">
                    {paginatedInspections.map(ins => {
                      const progress = getProgress(ins);
                      const itemCount = parseItems(ins.results).length;
                      return (
                        <Card key={ins.id} className="border-0 shadow-apple cursor-pointer hover:shadow-apple-lg transition-all duration-200" onClick={() => setActiveInspection(ins)}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium truncate">{ins.title}</h3>
                                  <Badge variant="outline" className={getCategoryStyle(ins.category)}>{ins.category}</Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{ins.projects?.name || "No project"}</span>
                                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(ins.inspection_date || ins.created_at)}</span>
                                  {itemCount > 0 && <span>{itemCount} items</span>}
                                </div>
                                {itemCount > 0 && <div className="mt-2"><Progress value={progress} className="h-1.5" /></div>}
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className={getResultColor(ins.overall_result)}>
                                  {ins.overall_result === "pass" ? "Passed" : ins.overall_result === "fail" ? "Failed" : `${progress}%`}
                                </Badge>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {inspections.length > 0 && (
                    <Card className="border-0 shadow-apple mt-4">
                      <TablePagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={inspections.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                      />
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4 mt-0">
          <div className="flex justify-end">
            <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
              <DialogTrigger asChild><Button className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> New Template</Button></DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Checklist Template</DialogTitle>
                  <DialogDescription>Create a reusable checklist template for your inspections.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Template Name *</Label>
                    <Input value={templateForm.name} onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Concrete Quality Checklist" className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={templateForm.category} onValueChange={v => setTemplateForm(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Checklist Items *</Label>
                    <p className="text-xs text-muted-foreground">Enter one item per line</p>
                    <Textarea rows={6} value={templateForm.items} onChange={e => setTemplateForm(p => ({ ...p, items: e.target.value }))} placeholder={"Check concrete mix ratio\nVerify rebar spacing\nInspect formwork alignment"} className="rounded-xl font-mono text-sm" />
                    {templateForm.items && <p className="text-xs text-muted-foreground">{templateForm.items.split("\n").filter(Boolean).length} items</p>}
                  </div>
                  <Button className="w-full rounded-xl" disabled={!templateForm.name || !templateForm.items || createTemplateMutation.isPending} onClick={() => createTemplateMutation.mutate()}>
                    {createTemplateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {templatesLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <Card className="border-0 shadow-apple">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-1">No templates yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create a template to speed up your inspections</p>
                <Button onClick={() => setTemplateOpen(true)} className="rounded-xl"><Plus className="mr-2 h-4 w-4" /> New Template</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map(t => {
                const items = parseItems(t.items);
                return (
                  <Card key={t.id} className="border-0 shadow-apple group hover:shadow-apple-lg transition-all duration-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{t.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={getCategoryStyle(t.category)}>{t.category}</Badge>
                            <span className="text-xs text-muted-foreground">{items.length} items</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); deleteTemplateMutation.mutate(t.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5">
                        {items.slice(0, 4).map((item, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <ClipboardCheck className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary/60" />
                            <span className="line-clamp-1">{item.text}</span>
                          </li>
                        ))}
                        {items.length > 4 && <li className="text-xs text-muted-foreground pl-5">+{items.length - 4} more items</li>}
                      </ul>
                      <Button variant="outline" size="sm" className="w-full mt-4 rounded-lg"
                        onClick={() => { 
                          setInspectionForm({ 
                            title: "", 
                            project_id: "", 
                            template_id: t.id, 
                            category: t.category, 
                            notes: "" 
                          }); 
                          setActiveTab("inspections");
                          setInspectionOpen(true); 
                        }}>
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
