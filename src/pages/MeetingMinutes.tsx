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
import { toast } from "sonner";
import { Plus, Calendar, MapPin, Users, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { TablePagination } from "@/components/shared/TablePagination";

export default function MeetingMinutes({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const { data: orgId } = useOrganization();
  const { data: members = [] } = useOrgMembers();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const emptyForm = { project_id: projectId || "", title: "", meeting_date: new Date().toISOString().split("T")[0], location: "", agenda: "", notes: "", attendees: "" as string, action_items_text: "" };
  const [form, setForm] = useState(emptyForm);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").eq("organization_id", orgId!);
      if (error) throw error; return data;
    },
    enabled: !!orgId && !projectId,
  });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meeting-minutes", orgId, projectId],
    queryFn: async () => {
      let q = supabase.from("meeting_minutes").select("*, projects(name)").eq("organization_id", orgId!).order("meeting_date", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error; return data;
    },
    enabled: !!orgId,
  });

  const totalPages = Math.ceil(meetings.length / pageSize);
  const paginatedMeetings = meetings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const saveMeeting = useMutation({
    mutationFn: async () => {
      const attendeeList = form.attendees.split(",").map((a) => a.trim()).filter(Boolean);
      const actionItems = form.action_items_text.split("\n").filter(Boolean).map((item) => ({ text: item.trim(), completed: false }));
      const { error } = await supabase.from("meeting_minutes").insert({
        organization_id: orgId!, project_id: projectId || form.project_id,
        title: form.title, meeting_date: form.meeting_date,
        location: form.location || null, agenda: form.agenda || null,
        notes: form.notes || null, attendees: attendeeList,
        action_items: actionItems, created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meeting-minutes"] });
      setDialogOpen(false); setForm(emptyForm);
      toast.success("Meeting recorded!");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Meeting Minutes</h1><p className="text-muted-foreground">Record meetings, agendas, and action items</p></div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />New Meeting</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record Meeting</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMeeting.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              {!projectId && (
                <div className="space-y-2">
                  <Label>Project *</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="space-y-2"><Label>Attendees (comma separated)</Label><Input value={form.attendees} onChange={(e) => setForm({ ...form, attendees: e.target.value })} placeholder="John, Jane, Bob" /></div>
            <div className="space-y-2"><Label>Agenda</Label><Textarea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div className="space-y-2"><Label>Action Items (one per line)</Label><Textarea value={form.action_items_text} onChange={(e) => setForm({ ...form, action_items_text: e.target.value })} rows={3} placeholder="Review drawings&#10;Order materials&#10;Schedule inspection" /></div>
            <Button type="submit" className="w-full" disabled={saveMeeting.isPending}>{saveMeeting.isPending ? "Saving..." : "Save Meeting"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedMeeting} onOpenChange={(v) => !v && setSelectedMeeting(null)}>
        <DialogContent className="max-w-lg">
          {selectedMeeting && (
            <div className="space-y-4">
              <DialogHeader><DialogTitle>{selectedMeeting.title}</DialogTitle></DialogHeader>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(selectedMeeting.meeting_date)}</span>
                {selectedMeeting.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selectedMeeting.location}</span>}
              </div>
              {selectedMeeting.attendees?.length > 0 && (
                <div><p className="text-sm font-medium mb-1 flex items-center gap-1"><Users className="h-3.5 w-3.5" />Attendees</p><div className="flex flex-wrap gap-1">{selectedMeeting.attendees.map((a: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>)}</div></div>
              )}
              {selectedMeeting.agenda && <div><p className="text-sm font-medium mb-1">Agenda</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedMeeting.agenda}</p></div>}
              {selectedMeeting.notes && <div><p className="text-sm font-medium mb-1">Notes</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedMeeting.notes}</p></div>}
              {selectedMeeting.action_items && (
                <div>
                  <p className="text-sm font-medium mb-1 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Action Items</p>
                  <ul className="space-y-1">{(Array.isArray(selectedMeeting.action_items) ? selectedMeeting.action_items : typeof selectedMeeting.action_items === 'string' ? JSON.parse(selectedMeeting.action_items) : []).map((item: any, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2"><span className="text-muted-foreground">•</span>{item.text || item.task || item}</li>
                  ))}</ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : meetings.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">No meetings recorded yet.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedMeetings.map((m: any) => (
              <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedMeeting(m)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base line-clamp-1">{m.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{(m as any).projects?.name} • {formatDate(m.meeting_date)}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {m.attendees?.length > 0 && <p className="text-xs text-muted-foreground"><Users className="inline h-3 w-3 mr-1" />{m.attendees.length} attendees</p>}
                  {(() => {
                    const items = Array.isArray(m.action_items) ? m.action_items : typeof m.action_items === 'string' ? JSON.parse(m.action_items) : [];
                    return items.length > 0 && <p className="text-xs text-muted-foreground"><CheckCircle2 className="inline h-3 w-3 mr-1" />{items.length} action items</p>;
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
          {meetings.length > 0 && (
            <Card className="mt-4">
              <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={meetings.length} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }} pageSizeOptions={[12, 24, 48, 96]} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
