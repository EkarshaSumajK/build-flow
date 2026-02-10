import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Materials = lazy(() => import("./pages/Materials"));
const Labour = lazy(() => import("./pages/Labour"));
const Issues = lazy(() => import("./pages/Issues"));
const Reports = lazy(() => import("./pages/Reports"));
const PettyCash = lazy(() => import("./pages/PettyCash"));
const Drawings = lazy(() => import("./pages/Drawings"));
const Checklists = lazy(() => import("./pages/Checklists"));
const Billing = lazy(() => import("./pages/Billing"));
const Documents = lazy(() => import("./pages/Documents"));
const Vendors = lazy(() => import("./pages/Vendors"));
const Scheduling = lazy(() => import("./pages/Scheduling"));
const ReportBuilder = lazy(() => import("./pages/ReportBuilder"));
const PhotoProgress = lazy(() => import("./pages/PhotoProgress"));
const InventoryTransfers = lazy(() => import("./pages/InventoryTransfers"));
const MeetingMinutes = lazy(() => import("./pages/MeetingMinutes"));
const Equipment = lazy(() => import("./pages/Equipment"));
const Safety = lazy(() => import("./pages/Safety"));
const TeamChat = lazy(() => import("./pages/TeamChat"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const PortalView = lazy(() => import("./pages/PortalView"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const SeedData = lazy(() => import("./pages/SeedData"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (user) return <Navigate to="/" replace />;
  return <Suspense fallback={<PageLoader />}><Auth /></Suspense>;
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Redirect /home to /auth */}
              <Route path="/home" element={<Navigate to="/auth" replace />} />
              <Route path="/features" element={<Navigate to="/auth" replace />} />
              <Route path="/about" element={<Navigate to="/auth" replace />} />
              <Route path="/pricing" element={<Navigate to="/auth" replace />} />
              <Route path="/blog" element={<Navigate to="/auth" replace />} />
              <Route path="/testimonials" element={<Navigate to="/auth" replace />} />
              <Route path="/contact" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<AuthRoute />} />
              <Route path="/" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Projects /></Suspense></ProtectedRoute>} />
              <Route path="/projects/:id" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ProjectDetail /></Suspense></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Tasks /></Suspense></ProtectedRoute>} />
              <Route path="/materials" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Materials /></Suspense></ProtectedRoute>} />
              <Route path="/labour" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Labour /></Suspense></ProtectedRoute>} />
              <Route path="/issues" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Issues /></Suspense></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Reports /></Suspense></ProtectedRoute>} />
              <Route path="/petty-cash" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><PettyCash /></Suspense></ProtectedRoute>} />
              <Route path="/drawings" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Drawings /></Suspense></ProtectedRoute>} />
              <Route path="/checklists" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Checklists /></Suspense></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Billing /></Suspense></ProtectedRoute>} />
              <Route path="/documents" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Documents /></Suspense></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Vendors /></Suspense></ProtectedRoute>} />
              <Route path="/scheduling" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Scheduling /></Suspense></ProtectedRoute>} />
              <Route path="/report-builder" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ReportBuilder /></Suspense></ProtectedRoute>} />
              <Route path="/photo-progress" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><PhotoProgress /></Suspense></ProtectedRoute>} />
              <Route path="/transfers" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><InventoryTransfers /></Suspense></ProtectedRoute>} />
              <Route path="/meetings" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><MeetingMinutes /></Suspense></ProtectedRoute>} />
              <Route path="/equipment" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Equipment /></Suspense></ProtectedRoute>} />
              <Route path="/safety" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Safety /></Suspense></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><TeamChat /></Suspense></ProtectedRoute>} />
              <Route path="/client-portal" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ClientPortal /></Suspense></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Profile /></Suspense></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Settings /></Suspense></ProtectedRoute>} />
              <Route path="/seed-data" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><SeedData /></Suspense></ProtectedRoute>} />
              <Route path="/portal/:token" element={<Suspense fallback={<PageLoader />}><PortalView /></Suspense>} />
              <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
