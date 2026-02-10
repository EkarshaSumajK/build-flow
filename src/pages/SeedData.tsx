import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { runSeed, runClearOnly } from "@/scripts/seedData";
import { toast } from "sonner";
import { Loader2, Database, CheckCircle2, Trash2, RefreshCw } from "lucide-react";

export default function SeedData() {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const captureConsole = () => {
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      originalLog(...args);
      setLogs(prev => [...prev, args.join(" ")]);
    };
    console.error = (...args) => {
      originalError(...args);
      setLogs(prev => [...prev, `ERROR: ${args.join(" ")}`]);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  };

  const handleSeed = async () => {
    setLoading(true);
    setLogs([]);
    setCompleted(false);
    const restore = captureConsole();

    try {
      await runSeed();
      setCompleted(true);
      toast.success("Seed data created successfully!");
    } catch (error: unknown) {
      toast.error(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      restore();
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    setLogs([]);
    setCompleted(false);
    const restore = captureConsole();

    try {
      await runClearOnly();
      toast.success("All data cleared!");
    } catch (error: unknown) {
      toast.error(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      restore();
      setClearing(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Clear existing data or generate fresh demo data for testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Warning:</strong> These actions will permanently delete data. Use with caution.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleClear} 
              disabled={loading || clearing}
              variant="destructive"
              size="lg"
            >
              {clearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Data
                </>
              )}
            </Button>

            <Button 
              onClick={handleSeed} 
              disabled={loading || clearing}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding...
                </>
              ) : completed ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reseed Data
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Clear & Seed Data
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            "Clear & Seed" will delete all existing data and create fresh demo data.
          </p>

          {logs.length > 0 && (
            <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs max-h-96 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className={
                  log.startsWith("ERROR") ? "text-red-400" : 
                  log.startsWith("✅") ? "text-green-400" : 
                  log.startsWith("🎉") ? "text-yellow-400" :
                  log.startsWith("🧹") ? "text-blue-400" :
                  log.includes("━") ? "text-gray-500" : ""
                }>
                  {log}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
