import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import PublicLayout from "@/components/layout/PublicLayout";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "Perfect for small teams getting started",
    features: ["Up to 3 projects", "5 team members", "Basic task management", "Mobile app access", "Email support"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "₹4,999",
    period: "/month",
    desc: "For growing construction businesses",
    features: ["Unlimited projects", "25 team members", "Material & labour management", "Reports & dashboard", "Issue tracking", "Petty cash management", "Priority support"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For large organizations with custom needs",
    features: ["Everything in Professional", "Unlimited team members", "Custom integrations", "Dedicated account manager", "On-site training", "SLA guarantee", "Advanced analytics"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const faqs = [
  { q: "Is there a free trial?", a: "Yes! Our Professional plan comes with a 14-day free trial. No credit card required." },
  { q: "Can I change plans later?", a: "Absolutely. You can upgrade or downgrade your plan at any time from your account settings." },
  { q: "What payment methods do you accept?", a: "We accept all major credit/debit cards, UPI, net banking, and bank transfers for annual plans." },
  { q: "Is my data secure?", a: "Yes. We use industry-standard encryption and your data is hosted on secure cloud servers with regular backups." },
];

export default function Pricing() {
  return (
    <PublicLayout>
      <section className="py-20 sm:py-24 md:py-32 hero-gradient">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5">Pricing</Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-5">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Choose the plan that fits your construction business. No hidden fees.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className={`relative flex flex-col border-0 shadow-apple ${plan.highlighted ? "ring-2 ring-primary shadow-apple-lg scale-[1.02]" : ""}`}>
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-apple-sm">Most Popular</Badge>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.desc}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-8">
                    <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                  </div>
                  <ul className="space-y-3.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${plan.highlighted ? "bg-primary/10" : "bg-muted"}`}>
                          <Check className={`h-3 w-3 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4">
                  <Button className="w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
                    <Link to="/auth">{plan.cta}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 bg-muted/30">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-center mb-10 tracking-tight">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-5 data-[state=open]:shadow-apple transition-all duration-200 ease-apple">
                <AccordionTrigger className="text-left text-[15px] font-medium py-5 hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </PublicLayout>
  );
}
