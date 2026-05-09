import { MainLayout } from "@/components/layout/MainLayout";
import { Link, useRoute, useLocation } from "wouter";
import {
  useGetSupplier,
} from "@workspace/api-client-react";
import type { SupplierProfile as SupplierProfileType, Product } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck, MapPin, Calendar, Clock, Star, MessageSquare, ArrowLeft,
  Share2, ChevronDown, ChevronRight, Search, Download, Mail, User,
  Package, Layers, FileText, Users, Store, ExternalLink, Tag
} from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/* ─── Modal form ─── */
function ActionModal({ trigger, title, description }: { trigger: React.ReactNode; title: string; description?: string }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(description ?? "");
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: name.split(" ")[0] || name,
          lastName: name.split(" ").slice(1).join(" ") || "-",
          email,
          company: "-",
          subject: title,
          message,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Request sent!", description: `Your ${title.toLowerCase()} has been submitted. The supplier will respond within 48 hours.` });
      setOpen(false);
      setName(""); setEmail(""); setMessage(description ?? "");
    } catch {
      toast({ title: "Could not send request", description: "Please try again later.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Your Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your request..." required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={sending}>{sending ? "Sending…" : "Submit Request"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Message supplier dialog ─── */
function MessageSupplierDialog({ supplierId, companyName }: { supplierId: number; companyName: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState(`Hi, I'm interested in doing business with ${companyName}. Could you share more about your product offerings and pricing?`);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSend = async () => {
    if (authLoading) return;
    if (!user) { navigate("/auth/login"); return; }
    setSending(true);
    try {
      const token = localStorage.getItem("chemidot_token");
      const res = await fetch("/api/messages/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, initialMessage: message }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Message sent!", description: `Your message to ${companyName} has been sent.` });
      setOpen(false);
      navigate("/dashboard/messages");
    } catch {
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2 shadow-sm">
          <MessageSquare className="w-4 h-4" /> Message Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Message {companyName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Textarea rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !message.trim()} className="gap-2">
              <MessageSquare className="w-4 h-4" />
              {sending ? "Sending…" : "Send Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Collapsible sidebar section ─── */
function CollapsibleSection({ title, tags }: { title: string; tags: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t pt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-sm font-semibold text-foreground/80 hover:text-foreground mb-2"
      >
        {title}
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <Link key={t} href={`/marketplace?search=${encodeURIComponent(t)}`}>
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-colors">{t}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

type Tab = "storefront" | "products" | "brands" | "documents" | "experts";

export default function SupplierProfile() {
  const [, params] = useRoute("/suppliers/:id");
  const id = Number(params?.id);
  const [activeTab, setActiveTab] = useState<Tab>("storefront");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [brands, setBrands] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [experts, setExperts] = useState<any[]>([]);
  const { toast } = useToast();

  const { data: supplier, isLoading } = useGetSupplier(id);

  const profile = supplier as SupplierProfileType | undefined;

  // Hooks must run unconditionally on every render (even when loading).
  const categoryTags = useMemo(() => {
    const tags = new Set<string>();
    for (const product of profile?.products ?? []) {
      if ((product as any).categoryName) tags.add((product as any).categoryName);
    }
    return Array.from(tags).slice(0, 8);
  }, [profile?.products]);

  const certificationTags = useMemo(
    () => (supplier?.certifications ?? []).filter(Boolean).slice(0, 8),
    [supplier?.certifications]
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadStoreSections = async () => {
      try {
        const [brandsRes, documentsRes, expertsRes] = await Promise.all([
          fetch(`/api/suppliers/${id}/brands`),
          fetch(`/api/suppliers/${id}/documents`),
          fetch(`/api/suppliers/${id}/experts`),
        ]);

        const [brandsData, documentsData, expertsData] = await Promise.all([
          brandsRes.ok ? brandsRes.json() : [],
          documentsRes.ok ? documentsRes.json() : [],
          expertsRes.ok ? expertsRes.json() : [],
        ]);

        if (!cancelled) {
          setBrands(Array.isArray(brandsData) ? brandsData : []);
          setDocuments(Array.isArray(documentsData) ? documentsData : []);
          setExperts(Array.isArray(expertsData) ? expertsData : []);
        }
      } catch {
        if (!cancelled) {
          setBrands([]);
          setDocuments([]);
          setExperts([]);
        }
      }
    };

    loadStoreSections();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!", description: "Supplier profile URL copied to clipboard." });
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "storefront", label: "Storefront", icon: Store },
    { key: "products", label: "Products", icon: Package, count: profile?.products?.length ?? supplier?.productCount ?? 0 },
    ...(brands.length > 0 ? [{ key: "brands" as Tab, label: "Brands", icon: Tag, count: brands.length }] : []),
    ...(documents.length > 0 ? [{ key: "documents" as Tab, label: "Documents", icon: FileText, count: documents.length }] : []),
    ...(experts.length > 0 ? [{ key: "experts" as Tab, label: "Experts", icon: Users, count: experts.length }] : []),
  ];

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab("storefront");
    }
  }, [activeTab, tabs]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex flex-col lg:flex-row min-h-screen">
          <div className="w-full lg:w-[260px] shrink-0 border-r p-6 space-y-4">
            <Skeleton className="h-20 w-20 rounded-full mx-auto" />
            <Skeleton className="h-5 w-3/4 mx-auto" />
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
          <div className="flex-1 p-8 space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!supplier) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-20 text-center">
          <h2 className="text-2xl font-bold">Supplier not found</h2>
          <Link href="/marketplace"><Button className="mt-4">Back to Marketplace</Button></Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Breadcrumb */}
      <div className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/suppliers" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Suppliers
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">Brand Shop</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{supplier.companyName}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* ─── LEFT SIDEBAR ─── */}
        <aside className="w-full lg:w-[260px] shrink-0 border-r bg-background sticky top-16 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Logo + company name */}
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <div className="w-20 h-20 rounded-xl border bg-white shadow flex items-center justify-center overflow-hidden">
                {supplier.logoUrl ? (
                  <img src={supplier.logoUrl} alt={supplier.companyName} className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-3xl font-extrabold text-primary">{supplier.companyName.charAt(0)}</span>
                )}
              </div>
              <div>
                <h2 className="font-bold text-sm leading-tight">{supplier.companyName}</h2>
                {supplier.verified && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs text-blue-600 font-medium">Verified Supplier</span>
                  </div>
                )}
              </div>
            </div>

            {/* Nav tabs */}
            <nav className="space-y-0.5">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </div>
              {false}
                </button>
              ))}
            </nav>

            {/* Search within store */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Store</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>

            {/* Collapsible sections */}
            {categoryTags.length > 0 && (
              <CollapsibleSection title="Browse Categories" tags={categoryTags} />
            )}
            {certificationTags.length > 0 && (
              <CollapsibleSection title="Credentials" tags={certificationTags} />
            )}

            {/* Quick Actions */}
            <div className="space-y-2 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</p>
              <Link href="/rfq">
                <Button size="sm" className="w-full gap-2 justify-start text-sm">
                  <Mail className="w-3.5 h-3.5" /> Request Quote
                </Button>
              </Link>
              <MessageSupplierDialog supplierId={supplier.id} companyName={supplier.companyName} />
              <ActionModal
                title="Request Sample"
                description="I'd like to request a product sample from your catalog."
                trigger={
                  <Button variant="outline" size="sm" className="w-full gap-2 justify-start text-sm">
                    <Package className="w-3.5 h-3.5" /> Request Sample
                  </Button>
                }
              />
              {documents.length > 0 && (
                <ActionModal
                  title="Request Document"
                  description="Please provide TDS/SDS documentation for your products."
                  trigger={
                    <Button variant="outline" size="sm" className="w-full gap-2 justify-start text-sm">
                      <FileText className="w-3.5 h-3.5" /> Request Document
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <main className="flex-1 min-w-0">
          {/* Header banner */}
          <div
            className="relative bg-gradient-to-r from-primary to-blue-700 h-36 md:h-44"
            style={(supplier as any).coverUrl ? { backgroundImage: `url(${(supplier as any).coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          >
            {!(supplier as any).coverUrl && (
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #fff 0%, transparent 70%)" }} />
            )}
          </div>

          {/* Company header below banner */}
          <div className="px-6 md:px-8 pb-0 border-b">
            {/* Logo row, sits below cover with -mt to create overlap effect, z-10 keeps it on top */}
            <div className="flex items-end justify-between mb-4 flex-wrap gap-4">
              <div className="flex items-end gap-5">
                <div className="relative z-10 -mt-8 w-20 h-20 md:w-24 md:h-24 rounded-xl border-4 border-background bg-white shadow-lg flex items-center justify-center overflow-hidden shrink-0">
                  {supplier.logoUrl ? (
                    <img src={supplier.logoUrl} alt={supplier.companyName} className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-3xl font-extrabold text-primary">{supplier.companyName.charAt(0)}</span>
                  )}
                </div>
                <div className="pb-2 pt-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-extrabold">{supplier.companyName}</h1>
                    {supplier.verified && (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-none gap-1 dark:bg-blue-900/30 dark:text-blue-400">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {supplier.country}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {supplier.yearsInBusiness || 5}+ Years</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {supplier.avgResponseTime}</span>
                    {supplier.rating && (
                      <span className="flex items-center gap-1 text-amber-500 font-medium">
                        <Star className="w-3.5 h-3.5 fill-amber-500" /> {supplier.rating}/5.0
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Link href="/rfq">
                  <Button className="gap-2 shadow-sm">
                    <Mail className="w-4 h-4" /> Request Quote
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleShare}>
                  <Share2 className="w-3.5 h-3.5" /> Share
                </Button>
                <MessageSupplierDialog supplierId={supplier.id} companyName={supplier.companyName} />
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-0 border-b -mx-6 md:-mx-8 px-6 md:px-8 overflow-x-auto scrollbar-hide">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap",
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {false}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 md:px-8 py-8">
            {/* ── STOREFRONT TAB ── */}
            {activeTab === "storefront" && (
              <div className="space-y-8 max-w-3xl">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl font-extrabold">About Us</h2>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleShare}>
                    <Share2 className="w-4 h-4" /> Share
                  </Button>
                </div>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  {profile?.description ? (
                    <p>{profile.description}</p>
                  ) : (
                    <>
                      <p>{supplier.companyName} is a leading {supplier.verified ? "verified" : ""} chemical supplier based in {supplier.country}, with {supplier.yearsInBusiness || 5}+ years of industry experience. We specialize in sourcing and distributing high-quality industrial chemicals, raw materials, and specialty compounds to manufacturers across the Middle East.</p>
                      <p>Our product portfolio spans multiple industries including petrochemicals, pharmaceuticals, construction, and food ingredients. We maintain rigorous quality standards and full regulatory compliance across all our product lines, ensuring our customers receive certified, traceable materials with complete technical documentation.</p>
                      <p>With a response rate of {supplier.responseRate}% and an average response time of {supplier.avgResponseTime}, our dedicated sales team provides fast, expert support to help you find the right chemical solutions for your application.</p>
                    </>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/30 border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{supplier.productCount || profile?.products?.length || "-"}</div>
                    <div className="text-xs text-muted-foreground mt-1">Products</div>
                  </div>
                  <div className="bg-muted/30 border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{supplier.responseRate}%</div>
                    <div className="text-xs text-muted-foreground mt-1">Response Rate</div>
                  </div>
                  <div className="bg-muted/30 border rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{supplier.yearsInBusiness || 5}+</div>
                    <div className="text-xs text-muted-foreground mt-1">Years in Business</div>
                  </div>
                </div>

                {/* Certifications */}
                {supplier.certifications && supplier.certifications.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Certifications</h3>
                    <div className="flex flex-wrap gap-2">
                      {supplier.certifications.map((cert: string) => (
                        <Badge key={cert} variant="secondary" className="gap-1">
                          <ShieldCheck className="w-3 h-3 text-green-600" /> {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4 CTA buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
                  <Link href="/rfq">
                    <Button className="w-full gap-2 flex-col h-auto py-4 text-xs">
                      <Mail className="w-5 h-5" />
                      <span>Request Quote</span>
                    </Button>
                  </Link>
                  <ActionModal
                    title="Request Sample"
                    description="I'd like to request a product sample from your catalog."
                    trigger={
                      <Button variant="outline" className="w-full gap-2 flex-col h-auto py-4 text-xs">
                        <Package className="w-5 h-5" />
                        <span>Request Sample</span>
                      </Button>
                    }
                  />
                  <ActionModal
                    title="General Inquiry"
                    description="I have a general question about your products and services."
                    trigger={
                      <Button variant="outline" className="w-full gap-2 flex-col h-auto py-4 text-xs">
                        <Mail className="w-5 h-5" />
                        <span>General Inquiry</span>
                      </Button>
                    }
                  />
                  {experts.length > 0 ? (
                    <ActionModal
                      title="Ask an Expert"
                      description="I'd like to speak with a technical expert from your team."
                      trigger={
                        <Button variant="outline" className="w-full gap-2 flex-col h-auto py-4 text-xs">
                          <User className="w-5 h-5" />
                          <span>Ask an Expert</span>
                        </Button>
                      }
                    />
                  ) : documents.length > 0 ? (
                    <ActionModal
                      title="Request Document"
                      description="Please provide TDS/SDS documentation for your products."
                      trigger={
                        <Button variant="outline" className="w-full gap-2 flex-col h-auto py-4 text-xs">
                          <FileText className="w-5 h-5" />
                          <span>Request Document</span>
                        </Button>
                      }
                    />
                  ) : null}
                </div>
              </div>
            )}

            {/* ── PRODUCTS TAB ── */}
            {activeTab === "products" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Products ({profile?.products?.length ?? 0})</h2>
                </div>
                {profile?.products && profile.products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {profile.products
                      .filter((p: Product) => !sidebarSearch || p.name.toLowerCase().includes(sidebarSearch.toLowerCase()))
                      .map((product: Product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                  </div>
                ) : (
                  <div className="py-16 text-center bg-muted/20 border rounded-2xl">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No products listed yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── BRANDS TAB ── */}
            {activeTab === "brands" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Brands ({brands?.length ?? 0})</h2>
                {brands && brands.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {brands.map(brand => (
                      <div key={brand.id} className="bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                          {brand.logoUrl ? (
                            <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-contain p-2" />
                          ) : (
                            <Layers className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="font-bold text-sm">{brand.name}</h3>
                        {brand.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{brand.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center bg-muted/20 border rounded-2xl">
                    <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No brands listed for this supplier yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── DOCUMENTS TAB ── */}
            {activeTab === "documents" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Documents ({documents?.length ?? 0})</h2>
                {documents && documents.length > 0 ? (
                  <div className="border rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Document</th>
                          <th className="text-left px-4 py-3 font-semibold">Type</th>
                          <th className="text-left px-4 py-3 font-semibold">Size</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {documents.map(doc => (
                          <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary shrink-0" />
                                <span className="font-medium">{doc.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{doc.fileSize ?? "-"}</td>
                            <td className="px-4 py-3 text-right">
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="gap-1.5 h-7">
                                  <Download className="w-3.5 h-3.5" /> Download
                                </Button>
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center bg-muted/20 border rounded-2xl">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No documents available for this supplier yet.</p>
                    <ActionModal
                      title="Request Document"
                      description="Please provide TDS/SDS documentation for your products."
                      trigger={<Button variant="outline" size="sm" className="mt-4 gap-2"><FileText className="w-4 h-4" />Request Documents</Button>}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── EXPERTS TAB ── */}
            {activeTab === "experts" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Experts ({experts?.length ?? 0})</h2>
                {experts && experts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {experts.map(expert => (
                      <div key={expert.id} className="bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0">
                            {expert.avatarUrl ? (
                              <img src={expert.avatarUrl} alt={expert.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm">{expert.name}</h3>
                            <p className="text-xs text-muted-foreground">{expert.title}</p>
                          </div>
                        </div>
                        <ActionModal
                          title={`Contact ${expert.name}`}
                          description={`Hi ${expert.name}, I have a technical question I'd like to discuss.`}
                          trigger={
                            <Button variant="outline" size="sm" className="w-full gap-2">
                              <Mail className="w-3.5 h-3.5" /> Contact Expert
                            </Button>
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center bg-muted/20 border rounded-2xl">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No experts listed for this supplier yet.</p>
                    <ActionModal
                      title="Ask an Expert"
                      description="I'd like to speak with a technical expert from your team."
                      trigger={<Button variant="outline" size="sm" className="mt-4 gap-2"><User className="w-4 h-4" />Ask an Expert</Button>}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </MainLayout>
  );
}
