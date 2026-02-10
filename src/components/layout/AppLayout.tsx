import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-muted/20">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <Breadcrumbs />
            <ErrorBoundary>
              <div className="animate-fade-in">
                {children}
              </div>
            </ErrorBoundary>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
