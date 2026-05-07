import { MainLayout } from "@/components/layout/MainLayout";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  useGetMarketplaceStats,
  useListFeaturedProducts,
  useListFeaturedSuppliers,
  useListCategories
} from "@workspace/api-client-react";
import {
  ShieldCheck, Globe2, Zap, Users, TrendingDown, Package, ArrowRight, ArrowUpRight,
  CheckCircle2, Building2, Search, MessageSquare, PlusCircle, Sparkles, Store,
  FlaskConical, Droplets, Leaf, Paintbrush, Hammer, Pill
} from "lucide-react";
import logoImage from "@assets/Copy_of_Untitled_Design_1777818624833.png";
import { CreateCollectiveOrderDialog } from "@/components/CreateCollectiveOrderDialog";
import { RequestDemoDialog } from "@/components/RequestDemoDialog";
import { MotionCTAButton } from "@/components/MotionCTAButton";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop",
];

const POPULAR_SEARCHES = ["Acetone", "Sodium Hydroxide", "Methanol", "Ethanol", "Citric Acid"];

const INDUSTRIES = [
  {
    name: "Petrochemicals",
    description: "Feedstocks, solvents, aromatic compounds and processing chemicals for energy-intensive manufacturing.",
    icon: FlaskConical,
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=500&fit=crop",
    href: "/marketplace?search=Petrochemicals",
    accent: "from-orange-950/90 via-orange-900/60",
  },
  {
    name: "Pharmaceuticals",
    description: "Active pharmaceutical ingredients, excipients, and intermediates meeting GMP and REACH standards.",
    icon: Pill,
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop",
    href: "/marketplace?search=Pharmaceuticals",
    accent: "from-blue-950/90 via-blue-900/60",
  },
  {
    name: "Water Treatment",
    description: "Coagulants, flocculants, biocides, and pH modifiers for municipal and industrial water systems.",
    icon: Droplets,
    image: "https://images.unsplash.com/photo-1606206591513-adbfbdd4935b?w=800&h=500&fit=crop",
    href: "/marketplace?search=Water+Treatment",
    accent: "from-cyan-950/90 via-cyan-900/60",
  },
  {
    name: "Agrochemicals",
    description: "Fertilizers, herbicides, pesticides, and soil conditioners supporting Saudi Vision 2030 food security.",
    icon: Leaf,
    image: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&h=500&fit=crop",
    href: "/marketplace?search=Agrochemicals",
    accent: "from-green-950/90 via-green-900/60",
  },
  {
    name: "Paints & Coatings",
    description: "Pigments, resins, binders, and solvents for industrial, marine, and architectural applications.",
    icon: Paintbrush,
    image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&h=500&fit=crop",
    href: "/marketplace?search=Paints+Coatings",
    accent: "from-purple-950/90 via-purple-900/60",
  },
  {
    name: "Construction Chemicals",
    description: "Admixtures, sealants, adhesives, and waterproofing solutions for large-scale infrastructure projects.",
    icon: Hammer,
    image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=500&fit=crop",
    href: "/marketplace?search=Construction+Chemicals",
    accent: "from-slate-950/90 via-slate-800/60",
  },
];

export default function Home() {
  const { data: stats } = useGetMarketplaceStats();
  const { data: featuredProducts, isLoading: productsLoading } = useListFeaturedProducts();
  const { data: featuredSuppliers, isLoading: suppliersLoading } = useListFeaturedSuppliers();
  const { data: categories } = useListCategories();
  const [heroSearch, setHeroSearch] = useState("");
  const [, navigate] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) navigate(`/marketplace?search=${encodeURIComponent(heroSearch.trim())}`);
    else navigate("/marketplace");
  };

  return (
    <MainLayout>

      {/* ═══════════════════════════════════════════
          1. HERO
      ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-hero pt-32 pb-24">
        <div className="absolute inset-0 grid-pattern [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 md:px-10 relative">
          <div className="mx-auto max-w-4xl text-center animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Saudi Arabia's Premier B2B Chemical Marketplace</span>
            </div>

            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-primary md:text-7xl">
              Source Chemicals{" "}
              <span className="text-gradient">Smarter</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Connect directly with verified manufacturers across the Gulf. Compare specs,
              request quotes, and unlock collective buying power, all in one platform.
            </p>

            <form onSubmit={handleHeroSearch} className="mx-auto mt-10 max-w-2xl">
              <div className="group relative flex items-center rounded-2xl border border-border bg-white p-2 shadow-elegant transition-smooth focus-within:border-accent/60 focus-within:shadow-glow">
                <Search className="ml-4 h-5 w-5 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={e => setHeroSearch(e.target.value)}
                  placeholder="Search by chemical name, CAS number, or formula…"
                  className="flex-1 bg-transparent px-4 py-3 text-base text-primary placeholder:text-muted-foreground/70 focus:outline-none"
                />
                <MotionCTAButton type="submit" className="shrink-0">
                  Search <ArrowRight className="h-4 w-4" />
                </MotionCTAButton>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>Popular:</span>
                {POPULAR_SEARCHES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setHeroSearch(t); navigate(`/marketplace?search=${encodeURIComponent(t)}`); }}
                    className="rounded-full border border-border bg-white px-3 py-1 transition-smooth hover:border-accent/60 hover:text-primary"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </form>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>REACH &amp; GHS compliant</span>
              </div>
              <div className="h-1 w-1 rounded-full bg-border" />
              <div>ISO 9001 verified suppliers</div>
              <div className="h-1 w-1 rounded-full bg-border" />
              <div>Escrow-secured payments</div>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4 shadow-card-premium">
            {[
              { icon: ShieldCheck, title: "Verified Suppliers",   desc: "Every supplier is vetted & certified" },
              { icon: Search,      title: "Instant Discovery",    desc: "Search by name, CAS or formula" },
              { icon: Users,       title: "Collective Buying",    desc: "Pool demand, unlock bulk pricing" },
              { icon: Zap,         title: "Fast RFQ Process",     desc: "Get quotes in hours, not weeks" },
            ].map(f => (
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

      {/* ═══════════════════════════════════════════
          2. TWO WAYS TO BUY
      ═══════════════════════════════════════════ */}
      <section className="relative py-24 bg-surface-soft">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="mb-14 max-w-2xl">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-accent">// Two ways to buy</div>
            <h2 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
              Built for the way procurement actually works.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="group relative overflow-hidden rounded-3xl border border-border bg-white p-10 shadow-card-premium transition-smooth hover:border-accent/40 hover:shadow-glow">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl transition-smooth group-hover:bg-accent/20" />
              <div className="relative">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">RFQ</div>
                <h3 className="mb-4 text-3xl font-bold tracking-tight text-primary">
                  Get quotes from multiple suppliers in hours.
                </h3>
                <p className="mb-8 text-muted-foreground">
                  Broadcast your exact requirements to our verified supplier network. Receive
                  standardized quotes side-by-side and choose the best fit for price, lead time, and compliance.
                </p>
                <ul className="mb-10 space-y-3 text-sm">
                  {[
                    "One request, multiple competitive quotes",
                    "Standardized format for easy comparison",
                    "Suppliers respond in hours, not weeks",
                  ].map(f => (
                    <li key={f} className="flex items-start gap-3 text-muted-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <MotionCTAButton href="/auth/register">
                  Create RFQ <ArrowUpRight className="h-4 w-4" />
                </MotionCTAButton>
              </div>
            </article>

            <article className="group relative overflow-hidden rounded-3xl border border-transparent bg-gradient-navy p-10 shadow-card-premium transition-smooth hover:shadow-glow">
              <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl transition-smooth group-hover:bg-accent/40" />
              <div className="relative text-white">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-white/5">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-white/60">
                  <span>Collective Order</span>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">New</span>
                </div>
                <h3 className="mb-4 text-3xl font-bold tracking-tight">
                  Pool demand. Unlock industrial pricing.
                </h3>
                <p className="mb-8 text-white/70">
                  Join other Saudi buyers in shared procurement campaigns. Reach bulk thresholds
                  together and access pricing usually reserved for major industrials.
                </p>
                <div className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Isopropyl Alcohol 99.9%</div>
                      <div className="font-mono text-xs text-white/50">CAS 67-63-0 · 14 buyers joined</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-accent">-27%</div>
                      <div className="text-[10px] uppercase tracking-wider text-white/50">vs. spot</div>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[68%] rounded-full bg-gradient-primary" />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-white/50">
                    <span>17.2 / 25 tonnes</span>
                    <span>Closes in 4 days</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <MotionCTAButton href="/collective-orders">
                    Join a collective order <ArrowUpRight className="h-4 w-4" />
                  </MotionCTAButton>
                  <Button
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white gap-1.5"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <PlusCircle className="h-4 w-4" /> Create order
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          3. Browse by Industry
      ═══════════════════════════════════════════ */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Browse by Industry</h2>
              <p className="text-lg text-muted-foreground">Find specialized chemicals tailored to your sector's exact specifications and compliance requirements.</p>
            </div>
            <Link href="/marketplace">
              <Button variant="ghost" className="group">
                View all categories <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map(industry => (
              <Link key={industry.name} href={industry.href}>
                <div className="group relative overflow-hidden rounded-2xl cursor-pointer shadow hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 h-52">
                  <img
                    src={industry.image}
                    alt={industry.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${industry.accent} to-transparent`} />
                  <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                    <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm border border-white/20">
                      <industry.icon className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-bold leading-tight">{industry.name}</h3>
                    <p className="mt-1 text-xs text-white/75 leading-relaxed line-clamp-2">{industry.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          4. Benefits Section
      ═══════════════════════════════════════════ */}
      <section className="bg-gradient-navy text-white relative overflow-hidden py-20">
        <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="mx-auto max-w-7xl px-6 md:px-10 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise Sourcing, Reimagined</h2>
            <p className="text-lg text-white/60">We've eliminated the friction from chemical procurement, replacing emails and spreadsheets with a unified digital experience.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, iconBg: "bg-blue-500/15 border-blue-500/20", iconText: "text-blue-400", title: "Verified Trust Network", desc: "Every supplier undergoes rigorous vetting for quality standards, financial stability, and regulatory compliance before joining." },
              { icon: Users, iconBg: "bg-accent/15 border-accent/20", iconText: "text-accent", title: "Collective Buying Power", desc: "Pool your demand with other buyers to unlock volume discounts previously reserved only for enterprise conglomerates.", badge: "Unique to Chemidot" },
              { icon: Zap, iconBg: "bg-indigo-500/15 border-indigo-500/20", iconText: "text-indigo-400", title: "Accelerated RFQs", desc: "Broadcast your requirements to matched suppliers instantly and receive standardized quotes that are easy to compare." },
            ].map(card => (
              <div key={card.title} className="bg-white/5 border border-white/10 backdrop-blur-sm p-8 rounded-2xl relative overflow-hidden hover:bg-white/10 transition-colors duration-300">
                {card.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent border border-accent/30">
                      {card.badge}
                    </span>
                  </div>
                )}
                <div className={`w-14 h-14 ${card.iconBg} border rounded-xl flex items-center justify-center mb-6`}>
                  <card.icon className={`w-7 h-7 ${card.iconText}`} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{card.title}</h3>
                <p className="text-white/60 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          5. Why Chemidot
      ═══════════════════════════════════════════ */}
      <section className="py-20 border-b overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10">
              <div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Why Chemidot</p>
                <h2 className="text-3xl md:text-4xl font-extrabold leading-snug mb-4">
                  Interact with verified suppliers, browse their catalogs, and request quotes, all in minutes.
                </h2>
                <p className="text-muted-foreground text-lg">
                  Chemidot replaces slow email chains and manual spreadsheets with a unified digital sourcing experience purpose-built for the Middle East chemical industry.
                </p>
              </div>

              <div className="space-y-7">
                {[
                  { icon: Search, title: "Instant access to the largest regional product catalog", desc: "Browse, search and filter thousands of chemicals, raw materials and polymers from verified regional suppliers in seconds." },
                  { icon: MessageSquare, title: "Talk directly to supplier experts", desc: "Ask technical questions, request TDS/SDS documents and negotiate pricing directly, without leaving the platform." },
                  { icon: ShieldCheck, title: "Request samples, quotes and collective orders", desc: "Unlock bulk pricing by pooling demand with other buyers. Chemidot handles coordination, logistics and secure payments end-to-end." },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-5">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base mb-1">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <MotionCTAButton href="/auth/register" className="mt-2">
                Sign Up for Free <ArrowRight className="w-4 h-4" />
              </MotionCTAButton>
            </div>

            <div className="relative hidden lg:block rounded-2xl overflow-hidden">
              <img
                src={logoImage}
                alt="Chemidot logo"
                className="w-full h-full object-contain rounded-2xl bg-transparent p-10"
              />
              <div className="absolute top-6 right-6 bg-background/90 backdrop-blur border rounded-xl shadow-lg px-4 py-3">
                <p className="text-xl font-extrabold text-primary">Verified</p>
                <p className="text-xs text-muted-foreground font-medium">Supplier network</p>
              </div>
              <div className="absolute bottom-6 left-6 bg-background/90 backdrop-blur border rounded-xl shadow-lg px-4 py-3">
                <p className="text-xl font-extrabold text-primary">Formula-led</p>
                <p className="text-xs text-muted-foreground font-medium">Catalog browsing</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          6. Featured Products
      ═══════════════════════════════════════════ */}
      <section className="py-20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Trending Chemicals</h2>
              <p className="text-lg text-muted-foreground">High-demand products from top-rated manufacturers, ready for quotation.</p>
            </div>
            <Link href="/marketplace">
              <Button variant="outline">Browse All Products</Button>
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[250px] w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts?.slice(0, 4).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          7. Collective Order Highlight
      ═══════════════════════════════════════════ */}
      <section className="py-20 border-y border-primary/10 overflow-hidden relative">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent -z-10" />
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                <TrendingDown className="w-4 h-4" /> Bulk pricing for growing orders
              </div>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Don't pay retail for raw materials.
              </h2>
              <p className="text-xl text-muted-foreground">
                Chemidot Collective aggregates demand from multiple mid-sized manufacturers to negotiate bulk pricing from global suppliers.
              </p>
              <ul className="space-y-4 py-4">
                {[
                  "No minimum order quantity required to join",
                  "Transparent pricing tiers based on total volume",
                  "Secure escrow payments until delivery",
                  "End-to-end logistics handled by Chemidot",
                ].map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <MotionCTAButton href="/collective-orders#active-orders">
                  View Open Collectives
                </MotionCTAButton>
                <Button size="lg" variant="outline" className="gap-2 text-lg px-8" onClick={() => setCreateDialogOpen(true)}>
                  <PlusCircle className="w-5 h-5" /> Create Collective Order
                </Button>
              </div>
            </div>

            <div className="relative lg:pl-10">
              <div className="bg-card border rounded-2xl p-6 shadow-2xl relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center">
                      <Package className="text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">Industrial Grade Ethanol</h4>
                      <p className="text-sm text-muted-foreground">Target volume</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">Bulk pricing</div>
                    <div className="text-sm text-green-600 font-medium">Collective order active</div>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Committed volume</span>
                    <span className="text-muted-foreground">Progress</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-3/4 rounded-full" />
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">More volume unlocks better pricing</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold">Active</div>
                    <div className="text-xs text-muted-foreground">Buyer participation</div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-500">Open</div>
                    <div className="text-xs text-muted-foreground">Order status</div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -z-10" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          8. Featured Suppliers
      ═══════════════════════════════════════════ */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Partner with Industry Leaders</h2>
            <p className="text-lg text-muted-foreground">Source directly from verified global manufacturers and authorized regional distributors.</p>
          </div>

          {suppliersLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {featuredSuppliers?.map(supplier => (
                <Link key={supplier.id} href={`/suppliers/${supplier.id}`}>
                  <div className="bg-card border hover:border-primary p-6 rounded-xl flex flex-col items-center justify-center text-center gap-4 transition-all hover:shadow-md h-full cursor-pointer group">
                    <div className="w-16 h-16 relative flex items-center justify-center">
                      {supplier.logoUrl ? (
                        <img src={supplier.logoUrl} alt={supplier.companyName} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform" />
                      ) : (
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm line-clamp-1">{supplier.companyName}</h4>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-blue-500" /> Verified
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <MotionCTAButton href="/auth/register">
              Become a Supplier <ArrowRight className="w-4 h-4" />
            </MotionCTAButton>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          9. Request a Demo
      ═══════════════════════════════════════════ */}
      <section className="py-20 bg-surface-soft border-y">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider">Get Started Today</p>
              <h2 className="text-3xl md:text-4xl font-extrabold leading-snug">
                See Chemidot in action, book a free demo.
              </h2>
              <p className="text-lg text-muted-foreground">
                Our team will walk you through the platform, answer your sourcing questions, and tailor a plan that fits your procurement workflow.
              </p>
              <ul className="space-y-3">
                {[
                  "No commitment required",
                  "30-minute personalised walkthrough",
                  "Expert guidance from our sourcing specialists",
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-base">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <MotionCTAButton
                className="mt-2"
                onClick={() => {
                  trackEvent({ event: "cta_click", label: "Request a Demo", page: "/" });
                  setDemoDialogOpen(true);
                }}
              >
                Request a Demo <ArrowRight className="w-4 h-4" />
              </MotionCTAButton>
            </div>

            <div className="bg-card border rounded-2xl p-8 shadow-card-premium space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Talk to our team</h3>
                  <p className="text-sm text-muted-foreground">We respond within 1 business day</p>
                </div>
              </div>
              <div className="space-y-4 border-t pt-6">
                {[
                  { icon: Globe2, label: "Serving buyers across the Middle East" },
                  { icon: ShieldCheck, label: "Verified supplier network, ready to quote" },
                  { icon: Zap, label: "Get your first RFQ out in under 10 minutes" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
              <Link href="/contact" className="block">
                <Button variant="outline" className="w-full gap-2" onClick={() => trackEvent({ event: "cta_click", label: "Contact Us", page: "/" })}>
                  Contact Us <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          10. Final CTA
      ═══════════════════════════════════════════ */}
      <section className="bg-gradient-navy text-white relative overflow-hidden py-24">
        <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="mx-auto max-w-7xl px-6 md:px-10 relative z-10 text-center">
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-3xl px-10 py-16 space-y-8">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">Ready to modernize your procurement?</h2>
            <p className="text-xl text-white/70 font-medium max-w-2xl mx-auto">Join manufacturers across Saudi Arabia sourcing chemicals smarter, faster, and cheaper through Chemidot.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <MotionCTAButton href="/auth/register">
                Create Free Account
              </MotionCTAButton>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white text-base px-8 rounded-xl"
              >
                <Link href="/contact">Talk to Sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <CreateCollectiveOrderDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <RequestDemoDialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen} />
    </MainLayout>
  );
}
