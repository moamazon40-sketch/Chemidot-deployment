import { MainLayout } from "@/components/layout/MainLayout";
import { ProductCard } from "@/components/ProductCard";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Search, SlidersHorizontal, PackageSearch, ChevronDown, ArrowRight,
  Sprout, Car, Building2, FlaskConical, ShoppingBag, Package, Zap,
  UtensilsCrossed, HeartPulse, Home, Shield, Layers, Droplets,
  Sparkles, BarChart3, ShieldCheck, MessageSquare, Printer,
  Plane, Microscope, CircleDot, Settings2, Scissors, Hammer,
  Fuel, PaintBucket, FileText, RefreshCw, TestTubes, Waves, Cpu
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import logoImage from "@assets/Copy_of_Untitled_Design_1777818624833.png";
import { MotionCTAButton } from "@/components/MotionCTAButton";

/* ─── Core industry list (trimmed) ─── */
const INDUSTRIES = [
  { key: "oil",           label: "Oil & Energy",              icon: Fuel,           iconBg: "bg-orange-100 dark:bg-orange-900/30", iconColor: "text-orange-600" },
  { key: "chemical-mfg", label: "Chemical Manufacturing",     icon: FlaskConical,   iconBg: "bg-violet-100 dark:bg-violet-900/30", iconColor: "text-violet-600" },
  { key: "agriculture",  label: "Agriculture",                icon: Sprout,         iconBg: "bg-green-100  dark:bg-green-900/30",  iconColor: "text-green-600"  },
  { key: "construction", label: "Construction",               icon: Building2,      iconBg: "bg-amber-100  dark:bg-amber-900/30",  iconColor: "text-amber-600"  },
  { key: "pharma",       label: "Pharma & Life Science",      icon: HeartPulse,     iconBg: "bg-red-100    dark:bg-red-900/30",    iconColor: "text-red-600"    },
  { key: "food",         label: "Food & Feed",                icon: UtensilsCrossed,iconBg: "bg-lime-100   dark:bg-lime-900/30",   iconColor: "text-lime-700"   },
  { key: "automotive",   label: "Automotive",                 icon: Car,            iconBg: "bg-blue-100   dark:bg-blue-900/30",   iconColor: "text-blue-600"   },
  { key: "cosmetics",    label: "Cosmetics & Personal Care",  icon: Sparkles,       iconBg: "bg-rose-100   dark:bg-rose-900/30",   iconColor: "text-rose-600"   },
  { key: "paints",       label: "Paints & Coatings",          icon: PaintBucket,    iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",iconColor:"text-fuchsia-600"},
  { key: "water",        label: "Water Treatment",            icon: Waves,          iconBg: "bg-sky-100    dark:bg-sky-900/30",    iconColor: "text-sky-600"    },
  { key: "plastics",     label: "Plastics & Polymers",        icon: CircleDot,      iconBg: "bg-cyan-100   dark:bg-cyan-900/30",   iconColor: "text-cyan-700"   },
  { key: "adhesives",    label: "Adhesives & Sealants",       icon: Layers,         iconBg: "bg-orange-100 dark:bg-orange-900/30", iconColor: "text-orange-700" },
  { key: "lubricants",   label: "Lubricants",                 icon: Droplets,       iconBg: "bg-zinc-100   dark:bg-zinc-900/30",   iconColor: "text-zinc-600"   },
  { key: "cleaning",     label: "Cleaning Products",          icon: Sparkles,       iconBg: "bg-teal-100   dark:bg-teal-900/30",   iconColor: "text-teal-600"   },
];

/* ─── Core product group list (trimmed) ─── */
const PRODUCT_GROUPS = [
  { key: "acids",         label: "Acids",                          icon: Zap,          iconBg: "bg-red-100    dark:bg-red-900/30",    iconColor: "text-red-600"    },
  { key: "binders",       label: "Binders & Resins",               icon: Layers,       iconBg: "bg-indigo-100 dark:bg-indigo-900/30", iconColor: "text-indigo-600" },
  { key: "solvents",      label: "Solvents",                       icon: FlaskConical, iconBg: "bg-violet-100 dark:bg-violet-900/30", iconColor: "text-violet-600" },
  { key: "surfactants",   label: "Surfactants",                    icon: Sparkles,     iconBg: "bg-cyan-100   dark:bg-cyan-900/30",   iconColor: "text-cyan-700"   },
  { key: "antioxidants",  label: "Antioxidants & Stabilizers",     icon: Shield,       iconBg: "bg-green-100  dark:bg-green-900/30",  iconColor: "text-green-700"  },
  { key: "additives",     label: "Additives",                      icon: Settings2,    iconBg: "bg-teal-100   dark:bg-teal-900/30",   iconColor: "text-teal-600"   },
  { key: "agrochem",      label: "Agrochemicals",                  icon: Sprout,       iconBg: "bg-lime-100   dark:bg-lime-900/30",   iconColor: "text-lime-700"   },
  { key: "api",           label: "Pharma Ingredients",             icon: HeartPulse,   iconBg: "bg-pink-100   dark:bg-pink-900/30",   iconColor: "text-pink-600"   },
  { key: "anti-corr",     label: "Anti-corrosion",                 icon: ShieldCheck,  iconBg: "bg-zinc-100   dark:bg-zinc-900/30",   iconColor: "text-zinc-600"   },
  { key: "wetting",       label: "Wetting Agents",                 icon: Droplets,     iconBg: "bg-blue-100   dark:bg-blue-900/30",   iconColor: "text-blue-600"   },
  { key: "activated-c",   label: "Activated Carbon",               icon: CircleDot,    iconBg: "bg-gray-100   dark:bg-gray-800/50",   iconColor: "text-gray-600"   },
  { key: "base-fluids",   label: "Base Fluids",                    icon: Fuel,         iconBg: "bg-orange-100 dark:bg-orange-900/30", iconColor: "text-orange-600" },
  { key: "antibacterial", label: "Antibacterial Agents",           icon: ShieldCheck,  iconBg: "bg-emerald-100 dark:bg-emerald-900/30",iconColor:"text-emerald-600"},
  { key: "paints-add",    label: "Paint Additives",                icon: PaintBucket,  iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",iconColor:"text-fuchsia-600"},
];

const FORMULATIONS = [
  "Cosmetic Formulations",
  "Pharmaceutical Formulations",
  "Industrial Formulations",
  "Food & Beverage Formulations",
  "Agricultural Formulations",
  "Paint & Coating Formulations",
  "Adhesive Formulations",
  "Cleaning Product Formulations",
  "Personal Care Formulations",
  "Nutraceutical Formulations",
  "Rubber & Elastomer Formulations",
  "Water Treatment Formulations",
  "Lubricant Formulations",
  "Construction Formulations",
];


/* ─── Filter accordion section ─── */
const APPEARANCE_OPTIONS = ["Solid", "Liquid", "Powder", "Granules", "Paste", "Gas", "Flakes", "Pellets"];
const COLOR_OPTIONS = ["Clear / Colorless", "White", "Yellow", "Brown", "Black", "Blue", "Red", "Green", "Orange", "Pink"];
const SUBSTANCE_OPTIONS = ["Organic", "Inorganic", "Polymer", "Surfactant", "Solvent", "Acid", "Base", "Salt", "Ester", "Amine"];
const UNIT_OPTIONS = ["kg", "L", "MT", "g", "mL", "T", "lb", "oz", "drum", "IBC"];
const PACKAGING_OPTIONS = ["Drum", "IBC", "Bag", "Bottle", "Pail", "Tanker", "Flexibag", "Big Bag", "Can"];
const INCOTERMS_OPTIONS = ["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FAS", "FOB", "CFR", "CIF"];
const DELIVERY_COUNTRIES = ["Saudi Arabia", "UAE", "Kuwait", "Qatar", "Bahrain", "Oman", "Egypt", "Jordan", "Iraq", "Turkey"];
const WAREHOUSE_OPTIONS = ["Riyadh", "Jeddah", "Dammam", "Dubai", "Abu Dhabi", "Kuwait City", "Doha", "Muscat"];

function FilterSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-4 py-3 flex flex-col gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

function CheckList({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
      {items.map(item => (
        <label key={item} className="flex items-center gap-2.5 cursor-pointer group">
          <Checkbox
            checked={selected.has(item)}
            onCheckedChange={() => onToggle(item)}
            className="rounded"
          />
          <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors leading-none">
            {item}
          </span>
        </label>
      ))}
    </div>
  );
}

/* ─── Sub-nav dropdown ─── */
function NavDropdown({ label, items }: { label: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-0 w-72 bg-background border rounded-xl shadow-xl z-50 overflow-hidden"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="max-h-80 overflow-y-auto py-1.5 px-1.5 scrollbar-thin">
            {items.map(item => (
              <Link
                key={item}
                href={`/marketplace?search=${encodeURIComponent(item)}`}
                onClick={() => setOpen(false)}
              >
                <span className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-muted cursor-pointer text-foreground/80 hover:text-foreground transition-colors">
                  {item}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [collectiveEligible, setCollectiveEligible] = useState<boolean | undefined>();
  const [verifiedSupplier, setVerifiedSupplier] = useState<boolean | undefined>();
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "moq_asc" | "rating" | undefined>("newest");
  const [browseTab, setBrowseTab] = useState<"industries" | "products">("industries");
  const [heroSearch, setHeroSearch] = useState("");
  const [, navigate] = useLocation();

  // Accordion open state
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const toggleSection = (key: string) =>
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // Multi-select filter state
  const [selAppearance, setSelAppearance] = useState<Set<string>>(new Set());
  const [selColors,     setSelColors]     = useState<Set<string>>(new Set());
  const [selSubstance,  setSelSubstance]  = useState<Set<string>>(new Set());
  const [selUnits,      setSelUnits]      = useState<Set<string>>(new Set());
  const [selPackaging,  setSelPackaging]  = useState<Set<string>>(new Set());
  const [selIncoterms,  setSelIncoterms]  = useState<Set<string>>(new Set());
  const [selCountries,  setSelCountries]  = useState<Set<string>>(new Set());
  const [selWarehouses, setSelWarehouses] = useState<Set<string>>(new Set());

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (v: string) => setter(prev => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  const productGridRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useListCategories();
  const { data: productsData, isLoading } = useListProducts({
    search: searchQuery || undefined,
    categoryId,
    collectiveEligible,
    verifiedSupplier,
    sortBy,
    limit: 24
  });

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      setSearchQuery(heroSearch.trim());
      setTimeout(() => productGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  };

  const handleBrowseClick = () => {
    setTimeout(() => productGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  return (
    <MainLayout>
      {/* ── 1. Sub-nav bar ── */}
      <div className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <NavDropdown label="Industries" items={INDUSTRIES.map(i => i.label)} />
            <NavDropdown label="Products"   items={PRODUCT_GROUPS.map(p => p.label)} />
            <NavDropdown label="Formulations" items={FORMULATIONS} />
          </div>
        </div>
      </div>

      {/* ── 2. Hero ── */}
      <section className="relative overflow-hidden bg-hero border-b">
        <div className="absolute inset-0 grid-pattern [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="mx-auto max-w-4xl px-6 md:px-10 py-20 text-center space-y-7 animate-fade-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-primary">
            The easiest way to source{" "}
            <span className="text-gradient">chemicals, raw materials</span>
            {" "}and ingredients in the Middle East.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Search, sample, quote and purchase from verified suppliers, all in one place.
            Built for Saudi Arabia's industrial transformation.
          </p>
          <form onSubmit={handleHeroSearch} className="flex gap-2 max-w-xl mx-auto mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search chemicals, CAS numbers, suppliers..."
                className="pl-10 h-12 text-base bg-white border-border focus-visible:ring-accent/40 focus-visible:border-accent/60 shadow-elegant"
                value={heroSearch}
                onChange={e => setHeroSearch(e.target.value)}
              />
            </div>
            <MotionCTAButton type="submit" className="h-12 px-8 shrink-0">Search</MotionCTAButton>
          </form>
          <p className="text-sm text-muted-foreground">
            Discover chemicals and raw materials from{" "}
            <span className="font-semibold text-primary">verified regional suppliers</span>{" "}
            across the Middle East
          </p>
        </div>
      </section>

      {/* ── 3. Industries / Product Groups ── */}
      <section className="py-10 border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 mb-6 border-b">
            <button
              onClick={() => setBrowseTab("industries")}
              className={cn(
                "px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px",
                browseTab === "industries"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Industries
            </button>
            <button
              onClick={() => setBrowseTab("products")}
              className={cn(
                "px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px",
                browseTab === "products"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Product Families
            </button>
          </div>

          {/* Cards, shared chip style for both tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
            {(browseTab === "industries" ? INDUSTRIES : PRODUCT_GROUPS).map(item => (
              <Link
                key={item.key}
                href={`/marketplace?search=${encodeURIComponent(item.label)}`}
                onClick={handleBrowseClick}
              >
                <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-background hover:border-primary/40 hover:shadow-sm hover:bg-muted/30 transition-all cursor-pointer active:scale-[0.98]">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", item.iconBg)}>
                    <item.icon className={cn("w-4 h-4", item.iconColor)} />
                  </div>
                  <span className="text-xs font-medium text-foreground/75 group-hover:text-foreground leading-snug transition-colors">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Why Chemidot ── */}
      <section className="py-20 border-b overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: content */}
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
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Search className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-1">Instant access to the largest regional product catalog</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Browse, search and filter thousands of chemicals, raw materials and polymers from verified regional suppliers in seconds.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-1">Talk directly to supplier experts</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Ask technical questions, request TDS/SDS documents and negotiate pricing directly, without leaving the platform.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-1">Request samples, quotes and collective orders</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Unlock bulk pricing by pooling demand with other buyers. Chemidot handles coordination, logistics and secure payments end-to-end.
                    </p>
                  </div>
                </div>
              </div>

              <MotionCTAButton href="/auth/register" className="mt-2">
                Sign Up for Free <ArrowRight className="w-4 h-4" />
              </MotionCTAButton>
            </div>

            {/* Right: generated illustration */}
            <div className="relative hidden lg:block rounded-2xl overflow-hidden">
              {/* Generated logo-inspired illustration */}
              <img
                src={logoImage}
                alt="Chemidot logo"
                className="w-full h-full object-contain rounded-2xl bg-transparent p-10"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
              {/* Fallback SVG if image hasn't generated yet */}
              <div className="hidden w-full aspect-[4/3] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-2xl flex items-center justify-center p-10">
                <svg viewBox="0 0 400 300" className="w-full opacity-90" fill="none">
                  <circle cx="200" cy="150" r="130" fill="none" stroke="#f97316" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
                  <circle cx="200" cy="150" r="90" fill="none" stroke="#f97316" strokeWidth="1" opacity="0.25" />
                  {/* Logo motif, two C shapes + pill */}
                  <path d="M160 150 C160 120 175 105 200 105 C175 105 160 120 160 150 C160 180 175 195 200 195 C175 195 160 180 160 150Z" fill="#0f172a" stroke="#f97316" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M240 150 C240 120 225 105 200 105 C225 105 240 120 240 150 C240 180 225 195 200 195 C225 195 240 180 240 150Z" fill="#0f172a" stroke="#f97316" strokeWidth="3" strokeLinecap="round"/>
                  <rect x="178" y="138" width="44" height="24" rx="12" fill="#f97316" opacity="0.9"/>
                  {/* Nodes */}
                  {[[80,80],[320,80],[80,220],[320,220],[60,150],[340,150]].map(([x,y], i) => (
                    <g key={i}>
                      <line x1={x} y1={y} x2="200" y2="150" stroke="#f97316" strokeWidth="1" opacity="0.3"/>
                      <circle cx={x} cy={y} r="6" fill="#f97316" opacity="0.6"/>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Floating stat cards */}
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

      {/* ── 5. Product Grid ── */}
      <div ref={productGridRef} className="mx-auto max-w-7xl px-6 md:px-10 py-10">
        <div className="flex flex-col md:flex-row gap-8">

          {/* Sidebar Filters */}
          <aside className="w-full md:w-64 shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-base font-bold text-accent">Filters</h2>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryId(undefined);
                  setCollectiveEligible(undefined);
                  setVerifiedSupplier(undefined);
                  setSelAppearance(new Set());
                  setSelColors(new Set());
                  setSelSubstance(new Set());
                  setSelUnits(new Set());
                  setSelPackaging(new Set());
                  setSelIncoterms(new Set());
                  setSelCountries(new Set());
                  setSelWarehouses(new Set());
                }}
              >
                Clear all
              </button>
            </div>

            {/* Search box above accordion */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Keywords, CAS..."
                className="pl-9 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Accordion */}
            <div className="border rounded-xl overflow-hidden bg-background">

              <FilterSection label="Appearance" open={openSections.has("appearance")} onToggle={() => toggleSection("appearance")}>
                <CheckList items={APPEARANCE_OPTIONS} selected={selAppearance} onToggle={toggle(setSelAppearance)} />
              </FilterSection>

              <FilterSection label="Categories" open={openSections.has("categories")} onToggle={() => toggleSection("categories")}>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setCategoryId(undefined)}
                    className={cn(
                      "text-left text-sm px-1 py-1 rounded hover:text-foreground transition-colors",
                      categoryId === undefined ? "font-semibold text-accent" : "text-foreground/70"
                    )}
                  >
                    All Categories
                  </button>
                  {categories?.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        "text-left text-sm px-1 py-1 rounded hover:text-foreground transition-colors",
                        categoryId === cat.id ? "font-semibold text-accent" : "text-foreground/70"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </FilterSection>

              <FilterSection label="Industries" open={openSections.has("industries")} onToggle={() => toggleSection("industries")}>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {INDUSTRIES.map(ind => (
                    <label key={ind.key} className="flex items-center gap-2.5 cursor-pointer group">
                      <Checkbox className="rounded" />
                      <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors leading-none">
                        {ind.label}
                      </span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              <FilterSection label="Colors" open={openSections.has("colors")} onToggle={() => toggleSection("colors")}>
                <CheckList items={COLOR_OPTIONS} selected={selColors} onToggle={toggle(setSelColors)} />
              </FilterSection>

              <FilterSection label="Substance" open={openSections.has("substance")} onToggle={() => toggleSection("substance")}>
                <CheckList items={SUBSTANCE_OPTIONS} selected={selSubstance} onToggle={toggle(setSelSubstance)} />
              </FilterSection>

              <FilterSection label="Units" open={openSections.has("units")} onToggle={() => toggleSection("units")}>
                <CheckList items={UNIT_OPTIONS} selected={selUnits} onToggle={toggle(setSelUnits)} />
              </FilterSection>

              <FilterSection label="Packaging" open={openSections.has("packaging")} onToggle={() => toggleSection("packaging")}>
                <CheckList items={PACKAGING_OPTIONS} selected={selPackaging} onToggle={toggle(setSelPackaging)} />
              </FilterSection>

              <FilterSection label="Incoterms" open={openSections.has("incoterms")} onToggle={() => toggleSection("incoterms")}>
                <CheckList items={INCOTERMS_OPTIONS} selected={selIncoterms} onToggle={toggle(setSelIncoterms)} />
              </FilterSection>

              <FilterSection label="Delivery Countries" open={openSections.has("countries")} onToggle={() => toggleSection("countries")}>
                <CheckList items={DELIVERY_COUNTRIES} selected={selCountries} onToggle={toggle(setSelCountries)} />
              </FilterSection>

              <FilterSection label="Warehouses" open={openSections.has("warehouses")} onToggle={() => toggleSection("warehouses")}>
                <CheckList items={WAREHOUSE_OPTIONS} selected={selWarehouses} onToggle={toggle(setSelWarehouses)} />
              </FilterSection>

              {/* Quick filters at the bottom */}
              <div className="border-t px-4 py-3.5 flex flex-col gap-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <Checkbox
                    checked={!!collectiveEligible}
                    onCheckedChange={(c) => setCollectiveEligible(c === true ? true : undefined)}
                    className="rounded"
                  />
                  <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors leading-none">
                    Collective Eligible
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <Checkbox
                    checked={!!verifiedSupplier}
                    onCheckedChange={(c) => setVerifiedSupplier(c === true ? true : undefined)}
                    className="rounded"
                  />
                  <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors leading-none">
                    Verified Suppliers Only
                  </span>
                </label>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold">All Products</h2>
                <p className="text-muted-foreground text-sm">
                  {isLoading ? "Loading products..." : "Browse the latest listings"}
                </p>
              </div>

              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest Arrivals</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="moq_asc">Lowest MOQ</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3">
                    <Skeleton className="h-[250px] w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full mt-4" />
                  </div>
                ))}
              </div>
            ) : productsData?.products.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center bg-muted/30 rounded-xl border border-dashed">
                <PackageSearch className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-bold mb-2">No products found</h3>
                <p className="text-muted-foreground max-w-md">
                  We couldn't find any products matching your current filters. Try adjusting your search or clearing filters.
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryId(undefined);
                    setCollectiveEligible(undefined);
                    setVerifiedSupplier(undefined);
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {productsData?.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
