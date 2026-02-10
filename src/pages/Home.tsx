import { Link } from "react-router-dom";
import { useState } from "react";
import { 
  HardHat, Menu, ArrowRight, Building2, Users, ClipboardList, 
  BarChart3, Shield, Zap, Clock, TrendingUp, CheckCircle2,
  Layers, Target, Workflow
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const capabilities = [
  {
    icon: Building2,
    title: "Project Tracking",
    description: "Monitor all your construction projects from a single dashboard with real-time progress updates.",
  },
  {
    icon: Users,
    title: "Team Coordination",
    description: "Keep your office and site teams aligned with instant communication and task assignments.",
  },
  {
    icon: ClipboardList,
    title: "Material Control",
    description: "Track inventory, generate purchase orders, and manage material flow across all sites.",
  },
  {
    icon: BarChart3,
    title: "Smart Reports",
    description: "Generate daily progress reports, financial summaries, and compliance documents instantly.",
  },
  {
    icon: Shield,
    title: "Safety Management",
    description: "Log incidents, conduct toolbox talks, and maintain safety compliance records.",
  },
  {
    icon: Zap,
    title: "Issue Resolution",
    description: "Identify blockers early and resolve issues before they impact your timeline.",
  },
];

const metrics = [
  { value: "40%", label: "Faster project delivery", icon: Clock },
  { value: "7%", label: "Cost savings on average", icon: TrendingUp },
  { value: "100%", label: "Report accuracy", icon: Target },
  { value: "25+", label: "Hours saved weekly", icon: Zap },
];

const workflowSteps = [
  {
    step: "01",
    title: "Set Up Your Projects",
    description: "Create projects, define budgets, set timelines, and invite your team members.",
  },
  {
    step: "02", 
    title: "Manage Daily Operations",
    description: "Track attendance, assign tasks, log materials, and monitor progress in real-time.",
  },
  {
    step: "03",
    title: "Generate Insights",
    description: "Get automated reports, track expenses, and make data-driven decisions.",
  },
];

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/home" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <HardHat className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold tracking-tight">BuildFlow</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              {[
                { label: "Features", href: "/features" },
                { label: "Pricing", href: "/pricing" },
                { label: "About", href: "/about" },
                { label: "Contact", href: "/contact" },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-0">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2.5 p-4 border-b">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                        <HardHat className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <span className="font-semibold">BuildFlow</span>
                    </div>
                    <nav className="flex-1 p-4 space-y-1">
                      {["Features", "Pricing", "About", "Contact"].map((item) => (
                        <Link
                          key={item}
                          to={`/${item.toLowerCase()}`}
                          className="block px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
                          onClick={() => setMobileOpen(false)}
                        >
                          {item}
                        </Link>
                      ))}
                    </nav>
                    <div className="p-4 border-t space-y-2">
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/auth">Sign in</Link>
                      </Button>
                      <Button className="w-full" asChild>
                        <Link to="/auth">Get Started</Link>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Clean gradient design */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              Construction Management Platform
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Build projects with
              <span className="text-primary"> clarity and control</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              A unified platform for construction teams to manage projects, track materials, 
              coordinate labour, and deliver on time — every time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-12 px-8" asChild>
                <Link to="/auth">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" asChild>
                <Link to="/features">See How It Works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="border-y bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {metrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <metric.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-bold tracking-tight">{metric.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything you need to manage construction
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From project planning to final handover, BuildFlow covers every aspect of construction management.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap) => (
              <Card key={cap.title} className="group hover:shadow-lg transition-all duration-300 border-border/50">
                <CardContent className="p-6">
                  <div className="mb-4 p-3 rounded-xl bg-primary/10 w-fit group-hover:bg-primary/20 transition-colors">
                    <cap.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{cap.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cap.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Simple to get started
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get your team up and running in minutes, not weeks.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {workflowSteps.map((item, index) => (
              <div key={item.step} className="relative">
                {index < workflowSteps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-px bg-border" />
                )}
                <div className="relative bg-background rounded-2xl p-6 border">
                  <div className="text-5xl font-bold text-primary/20 mb-4">{item.step}</div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">For Construction Teams</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
                Built for how construction actually works
              </h2>
              <p className="text-muted-foreground mb-8">
                We understand that construction projects are complex. That's why BuildFlow is designed 
                to handle the real challenges you face every day — from coordinating multiple sites 
                to managing hundreds of workers.
              </p>
              <div className="space-y-4">
                {[
                  "Real-time sync between office and site",
                  "Works offline for remote locations",
                  "Role-based access for owners, PMs, and engineers",
                  "Automated daily progress reports",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-8" asChild>
                <Link to="/features">Explore All Features <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 p-8">
                  <div className="bg-background rounded-2xl p-6 shadow-lg">
                    <Layers className="h-8 w-8 text-primary mb-3" />
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-xs text-muted-foreground">Active Projects</div>
                  </div>
                  <div className="bg-background rounded-2xl p-6 shadow-lg">
                    <Users className="h-8 w-8 text-primary mb-3" />
                    <div className="text-2xl font-bold">248</div>
                    <div className="text-xs text-muted-foreground">Team Members</div>
                  </div>
                  <div className="bg-background rounded-2xl p-6 shadow-lg">
                    <Target className="h-8 w-8 text-primary mb-3" />
                    <div className="text-2xl font-bold">94%</div>
                    <div className="text-xs text-muted-foreground">On-Time Delivery</div>
                  </div>
                  <div className="bg-background rounded-2xl p-6 shadow-lg">
                    <Workflow className="h-8 w-8 text-primary mb-3" />
                    <div className="text-2xl font-bold">1.2K</div>
                    <div className="text-xs text-muted-foreground">Tasks Completed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
            Ready to streamline your construction projects?
          </h2>
          <p className="text-lg text-primary-foreground/70 mb-10 max-w-2xl mx-auto">
            Join thousands of construction professionals who trust BuildFlow to deliver projects on time and within budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="h-12 px-8" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 border-white/40 text-white hover:bg-white/10 bg-white/5" asChild>
              <Link to="/contact">Talk to Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                  <HardHat className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">BuildFlow</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Construction management made simple.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link to="/testimonials" className="hover:text-foreground transition-colors">Testimonials</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 BuildFlow. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
