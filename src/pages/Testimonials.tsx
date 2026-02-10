import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PublicLayout from "@/components/layout/PublicLayout";

const testimonials = [
  {
    heading: "Best desktop solution we've used",
    name: "Mr. Kuppuswamy",
    company: "Estate Officer, Tanuvas",
    quote: "We've been using BuildFlow for almost a year, and it's helped us save time by giving project visibility to all team members. We can mitigate risks daily and avoid last-minute delays. The desktop solution helps us document all reports and progress seamlessly.",
    image: "/karthik.jpg",
  },
  {
    heading: "Streamlined our entire workflow",
    name: "Chetan Patel",
    company: "Founder of Dezign Code",
    quote: "The best part about BuildFlow is that there are no complex procedures. It has helped me streamline my work — I don't have to rely on my memory or numerous messages. My team uses it regularly, saving time on weekly report meetings.",
    image: "/chetan.jpg",
  },
  {
    heading: "A one-stop solution for construction",
    name: "Karthik",
    company: "Director, Jay Constructions",
    quote: "Before BuildFlow, WhatsApp was our only communication channel. We didn't realize how much time and money was being lost to communication gaps. Now it's a one-stop solution where we communicate, collaborate, and manage without hassle.",
    image: "/karthik.jpg",
  },
  {
    heading: "Transformed our project delivery",
    name: "Rajesh Kumar",
    company: "CEO, BuildRight Constructions",
    quote: "Since implementing BuildFlow, we've seen a 40% improvement in project delivery times. Real-time tracking and automated reporting have eliminated guesswork from our operations. Our clients are happier and our teams more productive.",
    image: "/Owner.jpg",
  },
  {
    heading: "Material tracking made effortless",
    name: "Priya Sharma",
    company: "Project Manager, Urban Developers",
    quote: "Material management was our biggest pain point. With BuildFlow, we track every item from procurement to consumption. PO and GRN generation has saved us countless hours of manual work every week.",
    image: "/PM.jpg",
  },
  {
    heading: "Perfect for site engineers",
    name: "Arun Mehta",
    company: "Site Engineer, Metro Constructions",
    quote: "As a site engineer, I need to stay connected with the office team while managing on-ground activities. BuildFlow's mobile app lets me update progress, report issues, and track attendance right from the site.",
    image: "/SE.jpg",
  },
];

export default function Testimonials() {
  return (
    <PublicLayout>
      <section className="py-16 sm:py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">Testimonials</Badge>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Loved by construction teams
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Hear from professionals who trust BuildFlow to manage their projects.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="card-hover">
                <CardContent className="pt-6">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <h3 className="text-base font-semibold mb-3">{t.heading}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5 line-clamp-5">"{t.quote}"</p>
                  <Separator className="mb-4" />
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={t.image} alt={t.name} />
                      <AvatarFallback>{t.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Join thousands of happy teams</h2>
          <p className="text-primary-foreground/70 mb-8">Start your free trial today and see the difference.</p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth">Start Free Trial</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
