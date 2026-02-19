import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";

interface ParsedWorker {
  name: string;
  trade: string;
  daily_rate: number;
  contractor: string;
  phone: string;
  valid: boolean;
  error?: string;
}

function downloadTemplate() {
  const headers = ["Name*", "Trade/Skill", "Daily Rate", "Contractor", "Phone"];
  const sampleRows = [
    ["Ravi Kumar", "Mason", "800", "ABC Contractors", "9876543210"],
    ["Suresh Yadav", "Carpenter", "750", "", "9123456789"],
    ["Meena Devi", "Helper", "500", "XYZ Labour", ""],
  ];
  const csv = [headers.join(","), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "workers_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): ParsedWorker[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Skip header row
  return lines.slice(1).map((line) => {
    // Handle quoted CSV fields
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { cols.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    cols.push(current.trim());

    const name = cols[0] || "";
    const trade = cols[1] || "";
    const daily_rate = parseFloat(cols[2] || "0") || 0;
    const contractor = cols[3] || "";
    const phone = cols[4] || "";

    const valid = name.length > 0;
    return { name, trade, daily_rate, contractor, phone, valid, error: valid ? undefined : "Name is required" };
  });
}

export function BulkWorkerUpload() {
  const { data: orgId } = useOrganization();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedWorker[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const workers = parseCSV(text);
      if (workers.length === 0) {
        toast.error("No data rows found in file");
        return;
      }
      setParsed(workers);
      setOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const bulkInsert = useMutation({
    mutationFn: async () => {
      const validWorkers = parsed.filter((w) => w.valid);
      if (validWorkers.length === 0) throw new Error("No valid workers to import");
      const rows = validWorkers.map((w) => ({
        organization_id: orgId!,
        name: w.name,
        trade: w.trade || null,
        daily_rate: w.daily_rate,
        contractor: w.contractor || null,
        phone: w.phone || null,
      }));
      const { error } = await supabase.from("workers").insert(rows);
      if (error) throw error;
      return validWorkers.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      setOpen(false);
      setParsed([]);
      toast.success(`${count} workers imported successfully!`);
    },
    onError: (e) => toast.error(e.message),
  });

  const validCount = parsed.filter((w) => w.valid).length;
  const invalidCount = parsed.length - validCount;

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Preview Import ({parsed.length} rows)
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-3 mb-4">
            <Badge variant="secondary" className="bg-success/10 text-success">
              <CheckCircle2 className="mr-1 h-3 w-3" /> {validCount} valid
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                <AlertCircle className="mr-1 h-3 w-3" /> {invalidCount} errors
              </Badge>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Trade</TableHead>
                  <TableHead>Daily Rate</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((w, i) => (
                  <TableRow key={i} className={w.valid ? "" : "bg-destructive/5"}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{w.name || "—"}</TableCell>
                    <TableCell>{w.trade || "—"}</TableCell>
                    <TableCell>{w.daily_rate}</TableCell>
                    <TableCell>{w.contractor || "—"}</TableCell>
                    <TableCell>{w.phone || "—"}</TableCell>
                    <TableCell>
                      {w.valid ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <span className="text-xs text-destructive">{w.error}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button onClick={() => bulkInsert.mutate()} disabled={validCount === 0 || bulkInsert.isPending} className="w-full mt-4">
            {bulkInsert.isPending ? "Importing..." : `Import ${validCount} Workers`}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
