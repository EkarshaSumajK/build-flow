import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FolderKanban, Package, Users, AlertTriangle, BarChart3, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PublicLayout from "@/components/layout/PublicLayout";

const features = [
  {
    title: "Project Management",
    desc: "Manage projects on mobile and desktop with real-time updates, enhanced collaboration, and increased efficiency.",
    bullets: ["Track project progress at a glance", "Avoid delays with quick insights", "Generate detailed daily progress reports", "Assign tasks and monitor completion"],
    image: "/projectw.webp",
    icon: FolderKanban,
  },
  {
    title: "Material Management",
    desc: "Real-time visibility of material stock on site with streamlined procurement workflows.",
    bullets: ["Procure and allocate materials faster", "Prevent material loss or theft", "Generate instant POs and GRNs", "Track consumption per project"],
    image: "/materialw.webp",
    icon: Package,
  },
  {
    title: "Labour Management",
    desc: "Precisely track attendance and manage payroll with automated calculations.",
    bullets: ["Accurate attendance data", "Distribute tasks among labourers", "Individual and team productivity insights", "Automated payroll calculations"],
    image: "/labourw.webp",
    icon: Users,
  },
  {
    title: "Issue Tracking",
    desc: "Identify and resolve blockers quickly with centralized issue management.",
    bullets: ["Real-time issue updates", "Centralized tracking dashboard", "Priority-based resolution", "Photo documentation for every issue"],
    image: "/issuew-1.webp",
    icon: AlertTriangle,
  },
  {
    title: "Reports & Dashboard",
    desc: "Actionable insights to help you make faster, data-driven decisions.",
    bullets: ["Instant reports for fast decisions", "Track progress and blockers easily", "Customizable report templates", "Export in PDF and Excel"],
    image: "/projectw.webp",
    icon: BarChart3,
  },
  {
    title: "Petty Cash",
    desc: "Track every expense with categorization, approval workflows, and comprehensive reports.",
    bullets: ["Monitor daily expenses", "Categorize every transaction", "Comprehensive transactional reports", "Approval workflows for expenses"],
    image: "/pettyw.webp",
    icon: Wallet,
  },
];

export default function Features() {
  return (
    <PublicLayout>
      <section className="py-16 sm:py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">Features</Badge>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Everything you need to manage construction
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            From planning to execution, BuildFlow brings your entire construction workflow into one platform.
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {features.map((feature, i) => (
        <section key={feature.title} className={`py-16 md:py-24 ${i % 2 === 0 ? "bg-background" : "bg-muted/30"}`}>
          <div className="max-w-6xl mx-auto px-4">
            <div className={`grid lg:grid-cols-2 gap-12 items-center ${i % 2 !== 0 ? "lg:[direction:rtl]" : ""}`}>
              <div className={i % 2 !== 0 ? "lg:[direction:ltr]" : ""}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <Badge variant="outline">{feature.title}</Badge>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">{feature.title}</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">{feature.desc}</p>
                <ul className="space-y-3 mb-8">
                  {feature.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="link" className="px-0" asChild>
                  <Link to="/auth">Learn more <ArrowRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </div>
              <div className={`flex justify-center ${i % 2 !== 0 ? "lg:[direction:ltr]" : ""}`}>
                <img src={feature.image} alt={feature.title} className="max-h-[480px] w-auto rounded-xl border shadow-lg" />
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to streamline your projects?</h2>
          <p className="text-primary-foreground/70 mb-8">Join thousands of construction professionals using BuildFlow.</p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth">Start Free Trial</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
