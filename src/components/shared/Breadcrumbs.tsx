import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  "": "Dashboard",
  "projects": "Projects",
  "tasks": "Tasks",
  "materials": "Materials",
  "labour": "Labour",
  "issues": "Issues",
  "reports": "Reports",
  "settings": "Settings",
  "profile": "Profile",
  "petty-cash": "Petty Cash",
  "drawings": "Drawings",
  "checklists": "Checklists",
  "billing": "Billing",
  "documents": "Documents",
  "vendors": "Vendors",
  "scheduling": "Scheduling",
  "report-builder": "Report Builder",
  "photo-progress": "Photo Progress",
  "transfers": "Inventory Transfers",
  "meetings": "Meeting Minutes",
  "equipment": "Equipment",
  "safety": "Safety",
  "chat": "Team Chat",
  "client-portal": "Client Portal",
  "portal": "Portal",
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <Link to="/" className="flex items-center hover:text-foreground transition-colors duration-200">
        <Home className="h-4 w-4" />
      </Link>
      {segments.map((segment, idx) => {
        const path = "/" + segments.slice(0, idx + 1).join("/");
        const label = routeLabels[segment] || segment;
        const isLast = idx === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            {isLast ? (
              <span className="text-foreground font-medium capitalize">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors duration-200 capitalize">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
