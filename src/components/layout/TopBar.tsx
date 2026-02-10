import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Search } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useNavigate } from "react-router-dom";

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border/40 glass px-4">
      <SidebarTrigger className="hover:bg-accent/50 transition-all duration-200 ease-apple rounded-xl flex-shrink-0" />

      {/* Apple-style search bar - centered */}
      <div className="flex-1 flex justify-center px-4">
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search projects, tasks, issues..."
            className="w-full h-9 pl-10 pr-4 rounded-xl bg-muted/40 border border-border/30 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-background transition-all duration-200 ease-apple"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                navigate("/projects");
              }
            }}
          />
        </div>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <ThemeToggle />
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-border/40 hover:ring-primary/30 transition-all duration-200 ease-apple p-0 ml-1">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 shadow-apple-lg rounded-xl p-1.5">
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem className="cursor-pointer rounded-lg h-10 px-3" onClick={() => navigate('/profile')}>
              <User className="mr-2.5 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem onClick={async () => { await signOut(); navigate('/home'); }} className="text-destructive cursor-pointer rounded-lg h-10 px-3">
              <LogOut className="mr-2.5 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
