import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowRight, ArrowUpRight, CheckCircle2, Search, MessageSquare, ShieldCheck,
  Users, TrendingDown, FileText, Package, Clock, Star, ShoppingCart
} from "lucide-react";
import { MotionCTAButton } from "@/components/MotionCTAButton";

const BENEFITS = [
  { icon: Search,       title: "Search Thousands of Products",          desc: "Browse our catalog of chemicals, raw materials, and polymers by name, CAS number, industry, or product family, and get results in seconds." },
  { icon: ShieldCheck,  title: "Source from Verified Suppliers Only",   desc: "Every supplier is vetted for compliance, quality certifications, and business legitimacy. You'll never waste time on unreliable vendors again." },
  { icon: TrendingDown, title: "Unlock Bulk Pricing via Collective Orders", desc: "Pool your demand with other buyers in our Collective Orders program and unlock pricing tiers previously available only to large enterprises." },
  { icon: FileText,     title: "Streamlined RFQ Process",               desc: "Send a single structured RFQ to multiple matched suppliers at once. Get standardized quotes back that are easy to compare side-by-side." },
  { icon: MessageSquare,title: "Direct Supplier Communication",         desc: "Chat directly with supplier technical teams, request samples, ask spec questions, and negotiate, all within Chemidot's secure messaging." },
  { icon: Clock,        title: "Faster Procurement Cycles",             desc: "What used to take weeks of emails and calls now takes days. Chemidot compresses the entire sourcing cycle into a single digital workflow." },
];

const STEPS = [
  { step: "01", title: "Search & Discover",  desc: "Use our powerful search to find products by name, CAS number, industry, or supplier. Filter by MOQ, price range, certification, and delivery region.", icon: Search },
  { step: "02", title: "Request Quotes",     desc: "Send RFQs to one or multiple suppliers with your exact specifications, quantities, and delivery requirements, all in a structured format.", icon: FileText },
  { step: "03", title: "Compare & Order",    desc: "Review standardized quotes side-by-side, negotiate directly, and confirm orders with secure payment and tracked delivery.", icon: Package },
];

const PAIN_POINTS = [
  { before: "Spend hours searching supplier catalogs & websites",   after: "Search everything in one place in seconds" },
  { before: "Send 10+ emails just to get a single price",           after: "One RFQ reaches multiple suppliers instantly" },
  { before: "No way to compare quotes, different formats",         after: "Standardized quotes, side-by-side comparison" },
  { before: "Pay retail prices on every order",                     after: "Access bulk pricing via collective orders" },
  { before: "No visibility into supplier reliability",              after: "Verified badge, ratings & track record" },
  { before: "Procurement cycles take 3–6 weeks",                    after: "Close sourcing in 3–5 business days" },
];

const FEATURE_CARDS = [
  { icon: Search,       title: "Instant Discovery",     desc: "Search by name, CAS or formula" },
  { icon: ShieldCheck,  title: "Verified Suppliers",    desc: "Every vendor is vetted & certified" },
  { icon: TrendingDown, title: "Collective Buying",     desc: "Pool demand, unlock bulk pricing" },
  { icon: Clock,        title: "Fast Quotes",           desc: "Get responses in hours, not weeks" },
];

export default function ForBuyers() {
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
              <ShoppingCart className="h-3.5 w-3.5 text-accent" />
              <span>For Buyers</span>
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-primary md:text-6xl">
              Source chemicals{" "}
              <span className="text-gradient">smarter, faster,</span>
              {" "}and cheaper.
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Stop chasing supplier catalogs and waiting weeks for quotes. Chemidot puts Saudi Arabia's entire verified chemical supply chain at your fingertips.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <MotionCTAButton href="/auth/register">
                Start Sourcing Free <ArrowUpRight className="w-4 h-4" />
              </MotionCTAButton>
              <Link href="/marketplace">
                <Button variant="outline" className="px-8">Browse Marketplace</Button>
              </Link>
            </div>
          </div>

          {/* Feature strip */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4 shadow-card-premium">
            {FEATURE_CARDS.map(f => (
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

      {/* ── Before / After ── */}
      <section className="py-20 border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center mb-14">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">// The Chemidot Difference</div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary">Procurement, transformed.</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border shadow-card-premium">
            <div className="grid grid-cols-2 bg-surface-soft">
              <div className="px-6 py-3 text-sm font-bold text-muted-foreground uppercase tracking-wider border-r">Without Chemidot</div>
              <div className="px-6 py-3 text-sm font-bold text-primary uppercase tracking-wider">With Chemidot</div>
            </div>
            {PAIN_POINTS.map((row, i) => (
              <div key={i} className={`grid grid-cols-2 border-t ${i % 2 === 0 ? "bg-white" : "bg-surface-soft"}`}>
                <div className="px-6 py-4 text-sm text-muted-foreground border-r flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✕</span> {row.before}
                </div>
                <div className="px-6 py-4 text-sm font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {row.after}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-surface-soft border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center mb-14">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">// How It Works</div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary">From search to delivery in 3 steps.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map(s => (
              <div key={s.step} className="group relative overflow-hidden rounded-xl border border-border bg-white p-6 shadow-card-premium transition-all hover:scale-[1.02] hover:border-accent/40 hover:shadow-glow">
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
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-20 border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">// Built for Buyers</div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Why procurement teams choose Chemidot.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map(b => (
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

      {/* ── Collective CTA ── */}
      <section className="py-20 bg-surface-soft border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent text-sm font-semibold">
                <TrendingDown className="w-4 h-4" /> Unique to Chemidot
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary">Don't pay retail for raw materials.</h2>
              <p className="text-lg text-muted-foreground">
                Our Collective Orders program pools demand from multiple buyers to unlock bulk pricing tiers, giving mid-sized manufacturers the same purchasing power as large conglomerates.
              </p>
              <ul className="space-y-3">
                {[
                  "Save on pricing vs. individual orders",
                  "No minimum order to join a collective",
                  "Transparent pricing tiers, everyone sees the same deal",
                  "Secure escrow payments until delivery",
                ].map(i => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-sm font-medium">{i}</span>
                  </li>
                ))}
              </ul>
              <MotionCTAButton href="/collective-orders">
                Explore Collective Orders <ArrowRight className="w-4 h-4" />
              </MotionCTAButton>
            </div>

            {/* Preview card */}
            <div className="group relative overflow-hidden rounded-3xl border border-transparent bg-gradient-navy p-8 shadow-card-premium">
              <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
              <div className="relative text-white space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-accent/40 bg-white/5 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Industrial Solvent, 99.9% Pure</p>
                      <p className="text-xs text-white/50">Collective order · target volume</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-accent">Bulk pricing</p>
                    <p className="text-xs text-green-400">Order active</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur space-y-2">
                  <div className="flex justify-between text-xs text-white/50">
                    <span>Committed volume</span><span>Progress</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-3/4 rounded-full bg-gradient-primary" />
                  </div>
                  <p className="text-xs text-white/40">More volume unlocks better pricing</p>
                </div>
                <MotionCTAButton href="/collective-orders" className="w-full">
                  Join This Order <ArrowUpRight className="w-4 h-4" />
                </MotionCTAButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="max-w-3xl mx-auto text-center space-y-7">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mx-auto shadow-glow">
              <Star className="w-6 h-6 text-white" />
            </div>
            <blockquote className="text-2xl md:text-3xl font-bold leading-snug text-primary">
              "We reduced our raw material costs by sourcing smarter through Chemidot's collective orders, in the first quarter alone."
            </blockquote>
            <p className="text-muted-foreground font-medium">Procurement Manager, Saudi Food Manufacturer</p>
            <MotionCTAButton href="/auth/register">
              Create Free Buyer Account <ArrowRight className="w-4 h-4" />
            </MotionCTAButton>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
