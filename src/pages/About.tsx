import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PublicLayout from "@/components/layout/PublicLayout";

const stats = [
  { value: "700K+", label: "App Downloads" },
  { value: "85,000+", label: "Projects Managed" },
  { value: "25+ Hrs", label: "Saved Weekly" },
  { value: "4.5★", label: "App Store Rating" },
];

const roles = [
  { title: "Owners", desc: "Maximize business potential with complete project visibility and financial oversight across all your sites.", image: "/Owner.jpg" },
  { title: "Project Managers", desc: "Plan tasks effortlessly, track milestones, and deliver on time with real-time progress tracking.", image: "/PM.jpg" },
  { title: "Site Engineers", desc: "Stay connected with office teams, report from the field, and enhance collaboration on the go.", image: "/SE.jpg" },
];

export default function About() {
  return (
    <PublicLayout>
      <section className="py-16 sm:py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">Our Story</Badge>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Digitizing construction, one project at a time
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            We're on a mission to bring the construction industry into the digital age with tools that actually work on site.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
                Building the future of construction technology
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  BuildFlow was founded with a simple vision: construction professionals deserve better tools than paper tracking, WhatsApp groups, and Excel sheets.
                </p>
                <p>
                  Our platform brings together project management, material tracking, labour management, and real-time reporting into one seamless experience that works on both mobile and desktop.
                </p>
                <p>
                  Today, we serve thousands of construction companies, managing 85,000+ projects and helping teams save 25+ hours every week.
                </p>
              </div>
            </div>
            <div>
              <img src="/map-min.jpg" alt="Our reach" className="w-full rounded-xl border shadow-sm" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <Card key={s.label} className="text-center">
                <CardContent className="pt-6">
                  <p className="text-3xl md:text-4xl font-bold text-primary">{s.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-3">Who We Serve</Badge>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Built for every role on site</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.title} className="overflow-hidden group">
                <div className="overflow-hidden">
                  <img src={role.image} alt={role.title} className="w-full h-[240px] object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <CardContent className="pt-5">
                  <h3 className="text-lg font-semibold mb-2">{role.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{role.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Join the BuildFlow community</h2>
          <p className="text-primary-foreground/70 mb-8">Start managing your construction projects smarter today.</p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth">Get Started Free</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
