import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Package,
  Users,
  AlertTriangle,
  BarChart3,
  Settings,
  HardHat,
  Wallet,
  PenTool,
  ClipboardCheck,
  Receipt,
  FileArchive,
  Building2,
  CalendarClock,
  FileBarChart,
  Camera,
  ArrowLeftRight,
  NotebookPen,
  Wrench,
  ShieldAlert,
  MessageCircle,
  Globe,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useRole, AppPermission } from "@/hooks/useRole";

interface NavItem {
  title: string;
  icon: any;
  path: string;
  permission?: AppPermission;
}

const mainNav: NavItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Projects", icon: FolderKanban, path: "/projects" },
  { title: "Tasks", icon: ClipboardList, path: "/tasks" },
  { title: "Team Chat", icon: MessageCircle, path: "/chat" },
];

const managementNav: NavItem[] = [
  { title: "Materials", icon: Package, path: "/materials", permission: "materials:manage" },
  { title: "Transfers", icon: ArrowLeftRight, path: "/transfers", permission: "materials:manage" },
  { title: "Labour", icon: Users, path: "/labour", permission: "attendance:manage" },
  { title: "Equipment", icon: Wrench, path: "/equipment" },
  { title: "Scheduling", icon: CalendarClock, path: "/scheduling", permission: "scheduling:manage" },
  { title: "Vendors", icon: Building2, path: "/vendors", permission: "vendors:manage" },
  { title: "Drawings", icon: PenTool, path: "/drawings", permission: "drawings:manage" },
  { title: "Documents", icon: FileArchive, path: "/documents", permission: "documents:manage" },
  { title: "Checklists", icon: ClipboardCheck, path: "/checklists", permission: "checklists:manage" },
  { title: "Billing", icon: Receipt, path: "/billing", permission: "billing:manage" },
  { title: "Petty Cash", icon: Wallet, path: "/petty-cash", permission: "petty_cash:create" },
  { title: "Issues", icon: AlertTriangle, path: "/issues" },
  { title: "Safety", icon: ShieldAlert, path: "/safety" },
  { title: "Photo Progress", icon: Camera, path: "/photo-progress" },
  { title: "Meetings", icon: NotebookPen, path: "/meetings" },
  { title: "Reports", icon: BarChart3, path: "/reports", permission: "reports:view" },
  { title: "Report Builder", icon: FileBarChart, path: "/report-builder", permission: "reports:view" },
  { title: "Client Portal", icon: Globe, path: "/client-portal" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useRole();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const visibleManagementNav = managementNav.filter(
    (item) => !item.permission || can(item.permission)
  );

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-apple-sm transition-transform duration-200 group-hover:scale-105">
            <HardHat className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">BuildFlow</span>
            <span className="text-[11px] text-sidebar-foreground/50">Construction</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-2 font-medium">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.title}
                    className="rounded-xl h-10 transition-all duration-200 ease-apple data-[active=true]:bg-primary/10 data-[active=true]:text-primary hover:bg-sidebar-accent"
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    <span className="font-medium text-[13px]">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-2 font-medium">Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {visibleManagementNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.title}
                    className="rounded-xl h-10 transition-all duration-200 ease-apple data-[active=true]:bg-primary/10 data-[active=true]:text-primary hover:bg-sidebar-accent"
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    <span className="font-medium text-[13px]">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isActive("/settings")}
              onClick={() => navigate("/settings")}
              tooltip="Settings"
              className="rounded-xl h-10 transition-all duration-200 ease-apple data-[active=true]:bg-primary/10 data-[active=true]:text-primary hover:bg-sidebar-accent"
            >
              <Settings className="h-[18px] w-[18px]" />
              <span className="font-medium text-[13px]">Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
