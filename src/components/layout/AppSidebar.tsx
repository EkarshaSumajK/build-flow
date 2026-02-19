import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Settings,
  HardHat,
  MessageCircle,
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

const mainNav = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/" },
  { title: "Projects", icon: FolderKanban, path: "/projects" },
  { title: "Tasks", icon: ClipboardList, path: "/tasks" },
  { title: "Team Chat", icon: MessageCircle, path: "/chat" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

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
