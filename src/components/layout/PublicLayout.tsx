import { Link } from "react-router-dom";
import { useState } from "react";
import { HardHat, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

const navMenus = [
  {
    label: "Features",
    items: [
      { label: "Project Management", href: "/features", desc: "Track progress and deliver on time" },
      { label: "Material Management", href: "/features", desc: "Real-time stock visibility" },
      { label: "Labour Management", href: "/features", desc: "Attendance and payroll tracking" },
      { label: "Issue Tracking", href: "/features", desc: "Identify and resolve blockers" },
      { label: "Reports & Dashboard", href: "/features", desc: "Actionable project insights" },
      { label: "Petty Cash", href: "/features", desc: "Expense tracking and approvals" },
    ],
  },
  {
    label: "Solutions",
    items: [
      { label: "For Owners", href: "/about", desc: "Complete project visibility" },
      { label: "For Project Managers", href: "/about", desc: "Plan and deliver efficiently" },
      { label: "For Site Engineers", href: "/about", desc: "Field-to-office collaboration" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Blog", href: "/blog", desc: "Industry insights and tips" },
      { label: "Testimonials", href: "/testimonials", desc: "Customer success stories" },
    ],
  },
];

const footerLinks = {
  Features: [
    { label: "Project Management", href: "/features" },
    { label: "Material Management", href: "/features" },
    { label: "Labour Management", href: "/features" },
    { label: "Issue Tracking", href: "/features" },
    { label: "Reports & Dashboard", href: "/features" },
    { label: "Petty Cash", href: "/features" },
  ],
  Resources: [
    { label: "Blog", href: "/blog" },
    { label: "Testimonials", href: "/testimonials" },
    { label: "Contact Us", href: "/contact" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Careers", href: "/about" },
  ],
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Apple-style frosted glass header */}
      <header className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/home" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-apple-sm transition-transform duration-200 group-hover:scale-105">
                <HardHat className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold tracking-tight">BuildFlow</span>
            </Link>

            {/* Desktop nav */}
            <NavigationMenu className="hidden lg:flex">
              <NavigationMenuList className="gap-1">
                {navMenus.map((menu) => (
                  <NavigationMenuItem key={menu.label}>
                    <NavigationMenuTrigger className="bg-transparent h-9 px-4 text-[13px] font-medium rounded-lg hover:bg-accent/50 data-[state=open]:bg-accent/50">
                      {menu.label}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[420px] gap-1 p-3">
                        {menu.items.map((item) => (
                          <li key={item.label}>
                            <NavigationMenuLink asChild>
                              <Link
                                to={item.href}
                                className="block select-none rounded-xl p-3.5 leading-none no-underline outline-none transition-all duration-200 ease-apple hover:bg-accent/50"
                              >
                                <div className="text-sm font-medium leading-none">{item.label}</div>
                                <p className="line-clamp-1 text-xs leading-snug text-muted-foreground mt-1.5">{item.desc}</p>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
                {[
                  { label: "About", href: "/about" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Contact", href: "/contact" },
                ].map((item) => (
                  <NavigationMenuItem key={item.label}>
                    <Link
                      to={item.href}
                      className="group inline-flex h-9 w-max items-center justify-center rounded-lg bg-transparent px-4 text-[13px] font-medium transition-colors hover:bg-accent/50"
                    >
                      {item.label}
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>

            {/* Mobile menu */}
            <div className="flex items-center gap-1 lg:hidden">
              <ThemeToggle />
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] p-0">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 p-5 border-b">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80">
                        <HardHat className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="text-lg font-semibold">BuildFlow</span>
                    </div>
                    <nav className="flex-1 p-4 space-y-1">
                      {[
                        { label: "Features", href: "/features" },
                        { label: "About", href: "/about" },
                        { label: "Pricing", href: "/pricing" },
                        { label: "Blog", href: "/blog" },
                        { label: "Testimonials", href: "/testimonials" },
                        { label: "Contact", href: "/contact" },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="block rounded-xl px-4 py-3 text-[15px] font-medium text-foreground hover:bg-accent/50 transition-all duration-200 ease-apple"
                          onClick={() => setMobileOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </nav>
                    <div className="p-4 border-t space-y-3">
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/auth" onClick={() => setMobileOpen(false)}>Sign in</Link>
                      </Button>
                      <Button className="w-full" asChild>
                        <Link to="/auth" onClick={() => setMobileOpen(false)}>Get Started</Link>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Apple-style minimal footer */}
      <footer className="border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">{title}</h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.href} className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-200">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Download</h4>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" className="justify-start" asChild>
                  <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer">iOS App</a>
                </Button>
                <Button variant="outline" size="sm" className="justify-start" asChild>
                  <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer">Android</a>
                </Button>
              </div>
            </div>
          </div>
          <Separator className="my-10" />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
                <HardHat className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">© 2026 BuildFlow. All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <Link to="/about" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
