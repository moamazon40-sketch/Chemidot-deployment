import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Target, Eye, Heart, Users, Globe2, ShieldCheck,
  ArrowRight, CheckCircle2, TrendingUp, Building2, Zap
} from "lucide-react";
import { MotionCTAButton } from "@/components/MotionCTAButton";

const VALUES = [
  { icon: ShieldCheck, title: "Trust Through Verification",  desc: "Every supplier on Chemidot is vetted for regulatory compliance, financial stability, and product quality before they can list a single product." },
  { icon: Globe2,      title: "Middle East First",            desc: "We're built specifically for the Gulf's industrial ecosystem, local regulations, Arabic language support, regional logistics, and SAR-first pricing." },
  { icon: Users,       title: "Collective Progress",          desc: "We believe mid-sized manufacturers deserve the same pricing power as conglomerates. Our collective buying model levels the playing field." },
  { icon: Zap,         title: "Speed & Simplicity",          desc: "Procurement shouldn't take weeks. Chemidot compresses sourcing cycles from months to days, without compromising compliance or quality." },
  { icon: Heart,       title: "Customer Obsession",          desc: "Everything we build starts from one question: does this make it meaningfully easier for a buyer or supplier to do their job?" },
  { icon: TrendingUp,  title: "Vision 2030 Aligned",         desc: "Chemidot is proud to support Saudi Arabia's industrial diversification goals by digitizing the supply chain for the Kingdom's manufacturers." },
];

const FEATURES = [
  { icon: ShieldCheck, label: "Verified Supplier Network",   desc: "Rigorous vetting for every supplier" },
  { icon: Globe2,      label: "Gulf-Wide Coverage",          desc: "Saudi Arabia & GCC region" },
  { icon: Building2,   label: "Growing Product Catalog",     desc: "Chemicals, polymers & raw materials" },
  { icon: TrendingUp,  label: "Regional Market Reach",       desc: "Connecting buyers & suppliers" },
];

export default function About() {
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
              <Building2 className="h-3.5 w-3.5 text-accent" />
              <span>About Chemidot</span>
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-primary md:text-6xl">
              Modernizing Chemical Procurement<br />
              <span className="text-gradient">for the Middle East</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Chemidot is Saudi Arabia's first enterprise-grade B2B chemical marketplace, connecting industrial buyers with verified manufacturers and distributors across the region.
            </p>
          </div>

          {/* Feature bar */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4 shadow-card-premium">
            {FEATURES.map(f => (
              <div key={f.label} className="bg-white px-5 py-6 text-center flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow mb-1">
                  <f.icon className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-bold text-primary">{f.label}</div>
                <div className="text-[11px] text-muted-foreground leading-snug">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission & Vision ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Our Mission</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold leading-snug">
                We're removing the friction from industrial chemical sourcing.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                For decades, chemical procurement in the Gulf has relied on personal relationships, manual RFQ emails, and opaque pricing. Chemidot changes that, bringing transparency, speed, and trust to every transaction.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We built Chemidot because we saw mid-sized Saudi manufacturers spending weeks on procurement cycles that should take hours. Our platform digitizes the entire workflow: discovery, quotation, comparison, negotiation, and order, all in one place.
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">Our Vision</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold leading-snug">
                The infrastructure layer for the Middle East's chemical economy.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                By 2030, we envision Chemidot powering procurement for the majority of Saudi Arabia's manufacturing sector, from petrochemical giants to specialty chemical distributors.
              </p>
              <ul className="space-y-3">
                {[
                  "Supporting Saudi Vision 2030's industrial diversification targets",
                  "Enabling local manufacturers to compete globally on raw material costs",
                  "Creating a transparent, compliant, digitized supply chain",
                ].map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="py-20 bg-surface-soft border-y">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">// Our principles</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">What We Stand For</h2>
            <p className="mt-3 text-lg text-muted-foreground">Six principles that guide every decision we make, from product to partnerships.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="group relative overflow-hidden rounded-xl border border-border bg-white p-6 shadow-card-premium transition-all hover:scale-[1.02] hover:border-accent/40 hover:shadow-glow">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/5 blur-2xl transition-smooth group-hover:bg-accent/10" />
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center mb-5 shadow-glow">
                    <v.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-base mb-2 text-primary">{v.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vision 2030 ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-navy p-10 md:p-14 text-white text-center space-y-6">
            <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
            <div className="relative">
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">Saudi Vision 2030</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-5">
                Proud to power the Kingdom's industrial transformation.
              </h2>
              <p className="text-white/70 text-lg max-w-2xl mx-auto mb-8">
                Chemidot is aligned with Saudi Arabia's National Industrial Strategy, helping local manufacturers reduce import dependency, digitize supply chains, and access global-quality raw materials at competitive prices.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <MotionCTAButton href="/auth/register">
                  Join Chemidot <ArrowRight className="w-4 h-4" />
                </MotionCTAButton>
                <Link href="/contact">
                  <Button variant="outline" className="px-8 border-white/30 text-white hover:bg-white/10 bg-transparent hover:text-white">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
