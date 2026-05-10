import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowRight, ArrowUpRight, CheckCircle2, Globe2, BarChart3, MessageSquare,
  ShieldCheck, Users, Zap, Star, Package, TrendingUp, Bell, Store,
} from "lucide-react";
import { MotionCTAButton } from "@/components/MotionCTAButton";

const BENEFITS = [
  { icon: Globe2, title: "Reach Thousands of Verified Buyers", desc: "Your products are instantly visible to procurement managers at manufacturers, distributors, and research labs across Saudi Arabia and the wider Gulf." },
  { icon: BarChart3, title: "Data-Driven Sales Intelligence", desc: "See who viewed your products, track RFQ conversion rates, and understand which industries are most interested in your catalog." },
  { icon: MessageSquare, title: "Direct Buyer Communication", desc: "Respond to RFQs, answer technical questions, and negotiate pricing directly, no middleman cutting into your margins." },
  { icon: ShieldCheck, title: "Verified Supplier Badge", desc: "Our verification process signals credibility to buyers. Verified suppliers receive more quote requests than unverified listings." },
  { icon: Users, title: "Collective Order Participation", desc: "List your products as eligible for collective buying and win bulk orders that aggregate demand from multiple buyers simultaneously." },
  { icon: TrendingUp, title: "Lower Cost of Customer Acquisition", desc: "Stop spending on trade shows and cold outreach. Chemidot's inbound buyer traffic means qualified leads come to you, at a fraction of traditional marketing costs." },
];

const STEPS = [
  { step: "01", title: "Create Your Storefront", desc: "Register, verify your commercial license, and upload your product catalog. Our team reviews your application within 48 hours.", icon: Store },
  { step: "02", title: "List Your Products", desc: "Add products with specifications, TDS/SDS documents, pricing tiers, MOQ, and availability. Buyers see exactly what they need to make decisions fast.", icon: Package },
  { step: "03", title: "Receive & Close RFQs", desc: "Buyers send you structured quote requests. Respond directly through the platform, negotiate, and confirm orders, all tracked and auditable.", icon: Bell },
];

const FEATURES = [
  "Supplier storefront with branded profile page",
  "Plan-based product publishing limits",
  "TDS / SDS document upload and management",
  "Structured RFQ inbox with quote builder",
  "Real-time buyer messaging",
  "Collective order opt-in per product",
  "Analytics dashboard (views, RFQs, conversions)",
  "Verified Supplier badge on eligible plans",
  "Multi-currency pricing (SAR, USD, EUR)",
  "Arabic and English product descriptions",
  "API access for catalog sync (Enterprise)",
  "Dedicated account manager (Enterprise)",
];

const FEATURE_CARDS = [
  { icon: Globe2, title: "Gulf-Wide Buyers", desc: "Reach buyers across Saudi Arabia & GCC" },
  { icon: Zap, title: "Fast Onboarding", desc: "Go live within 48 hours of applying" },
  { icon: BarChart3, title: "Sales Analytics", desc: "Track views, RFQs & conversions" },
  { icon: Store, title: "Trial First", desc: "Start with a free 14-day trial" },
];

const PRICING_PLANS = [
  {
    name: "Trial",
    price: "Free",
    sub: "14 days",
    cta: "Start Free Trial",
    href: "/auth/register",
    featured: false,
    features: ["Up to 3 products", "Basic supplier storefront", "Basic SDS/TDS support", "Up to 10 RFQs", "No premium exposure"],
  },
  {
    name: "Starter",
    price: "SAR 499",
    sub: "per month or SAR 4,999/year",
    cta: "Start Free Trial",
    href: "/auth/register",
    featured: false,
    features: ["Up to 10 products", "Public storefront", "Basic RFQ access", "Buyer inquiries", "Standard marketplace visibility", "SDS/TDS uploads"],
  },
  {
    name: "Growth",
    price: "SAR 1,499",
    sub: "per month or SAR 14,999/year",
    cta: "Start Free Trial",
    href: "/auth/register",
    featured: true,
    features: ["Up to 50 products", "Better marketplace ranking", "RFQ response access", "Featured product slots", "Supplier badge", "Basic analytics", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "For large manufacturers and strategic distributors",
    cta: "Contact Sales",
    href: "/contact",
    featured: false,
    features: ["High or unlimited catalog", "Premium placement", "Homepage featured supplier", "Custom onboarding", "Dedicated account handling", "Manual invoicing", "Future API/ERP support"],
  },
];

export default function ForSuppliers() {
  return (
    <MainLayout>
      <section className="relative overflow-hidden bg-hero pt-32 pb-20">
        <div className="absolute inset-0 grid-pattern [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 md:px-10 relative">
          <div className="mx-auto max-w-3xl text-center animate-fade-up space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
              <Store className="h-3.5 w-3.5 text-accent" />
              <span>For Suppliers</span>
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-primary md:text-6xl">
              Grow your chemical business <span className="text-gradient">across the Gulf.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Join verified suppliers already reaching industrial buyers on the Middle East's premier B2B chemical marketplace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <MotionCTAButton href="/auth/register">
                Start Free Trial <ArrowUpRight className="w-4 h-4" />
              </MotionCTAButton>
              <Link href="/contact">
                <Button variant="outline" className="px-8">Talk to Our Team</Button>
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4 shadow-card-premium">
            {FEATURE_CARDS.map((f) => (
              <div key={f.title} className="bg-white px-5 py-6 text-center flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow mb-1">
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-bold text-primary">{f.title}</div>
                <div className="text-[11px] text-muted-foreground leading-snug">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center mb-14">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">// Simple Onboarding</div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary">Go live in 3 steps.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-border -translate-x-4 z-0" />
                )}
                <div className="group relative overflow-hidden rounded-xl border border-border bg-white p-6 shadow-card-premium transition-all hover:scale-[1.02] hover:border-accent/40 hover:shadow-glow">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/5 blur-2xl transition-smooth group-hover:bg-accent/10" />
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-5">
                      <span className="text-5xl font-black text-primary/8">{s.step}</span>
                      <div className="w-11 h-11 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                        <s.icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-primary">{s.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-surface-soft border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">// Why Chemidot</div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Everything you need to grow your sales.</h2>
            <p className="text-lg text-muted-foreground">Built for chemical manufacturers and distributors who want qualified buyers, not just traffic.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className="group relative overflow-hidden rounded-xl border border-border bg-white p-6 shadow-card-premium transition-all hover:scale-[1.02] hover:border-accent/40 hover:shadow-glow">
                <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-accent/5 blur-2xl transition-smooth group-hover:bg-accent/10" />
                <div className="relative">
                  <div className="w-11 h-11 bg-gradient-primary rounded-xl flex items-center justify-center mb-5 shadow-glow">
                    <b.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-base mb-2 text-primary">{b.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">// Platform Features</div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary">Everything in one platform.</h2>
              <p className="text-lg text-muted-foreground">
                No extra tools, no integrations required. From your storefront to order management, Chemidot handles it all.
              </p>
              <MotionCTAButton href="/auth/register" className="mt-4">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </MotionCTAButton>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <span className="text-sm font-medium">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-surface-soft border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">// Pricing</div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Simple supplier plans for every growth stage.</h2>
            <p className="text-lg text-muted-foreground">
              Start with a free trial, then upgrade for more visibility, richer storefront tools, and stronger buyer lead access.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            {PRICING_PLANS.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border bg-white p-6 shadow-card-premium ${plan.featured ? "border-primary shadow-glow" : "border-border"}`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-primary">{plan.name}</h3>
                    {plan.featured ? <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Recommended</span> : null}
                  </div>
                  <div>
                    <div className="text-3xl font-extrabold text-primary">{plan.price}</div>
                    <div className="text-sm text-muted-foreground">{plan.sub}</div>
                  </div>
                  <div className="space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link href={plan.href}>
                    <Button className="w-full" variant={plan.featured ? "default" : "outline"}>
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-navy p-10 md:p-14 space-y-6">
              <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <blockquote className="text-2xl md:text-3xl font-bold leading-snug text-white">
                  "Chemidot cut our sales cycle dramatically. The RFQ system is exactly what we needed to scale across Saudi Arabia."
                </blockquote>
                <p className="text-white/60 font-medium mt-4">Chemical Supplier, Riyadh Industrial City</p>
                <MotionCTAButton href="/auth/register" className="mt-8">
                  Join as a Supplier <ArrowRight className="w-4 h-4" />
                </MotionCTAButton>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
