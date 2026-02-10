import { useState } from "react";
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import PublicLayout from "@/components/layout/PublicLayout";

const contactInfo = [
  { icon: MapPin, label: "Office Address", value: "4th floor, 1498, 19th Main, Sector 4, HSR Layout, Bengaluru 560038, Karnataka, India" },
  { icon: Mail, label: "Email", value: "hello@buildflow.in" },
  { icon: Phone, label: "Phone", value: "+91 80-4567-8900" },
  { icon: Clock, label: "Working Hours", value: "Mon - Fri, 9:00 AM - 6:00 PM IST" },
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <PublicLayout>
      <section className="py-16 sm:py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">Contact</Badge>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-4">Get in touch</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10">
            <div>
              <h2 className="text-xl font-semibold mb-6">Contact information</h2>
              <div className="space-y-5">
                {contactInfo.map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                      <p className="text-sm font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Card>
              {submitted ? (
                <CardContent className="py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
                    <CheckCircle2 className="h-7 w-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Thank you!</h3>
                  <p className="text-sm text-muted-foreground">We've received your message and will get back to you within 24 hours.</p>
                </CardContent>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle>Send us a message</CardTitle>
                    <CardDescription>Fill out the form below and our team will reach out.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" required placeholder="John" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" required placeholder="Doe" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" required placeholder="john@example.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" type="tel" placeholder="+91 98765 43210" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" rows={4} required placeholder="Tell us about your project..." />
                      </div>
                      <Button type="submit" className="w-full">Send Message</Button>
                    </form>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
