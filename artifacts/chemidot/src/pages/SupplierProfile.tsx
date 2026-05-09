import { MainLayout } from "@/components/layout/MainLayout";
import { Link, useRoute, useLocation } from "wouter";
import { useGetSupplier } from "@workspace/api-client-react";
import type { SupplierProfile as SupplierProfileType, Product } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Download,
  FileText,
  Layers,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type StoreTab = "storefront" | "products" | "about" | "brands" | "documents";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "C";
}

function CompanyAvatar({ name, logoUrl, size = "lg" }: { name: string; logoUrl?: string | null; size?: "sm" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const classes = size === "lg" ? "h-20 w-20 text-2xl" : "h-12 w-12 text-base";

  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-lg border bg-white font-bold text-primary shadow-sm overflow-hidden", classes)}>
      {logoUrl && !failed ? (
        <img
          src={logoUrl}
          alt={name}
          className="h-full w-full object-contain p-2"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  );
}

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
      toast({ title: "Request sent!", description: `Your ${title.toLowerCase()} has been submitted.` });
      setOpen(false);
      setName("");
      setEmail("");
      setMessage(description ?? "");
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
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your request..." required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={sending}>{sending ? "Sending..." : "Submit Request"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MessageSupplierDialog({ supplierId, companyName }: { supplierId: number; companyName: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState(`Hi, I'm interested in doing business with ${companyName}. Could you share more about your product offerings and pricing?`);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSend = async () => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth/login");
      return;
    }

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
        <Button variant="outline" className="gap-2">
          <MessageSquare className="w-4 h-4" /> Message Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Message {companyName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !message.trim()} className="gap-2">
              <MessageSquare className="w-4 h-4" />
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoTile({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function ProductTextCard({ product }: { product: Product }) {
  const [, navigate] = useLocation();
  const specs = Array.isArray((product as any).technicalSpecs) ? (product as any).technicalSpecs : [];
  const purity = specs.find((spec: any) => String(spec?.name ?? "").toLowerCase().includes("purity"));
  const incoterm = specs.find((spec: any) => String(spec?.name ?? "").toLowerCase() === "incoterm");

  return (
    <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <button
            type="button"
            onClick={() => navigate(`/products/${product.id}`)}
            className="text-left font-semibold hover:text-primary"
          >
            {product.name}
          </button>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {(product as any).categoryName && <Badge variant="outline">{(product as any).categoryName}</Badge>}
            {purity?.value && <span>Purity: {purity.value}{purity.unit ? ` ${purity.unit}` : ""}</span>}
            <span>MOQ: {product.moq} {product.moqUnit}</span>
            {incoterm?.value && <span>Incoterm: {incoterm.value}</span>}
          </div>
          {product.description && <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>}
        </div>
        <Button type="button" size="sm" onClick={() => navigate(`/products/${product.id}`)}>
          Request Quote
        </Button>
      </div>
    </div>
  );
}

export default function SupplierProfile() {
  const [, params] = useRoute("/suppliers/:id");
  const id = Number(params?.id);
  const [activeTab, setActiveTab] = useState<StoreTab>("storefront");
  const [search, setSearch] = useState("");
  const [brands, setBrands] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const { data: supplier, isLoading } = useGetSupplier(id);
  const profile = supplier as SupplierProfileType | undefined;

  const products = profile?.products ?? [];
  const categoryTags = useMemo(() => {
    const tags = new Set<string>();
    for (const product of products) {
      if ((product as any).categoryName) tags.add((product as any).categoryName);
    }
    return Array.from(tags).slice(0, 8);
  }, [products]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadStoreSections = async () => {
      try {
        const [brandsRes, documentsRes] = await Promise.all([
          fetch(`/api/suppliers/${id}/brands`),
          fetch(`/api/suppliers/${id}/documents`),
        ]);
        const [brandsData, documentsData] = await Promise.all([
          brandsRes.ok ? brandsRes.json() : [],
          documentsRes.ok ? documentsRes.json() : [],
        ]);

        if (!cancelled) {
          setBrands(Array.isArray(brandsData) ? brandsData : []);
          setDocuments(Array.isArray(documentsData) ? documentsData : []);
        }
      } catch {
        if (!cancelled) {
          setBrands([]);
          setDocuments([]);
        }
      }
    };

    void loadStoreSections();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tabs = useMemo(() => {
    const base: { key: StoreTab; label: string }[] = [
      { key: "storefront", label: "Storefront" },
      { key: "products", label: "Products" },
      { key: "about", label: "About" },
    ];
    if (brands.length > 0) base.push({ key: "brands", label: "Brands" });
    if (documents.length > 0) base.push({ key: "documents", label: "Documents" });
    return base;
  }, [brands.length, documents.length]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab)) setActiveTab("storefront");
  }, [activeTab, tabs]);

  const filteredProducts = products.filter((product: Product) => {
    if (!search.trim()) return true;
    return product.name.toLowerCase().includes(search.toLowerCase());
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-8 space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
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

  const companyDescription = profile?.description || `${supplier.companyName} supplies chemical products and related documentation for buyers across Chemidot. Contact the supplier to confirm availability, technical details, and commercial terms.`;

  return (
    <MainLayout>
      <div className="border-b bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-3">
          <Link href="/suppliers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Suppliers
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10 py-8 space-y-8">
        <section className="rounded-xl border bg-card p-5 md:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <CompanyAvatar name={supplier.companyName} logoUrl={supplier.logoUrl} />
              <div className="space-y-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{supplier.companyName}</h1>
                    {supplier.verified && (
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Verified
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {supplier.country && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {supplier.country}</span>}
                    {supplier.yearsInBusiness ? <span>{supplier.yearsInBusiness}+ years in business</span> : null}
                    {supplier.avgResponseTime ? <span>Response time: {supplier.avgResponseTime}</span> : null}
                  </div>
                </div>
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{companyDescription}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Link href="/rfq">
                <Button className="w-full gap-2 sm:w-auto">
                  <Mail className="w-4 h-4" /> Request Quote
                </Button>
              </Link>
              <MessageSupplierDialog supplierId={supplier.id} companyName={supplier.companyName} />
              <Button variant="secondary" className="gap-2" onClick={() => setActiveTab("products")}>
                <Package className="w-4 h-4" /> View Products
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile label="Products listed" value={supplier.productCount || products.length || "Not available"} />
          <InfoTile label="Response rate" value={supplier.responseRate ? `${supplier.responseRate}%` : "Not available"} />
          <InfoTile label="Years in business" value={supplier.yearsInBusiness ? `${supplier.yearsInBusiness}+` : "Not available"} />
          <InfoTile label="Country / region" value={supplier.country || "Not available"} />
        </section>

        <section>
          <div className="flex gap-1 overflow-x-auto border-b">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-7">
            {activeTab === "storefront" && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                  <div className="rounded-lg border bg-card p-5">
                    <h2 className="font-semibold">About the company</h2>
                    <p className="mt-3 leading-relaxed text-muted-foreground">{companyDescription}</p>
                  </div>

                  {categoryTags.length > 0 && (
                    <div className="rounded-lg border bg-card p-5">
                      <h2 className="font-semibold">Main product categories</h2>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {categoryTags.map((category) => <Badge key={category} variant="secondary">{category}</Badge>)}
                      </div>
                    </div>
                  )}

                  {supplier.certifications && supplier.certifications.length > 0 && (
                    <div className="rounded-lg border bg-card p-5">
                      <h2 className="font-semibold">Certifications</h2>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {supplier.certifications.map((cert: string) => (
                          <Badge key={cert} variant="outline" className="gap-1">
                            <ShieldCheck className="w-3 h-3 text-green-600" /> {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border bg-card p-5">
                  <h2 className="font-semibold">Featured products</h2>
                  <div className="mt-4 space-y-3">
                    {products.slice(0, 3).length > 0 ? (
                      products.slice(0, 3).map((product: Product) => <ProductTextCard key={product.id} product={product} />)
                    ) : (
                      <p className="text-sm text-muted-foreground">No featured products available yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "products" && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Products</h2>
                    <p className="text-sm text-muted-foreground">{products.length} product(s) listed by this supplier.</p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="pl-9" />
                  </div>
                </div>
                {filteredProducts.length > 0 ? (
                  <div className="space-y-3">
                    {filteredProducts.map((product: Product) => <ProductTextCard key={product.id} product={product} />)}
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/20 py-14 text-center">
                    <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="font-medium text-muted-foreground">No matching products found.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "about" && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border bg-card p-5">
                  <h2 className="font-semibold">Company description</h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{companyDescription}</p>
                </div>
                <div className="rounded-lg border bg-card p-5">
                  <h2 className="font-semibold">Company details</h2>
                  <div className="mt-3 divide-y text-sm">
                    <div className="flex justify-between gap-4 py-3"><span className="text-muted-foreground">Location</span><span className="font-medium">{supplier.country || "Not available"}</span></div>
                    <div className="flex justify-between gap-4 py-3"><span className="text-muted-foreground">Products</span><span className="font-medium">{supplier.productCount || products.length || "Not available"}</span></div>
                    <div className="flex justify-between gap-4 py-3"><span className="text-muted-foreground">Capabilities</span><span className="font-medium">{categoryTags.length ? categoryTags.join(", ") : "Available on request"}</span></div>
                    <div className="flex justify-between gap-4 py-3"><span className="text-muted-foreground">Verification</span><span className="font-medium">{supplier.verified ? "Verified" : "Not verified"}</span></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "brands" && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {brands.map((brand) => (
                  <div key={brand.id} className="rounded-lg border bg-card p-5">
                    <div className="flex items-start gap-3">
                      <CompanyAvatar name={brand.name} logoUrl={brand.logoUrl} size="sm" />
                      <div>
                        <h3 className="font-semibold">{brand.name}</h3>
                        {brand.description && <p className="mt-1 text-sm text-muted-foreground">{brand.description}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{doc.title}</div>
                        <div className="text-sm text-muted-foreground">{doc.type}{doc.fileSize ? ` - ${doc.fileSize}` : ""}</div>
                      </div>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="w-4 h-4" /> Download
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
