import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgMembers } from "@/hooks/useOrgMembers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, ShieldAlert, MessageSquare } from "lucide-react";
import { formatDate, statusColor, priorityColor } from "@/lib/formatters";
import { TablePagination } from "@/components/shared/TablePagination";

export default function Safety({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { data: members = [] } = useOrgMembers();
  const queryClient = useQueryClient();
  const [incidentDialog, setIncidentDialog] = useState(false);
  const [talkDialog, setTalkDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [talksPage, setTalksPage] = useState(1);
  const [talksPageSize, setTalksPageSize] = useState(12);

  const incidentEmpty = { project_id: projectId || "", title: "", incident_type: "near_miss", severity: "low", description: "", location: "", corrective_action: "" };
  const [incForm, setIncForm] = useState(incidentEmpty);

  const talkEmpty = { project_id: projectId || "", topic: "", description: "", conducted_date: new Date().toISOString().split("T")[0], attendee_names: "", attendee_count: "", notes: "" };
  const [talkForm, setTalkForm] = useState(talkEmpty);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !projectId,
  });

  const { data: incidents = [], isLoading: loadingInc } = useQuery({
    queryKey: ["safety-incidents", orgId, projectId],
    queryFn: async () => {
      let q = supabase.from("safety_incidents").select("*, projects(name)").eq("organization_id", orgId!).order("incident_date", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: talks = [], isLoading: loadingTalks } = useQuery({
    queryKey: ["toolbox-talks", orgId, projectId],
    queryFn: async () => {
      let q = supabase.from("toolbox_talks").select("*, projects(name)").eq("organization_id", orgId!).order("conducted_date", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const saveIncident = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("safety_incidents").insert({
        organization_id: orgId!,
        project_id: projectId || incForm.project_id,
        title: incForm.title,
        incident_type: incForm.incident_type,
        severity: incForm.severity,
        description: incForm.description || null,
        location: incForm.location || null,
        corrective_action: incForm.corrective_action || null,
        reported_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety-incidents"] });
      setIncidentDialog(false);
      setIncForm(incidentEmpty);
      toast.success("Incident reported!");
    },
    onError: (e) => toast.error(e.message),
  });

  const saveTalk = useMutation({
    mutationFn: async () => {
      const names = talkForm.attendee_names.split(",").map((n) => n.trim()).filter(Boolean);
      const { error } = await supabase.from("toolbox_talks").insert({
        organization_id: orgId!,
        project_id: projectId || talkForm.project_id,
        topic: talkForm.topic,
        description: talkForm.description || null,
        conducted_by: user!.id,
        conducted_date: talkForm.conducted_date,
        attendee_count: talkForm.attendee_count ? parseInt(talkForm.attendee_count) : names.length,
        attendee_names: names,
        notes: talkForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["toolbox-talks"] });
      setTalkDialog(false);
      setTalkForm(talkEmpty);
      toast.success("Toolbox talk recorded!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateIncidentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("safety_incidents").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety-incidents"] });
      toast.success("Status updated!");
    },
    onError: (e) => toast.error(e.message),
  });

  const openCount = incidents.filter((i: any) => i.status === "reported" || i.status === "investigating").length;

  const totalPages = Math.ceil(incidents.length / pageSize);
  const paginatedIncidents = incidents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const talksTotalPages = Math.ceil(talks.length / talksPageSize);
  const paginatedTalks = talks.slice((talksPage - 1) * talksPageSize, talksPage * talksPageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Safety Management</h1>
          <p className="text-muted-foreground">Incidents, toolbox talks, and safety compliance</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Open Incidents</p><p className="text-2xl font-bold text-destructive">{openCount}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total Incidents</p><p className="text-2xl font-bold">{incidents.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Toolbox Talks</p><p className="text-2xl font-bold text-success">{talks.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="incidents" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="incidents" className="gap-2"><ShieldAlert className="h-4 w-4" />Incidents</TabsTrigger>
            <TabsTrigger value="talks" className="gap-2"><MessageSquare className="h-4 w-4" />Toolbox Talks</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="incidents">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIncidentDialog(true)}><Plus className="mr-2 h-4 w-4" />Report Incident</Button>
          </div>

          <Dialog open={incidentDialog} onOpenChange={setIncidentDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>Report Safety Incident</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveIncident.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Title *</Label><Input value={incForm.title} onChange={(e) => setIncForm({ ...incForm, title: e.target.value })} required /></div>
                {!projectId && (
                  <div className="space-y-2">
                    <Label>Project *</Label>
                    <Select value={incForm.project_id} onValueChange={(v) => setIncForm({ ...incForm, project_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={incForm.incident_type} onValueChange={(v) => setIncForm({ ...incForm, incident_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="near_miss">Near Miss</SelectItem><SelectItem value="first_aid">First Aid</SelectItem>
                        <SelectItem value="injury">Injury</SelectItem><SelectItem value="property_damage">Property Damage</SelectItem>
                        <SelectItem value="environmental">Environmental</SelectItem><SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={incForm.severity} onValueChange={(v) => setIncForm({ ...incForm, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Location</Label><Input value={incForm.location} onChange={(e) => setIncForm({ ...incForm, location: e.target.value })} /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={incForm.description} onChange={(e) => setIncForm({ ...incForm, description: e.target.value })} /></div>
                <div className="space-y-2"><Label>Corrective Action</Label><Textarea value={incForm.corrective_action} onChange={(e) => setIncForm({ ...incForm, corrective_action: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={saveIncident.isPending}>{saveIncident.isPending ? "Saving..." : "Report Incident"}</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>{!projectId && <TableHead className="hidden sm:table-cell">Project</TableHead>}
                  <TableHead className="hidden sm:table-cell">Date</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingInc ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : paginatedIncidents.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No incidents reported</TableCell></TableRow>
                ) : paginatedIncidents.map((inc: any) => (
                  <TableRow key={inc.id}>
                    <TableCell className="font-medium">{inc.title}</TableCell>
                    <TableCell className="capitalize text-sm">{inc.incident_type.replace("_", " ")}</TableCell>
                    <TableCell><Badge className={priorityColor(inc.severity)} variant="secondary">{inc.severity}</Badge></TableCell>
                    <TableCell>
                      <Select value={inc.status} onValueChange={(v) => updateIncidentStatus.mutate({ id: inc.id, status: v })}>
                        <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reported">Reported</SelectItem><SelectItem value="investigating">Investigating</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {!projectId && <TableCell className="hidden sm:table-cell text-sm">{(inc as any).projects?.name}</TableCell>}
                    <TableCell className="hidden sm:table-cell text-sm">{formatDate(inc.incident_date)}</TableCell>
                    <TableCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {incidents.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={incidents.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="talks">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setTalkDialog(true)}><Plus className="mr-2 h-4 w-4" />Record Talk</Button>
          </div>

          <Dialog open={talkDialog} onOpenChange={setTalkDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Toolbox Talk</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveTalk.mutate(); }} className="space-y-4">
                <div className="space-y-2"><Label>Topic *</Label><Input value={talkForm.topic} onChange={(e) => setTalkForm({ ...talkForm, topic: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  {!projectId && (
                    <div className="space-y-2">
                      <Label>Project *</Label>
                      <Select value={talkForm.project_id} onValueChange={(v) => setTalkForm({ ...talkForm, project_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={talkForm.conducted_date} onChange={(e) => setTalkForm({ ...talkForm, conducted_date: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={talkForm.description} onChange={(e) => setTalkForm({ ...talkForm, description: e.target.value })} /></div>
                <div className="space-y-2"><Label>Attendee Names (comma separated)</Label><Input value={talkForm.attendee_names} onChange={(e) => setTalkForm({ ...talkForm, attendee_names: e.target.value })} /></div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={talkForm.notes} onChange={(e) => setTalkForm({ ...talkForm, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full" disabled={saveTalk.isPending}>{saveTalk.isPending ? "Saving..." : "Save Talk"}</Button>
              </form>
            </DialogContent>
          </Dialog>

          {loadingTalks ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : talks.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-muted-foreground">No toolbox talks recorded.</CardContent></Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedTalks.map((talk: any) => (
                  <Card key={talk.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{talk.topic}</CardTitle>
                      <p className="text-xs text-muted-foreground">{(talk as any).projects?.name} • {formatDate(talk.conducted_date)}</p>
                    </CardHeader>
                    <CardContent>
                      {talk.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{talk.description}</p>}
                      <p className="text-xs text-muted-foreground">{talk.attendee_count || talk.attendee_names?.length || 0} attendees</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {talks.length > 0 && (
                <Card className="mt-4">
                  <TablePagination
                    currentPage={talksPage}
                    totalPages={talksTotalPages}
                    totalItems={talks.length}
                    pageSize={talksPageSize}
                    onPageChange={setTalksPage}
                    onPageSizeChange={(size) => { setTalksPageSize(size); setTalksPage(1); }}
                    pageSizeOptions={[12, 24, 48, 96]}
                  />
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
