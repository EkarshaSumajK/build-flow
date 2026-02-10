import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, statusColor } from "@/lib/formatters";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { HardHat, Camera, BarChart3, Receipt, CalendarClock, Lock, MapPin, Calendar } from "lucide-react";
import { TablePagination } from "@/components/shared/TablePagination";

export default function PortalView() {
  const { token } = useParams<{ token: string }>();
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  
  // Pagination states
  const [tasksPage, setTasksPage] = useState(1);
  const [tasksPageSize, setTasksPageSize] = useState(10);
  const [photosPage, setPhotosPage] = useState(1);
  const [photosPageSize, setPhotosPageSize] = useState(12);
  const [billsPage, setBillsPage] = useState(1);
  const [billsPageSize, setBillsPageSize] = useState(10);
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePageSize, setSchedulePageSize] = useState(10);

  // Fetch token info via edge function (public access, no auth needed)
  const { data: portalData, isLoading, error } = useQuery({
    queryKey: ["portal", token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("client-portal", {
        body: { token },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Invalid portal link");
      return data.data;
    },
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <HardHat className="mx-auto h-10 w-10 text-primary animate-pulse mb-4" />
          <p className="text-muted-foreground">Loading project portal...</p>
        </div>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid or Expired Link</h2>
            <p className="text-muted-foreground">This portal link is no longer valid. Please contact the project manager for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, permissions, photos, tasks, bills } = portalData;

  const availableTabs = [];
  if (permissions.includes("progress")) availableTabs.push("progress");
  if (permissions.includes("photos")) availableTabs.push("photos");
  if (permissions.includes("schedule")) availableTabs.push("schedule");
  if (permissions.includes("billing")) availableTabs.push("billing");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{project.name}</h1>
              <p className="text-xs text-muted-foreground">Client Portal • {portalData.client_name}</p>
            </div>
          </div>
          <Badge variant="secondary" className={statusColor(project.status)}>{project.status}</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
        {permissions.includes("progress") && (
          <div className="grid gap-4 sm:grid-cols-4">
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Progress</p><Progress value={project.progress || 0} className="mt-2" /><p className="text-right text-sm mt-1 font-medium">{project.progress || 0}%</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Budget</p><p className="text-2xl font-bold">{formatCurrency(project.budget)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Start Date</p><p className="text-lg font-semibold">{formatDate(project.start_date)}</p></CardContent></Card>
            <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">End Date</p><p className="text-lg font-semibold">{formatDate(project.end_date)}</p></CardContent></Card>
          </div>
        )}

        <Tabs defaultValue={availableTabs[0] || "progress"}>
          <TabsList>
            {permissions.includes("progress") && <TabsTrigger value="progress"><BarChart3 className="h-4 w-4 mr-1" />Progress</TabsTrigger>}
            {permissions.includes("photos") && <TabsTrigger value="photos"><Camera className="h-4 w-4 mr-1" />Photos</TabsTrigger>}
            {permissions.includes("schedule") && <TabsTrigger value="schedule"><CalendarClock className="h-4 w-4 mr-1" />Schedule</TabsTrigger>}
            {permissions.includes("billing") && <TabsTrigger value="billing"><Receipt className="h-4 w-4 mr-1" />Billing</TabsTrigger>}
          </TabsList>

          {permissions.includes("progress") && (
            <TabsContent value="progress" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Task Progress</CardTitle></CardHeader>
                <CardContent>
                  {tasks?.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Due Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.slice((tasksPage - 1) * tasksPageSize, tasksPage * tasksPageSize).map((t: any) => (
                            <TableRow key={t.id}>
                              <TableCell className="font-medium">{t.title}</TableCell>
                              <TableCell><Badge variant="secondary" className={statusColor(t.status)}>{t.status.replace("_", " ")}</Badge></TableCell>
                              <TableCell><Progress value={t.progress || 0} className="w-20" /></TableCell>
                              <TableCell className="text-sm">{formatDate(t.due_date)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {tasks.length > tasksPageSize && (
                        <TablePagination
                          currentPage={tasksPage}
                          totalPages={Math.ceil(tasks.length / tasksPageSize)}
                          totalItems={tasks.length}
                          pageSize={tasksPageSize}
                          onPageChange={setTasksPage}
                          onPageSizeChange={(size) => { setTasksPageSize(size); setTasksPage(1); }}
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No tasks available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {permissions.includes("photos") && (
            <TabsContent value="photos" className="mt-4">
              {photos?.length > 0 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {photos.slice((photosPage - 1) * photosPageSize, photosPage * photosPageSize).map((p: any) => (
                      <Card key={p.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedPhoto(p)}>
                        <img src={p.photo_url} alt={p.description || p.location} className="w-full h-48 object-cover" />
                        <CardContent className="pt-3">
                          <p className="font-medium text-sm">{p.location}</p>
                          {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(p.taken_at)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {photos.length > photosPageSize && (
                    <Card className="mt-4">
                      <TablePagination
                        currentPage={photosPage}
                        totalPages={Math.ceil(photos.length / photosPageSize)}
                        totalItems={photos.length}
                        pageSize={photosPageSize}
                        onPageChange={setPhotosPage}
                        onPageSizeChange={(size) => { setPhotosPageSize(size); setPhotosPage(1); }}
                        pageSizeOptions={[12, 24, 48, 96]}
                      />
                    </Card>
                  )}
                </>
              ) : (
                <p className="col-span-full text-center text-muted-foreground py-8">No photos available</p>
              )}
            </TabsContent>
          )}

          {permissions.includes("schedule") && (
            <TabsContent value="schedule" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Project Schedule</CardTitle></CardHeader>
                <CardContent>
                  {tasks?.length > 0 ? (
                    (() => {
                      const scheduledTasks = tasks.filter((t: any) => t.start_date || t.due_date);
                      const paginatedSchedule = scheduledTasks.slice((schedulePage - 1) * schedulePageSize, schedulePage * schedulePageSize);
                      return (
                        <>
                          <Table>
                            <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Start</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {paginatedSchedule.map((t: any) => (
                                <TableRow key={t.id}>
                                  <TableCell className="font-medium">{t.title}</TableCell>
                                  <TableCell className="text-sm">{formatDate(t.start_date)}</TableCell>
                                  <TableCell className="text-sm">{formatDate(t.due_date)}</TableCell>
                                  <TableCell><Badge variant="secondary" className={statusColor(t.status)}>{t.status.replace("_", " ")}</Badge></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {scheduledTasks.length > schedulePageSize && (
                            <TablePagination
                              currentPage={schedulePage}
                              totalPages={Math.ceil(scheduledTasks.length / schedulePageSize)}
                              totalItems={scheduledTasks.length}
                              pageSize={schedulePageSize}
                              onPageChange={setSchedulePage}
                              onPageSizeChange={(size) => { setSchedulePageSize(size); setSchedulePage(1); }}
                            />
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No scheduled tasks</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {permissions.includes("billing") && (
            <TabsContent value="billing" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">RA Bills</CardTitle></CardHeader>
                <CardContent>
                  {bills?.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader><TableRow><TableHead>Bill #</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {bills.slice((billsPage - 1) * billsPageSize, billsPage * billsPageSize).map((b: any) => (
                            <TableRow key={b.id}>
                              <TableCell className="font-medium">{b.bill_number}</TableCell>
                              <TableCell className="text-sm">{formatDate(b.bill_date)}</TableCell>
                              <TableCell>{formatCurrency(b.net_amount)}</TableCell>
                              <TableCell><Badge variant="secondary" className={statusColor(b.status)}>{b.status}</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {bills.length > billsPageSize && (
                        <TablePagination
                          currentPage={billsPage}
                          totalPages={Math.ceil(bills.length / billsPageSize)}
                          totalItems={bills.length}
                          pageSize={billsPageSize}
                          onPageChange={setBillsPage}
                          onPageSizeChange={(size) => { setBillsPageSize(size); setBillsPage(1); }}
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No billing data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Photo Preview Dialog */}
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
      </main>
    </div>
  );
}