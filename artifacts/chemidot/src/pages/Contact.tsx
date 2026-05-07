import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, MapPin, MessageSquare, Clock, Send, ArrowRight, CheckCircle2 } from "lucide-react";
import { MotionCTAButton } from "@/components/MotionCTAButton";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const CONTACT_INFO = [
  { icon: MapPin,       label: "Headquarters",      value: "King Fahd Road, Riyadh 12214\nKingdom of Saudi Arabia" },
  { icon: Mail,         label: "Email",             value: "hello@chemidot.com",     href: "mailto:hello@chemidot.com" },
  { icon: Phone,        label: "Phone / WhatsApp",  value: "+966 11 XXX XXXX",       href: "tel:+96611xxxxxxx" },
  { icon: Clock,        label: "Business Hours",    value: "Sun – Thu: 8:00 AM – 5:00 PM AST\nFri – Sat: Closed" },
];

const SUBJECTS = [
  "General Inquiry", "Supplier Onboarding", "Buyer Account Help",
  "Technical Support", "Partnership & Enterprise", "Media & Press", "Other",
];

const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", company: "", subject: "", message: "" };

export default function Contact() {
  const { toast } = useToast();
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formKey, setFormKey]     = useState(0);
  const [form, setForm]           = useState(EMPTY_FORM);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Something went wrong");
      }
      setForm(EMPTY_FORM);
      setSubmitted(true);
    } catch (err) {
      toast({ title: "Failed to send message", description: err instanceof Error ? err.message : "Please try again or email us directly.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-hero pt-32 pb-20">
        <div className="absolute inset-0 grid-pattern [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 md:px-10 relative">
          <div className="mx-auto max-w-3xl text-center animate-fade-up space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
              <MessageSquare className="h-3.5 w-3.5 text-accent" />
              <span>Get in Touch</span>
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-primary md:text-6xl">
              We'd love to{" "}
              <span className="text-gradient">hear from you.</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              Whether you're a supplier looking to list your products, a buyer with sourcing questions, or a partner exploring integrations, our team is ready.
            </p>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="py-16 md:py-20 bg-surface-soft">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid lg:grid-cols-3 gap-10">

            {/* Left: contact info */}
            <div className="space-y-8">
              <div className="rounded-xl border border-border bg-white p-7 shadow-card-premium space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-primary mb-1">Contact Information</h2>
                  <p className="text-muted-foreground text-sm">Reach us directly or use the form and we'll respond within 24 hours.</p>
                </div>

                <div className="space-y-5">
                  {CONTACT_INFO.map(c => (
                    <div key={c.label} className="flex items-start gap-4">
                      <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shrink-0 shadow-glow">
                        <c.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{c.label}</p>
                        {c.href ? (
                          <a href={c.href} className="text-sm font-medium hover:text-primary transition-colors whitespace-pre-line">{c.value}</a>
                        ) : (
                          <p className="text-sm font-medium whitespace-pre-line">{c.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick links */}
              <div className="rounded-xl border border-border bg-white p-7 shadow-card-premium space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Quick Links</p>
                {[
                  { label: "Become a Supplier",  href: "/for-suppliers" },
                  { label: "Start Sourcing",      href: "/for-buyers" },
                  { label: "Browse Marketplace",  href: "/marketplace" },
                ].map(l => (
                  <a key={l.href} href={l.href} className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors group">
                    <ArrowRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
                    {l.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Right: form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <div className="rounded-xl border border-border bg-white p-10 shadow-card-premium flex flex-col items-center justify-center text-center min-h-[420px] space-y-5">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-primary">Message sent!</h2>
                    <p className="text-muted-foreground max-w-sm">Thank you for reaching out. Our team will get back to you within 1 business day.</p>
                  </div>
                  <Button variant="outline" onClick={() => { setForm(EMPTY_FORM); setFormKey(k => k + 1); setSubmitted(false); }}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-white p-8 shadow-card-premium">
                  <h2 className="text-xl font-bold text-primary mb-1">Send us a message</h2>
                  <p className="text-muted-foreground text-sm mb-8">Fill out the form below and we'll get back to you within 1 business day.</p>

                  <form key={formKey} onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" required placeholder="Ahmed" value={form.firstName} onChange={handleChange} disabled={loading} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" required placeholder="Al-Rashid" value={form.lastName} onChange={handleChange} disabled={loading} />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="email">Work Email</Label>
                        <Input id="email" type="email" required placeholder="ahmed@company.com" value={form.email} onChange={handleChange} disabled={loading} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone / WhatsApp</Label>
                        <Input id="phone" type="tel" placeholder="+966 5X XXX XXXX" value={form.phone} onChange={handleChange} disabled={loading} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name</Label>
                      <Input id="company" required placeholder="Your Company Ltd." value={form.company} onChange={handleChange} disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select onValueChange={v => setForm(prev => ({ ...prev, subject: v }))} value={form.subject} required>
                        <SelectTrigger><SelectValue placeholder="What can we help you with?" /></SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" required placeholder="Tell us about your inquiry..." rows={5} value={form.message} onChange={handleChange} disabled={loading} className="resize-none" />
                    </div>
                    <MotionCTAButton type="submit" className="w-full" disabled={loading}>
                      {loading ? <>⟳ Sending…</> : <><Send className="w-4 h-4" /> Send Message</>}
                    </MotionCTAButton>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
