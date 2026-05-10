import { MainLayout } from "@/components/layout/MainLayout";
import { Link, useRoute, useLocation } from "wouter";
import { useGetProduct } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Box,
  CheckCircle2,
  Download,
  FileText,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { MotionCTAButton } from "@/components/MotionCTAButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

type SupplierDocument = {
  id: number;
  title: string;
  type: string;
  fileUrl: string;
  fileSize?: string | null;
};

type DetailRow = {
  label: string;
  value?: React.ReactNode;
};

const requestText = "Available on request";

function ContactSupplierDialog({ supplierId, supplierName, productName }: { supplierId: number; supplierName: string; productName: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState(`Hi, I'm interested in your product "${productName}". Could you please provide more information about pricing and availability?`);
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
      toast({ title: "Message sent!", description: `Your message to ${supplierName} has been sent.` });
      setOpen(false);
      navigate("/dashboard/messages");
    } catch {
      toast({ title: "Error", description: "Could not send message. Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="w-full gap-2">
          <MessageCircle className="w-4 h-4" /> Contact Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact {supplierName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Send a message to start a conversation about this product.</p>
          <Textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !message.trim()} className="gap-2">
              <MessageCircle className="w-4 h-4" />
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatValue(value?: unknown) {
  if (value === null || value === undefined || value === "") return requestText;
  return String(value).replace(/_/g, " ");
}

function getSpec(product: any, names: string[]) {
  const specs = Array.isArray(product?.technicalSpecs) ? product.technicalSpecs : [];
  const wanted = names.map((name) => name.toLowerCase());
  const match = specs.find((spec: any) => wanted.includes(String(spec?.name ?? "").toLowerCase()));
  if (!match?.value) return "";
  return [match.value, match.unit].filter(Boolean).join(" ");
}

function getSpecLike(product: any, terms: string[]) {
  const specs = Array.isArray(product?.technicalSpecs) ? product.technicalSpecs : [];
  const wanted = terms.map((term) => term.toLowerCase());
  const match = specs.find((spec: any) => {
    const name = String(spec?.name ?? "").toLowerCase();
    return wanted.some((term) => name.includes(term));
  });
  if (!match?.value) return "";
  return [match.value, match.unit].filter(Boolean).join(" ");
}

function getIncoterms(product: any) {
  const specs = Array.isArray(product?.technicalSpecs) ? product.technicalSpecs : [];
  const applications = Array.isArray(product?.applications) ? product.applications : [];
  return Array.from(new Set([
    ...specs
      .filter((spec: any) => String(spec?.name ?? "").toLowerCase() === "incoterm")
      .map((spec: any) => String(spec?.value ?? "").trim()),
    ...applications
      .filter((value: string) => value.startsWith("Incoterm:"))
      .map((value: string) => value.replace("Incoterm:", "").trim()),
  ].filter(Boolean)));
}

function getApplications(product: any) {
  return (Array.isArray(product?.applications) ? product.applications : [])
    .filter((value: string) => !value.startsWith("Incoterm:") && !value.startsWith("Category:"))
    .slice(0, 10);
}

function InfoCard({ title, rows }: { title: string; rows: DetailRow[] }) {
  return (
    <Card className="border-muted-foreground/10 shadow-none">
      <CardContent className="p-5">
        <h3 className="font-semibold mb-4">{title}</h3>
        <div className="divide-y">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-2 gap-4 py-3 text-sm first:pt-0 last:pb-0">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium text-right sm:text-left">{row.value || requestText}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentCard({ title, status, href }: { title: string; status: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4">
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{status}</div>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" /> Download
          </Button>
        </a>
      ) : (
        <Button variant="secondary" size="sm">Request</Button>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const id = Number(params?.id);
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [supplierDocuments, setSupplierDocuments] = useState<SupplierDocument[]>([]);

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id } as any,
  });

  useEffect(() => {
    let cancelled = false;

    if (!product?.supplierId) {
      setSupplierDocuments([]);
      return () => {
        cancelled = true;
      };
    }

    const loadSupplierDocuments = async () => {
      try {
        const res = await fetch(`/api/suppliers/${product.supplierId}/documents`);
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setSupplierDocuments(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSupplierDocuments([]);
      }
    };

    void loadSupplierDocuments();
    return () => {
      cancelled = true;
    };
  }, [product?.supplierId]);

  const derived = useMemo(() => {
    if (!product) return null;
    const incoterms = getIncoterms(product);
    const applications = getApplications(product);
    const industries = applications.slice(0, 8);
    const purity = getSpec(product, ["Purity", "Minimum Purity"]) || (product as any).minimumPurity;
    const appearance = getSpec(product, ["Appearance"]);
    const color = getSpec(product, ["Color"]);
    const formula = getSpec(product, ["Formula", "Chemical Formula"]);
    const chemicalName = getSpec(product, ["Chemical name", "Chemical Name"]);

    return {
      incoterms,
      applications,
      industries,
      purity,
      appearance,
      color,
      formula,
      chemicalName,
      solubility: getSpecLike(product, ["solubility"]),
      density: getSpecLike(product, ["density"]),
      meltingPoint: getSpecLike(product, ["melting"]),
      shelfLife: getSpecLike(product, ["shelf"]),
      storage: getSpecLike(product, ["storage"]),
    };
  }, [product]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-8 space-y-8">
          <Skeleton className="h-8 w-32" />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-32 w-full mt-8" />
            </div>
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!product || !derived) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-20 text-center">
          <h2 className="text-2xl font-bold">Product not found</h2>
          <p className="text-muted-foreground mt-2">The product you're looking for doesn't exist or has been removed.</p>
          <Link href="/marketplace">
            <Button className="mt-6">Back to Marketplace</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const handleRfq = () => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth/login");
      return;
    }
    const qty = (document.getElementById("qty") as HTMLInputElement)?.value || "";
    const params = new URLSearchParams();
    params.set("product", product.name);
    params.set("productId", String(product.id));
    params.set("supplierId", String(product.supplierId));
    if (product.categoryId) params.set("categoryId", String(product.categoryId));
    if (product.casNumber) params.set("cas", product.casNumber);
    if (product.moqUnit) params.set("unit", product.moqUnit);
    if (qty) params.set("qty", qty);
    navigate(`/dashboard/rfqs?${params.toString()}`);
  };

  const docByTitle = (keywords: string[]) => supplierDocuments.find((doc) => {
    const text = `${doc.title} ${doc.type}`.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });
  const sdsDoc = docByTitle(["sds", "safety"]) ?? (product.sdsDocumentUrl ? { fileUrl: product.sdsDocumentUrl } as SupplierDocument : undefined);
  const tdsDoc = docByTitle(["tds", "technical"]);
  const coaDoc = docByTitle(["coa", "certificate of analysis"]);

  const keyBadges = [
    derived.purity ? { label: "Purity", value: derived.purity } : null,
    { label: "MOQ", value: `${product.moq} ${product.moqUnit}` },
    { label: "Location", value: product.countryOfOrigin || product.supplierCountry },
    derived.incoterms.length > 0 ? { label: "Incoterm", value: derived.incoterms.slice(0, 3).join(", ") } : null,
    { label: "Lead time", value: product.deliveryLeadTime },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <MainLayout>
      <div className="bg-muted/20 border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-4">
          <Link href="/marketplace" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10 py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-7">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {product.categoryName && <Badge variant="outline">{product.categoryName}</Badge>}
                {product.casNumber && (
                  <span className="rounded-md bg-muted px-2 py-1 text-sm font-mono text-muted-foreground">CAS: {product.casNumber}</span>
                )}
                {product.collectiveEligible && <Badge className="border-none">Collective Eligible</Badge>}
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{product.name}</h1>
                <p className="max-w-3xl text-base md:text-lg leading-relaxed text-muted-foreground">{product.description || requestText}</p>
              </div>

              <Link href={`/suppliers/${product.supplierId}`} className="inline-flex items-center gap-3 rounded-lg border bg-card px-3 py-2 hover:bg-muted/40 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {product.supplierName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    {product.supplierName}
                    {product.supplierVerified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {product.supplierCountry || requestText}
                  </div>
                </div>
              </Link>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {keyBadges.map((badge) => (
                  <div key={badge.label} className="rounded-lg border bg-card p-3">
                    <div className="text-xs text-muted-foreground">{badge.label}</div>
                    <div className="mt-1 text-sm font-semibold">{badge.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto bg-transparent p-0 overflow-x-auto flex-nowrap">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3">Overview</TabsTrigger>
                <TabsTrigger value="specs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3">Technical Specs</TabsTrigger>
                <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3">Documents</TabsTrigger>
                <TabsTrigger value="supplier" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-5 py-3">Supplier</TabsTrigger>
              </TabsList>

              <div className="py-6">
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoCard
                      title="About this product"
                      rows={[
                        { label: "Description", value: product.description || requestText },
                        { label: "Category", value: product.categoryName },
                        { label: "CAS number", value: product.casNumber },
                      ]}
                    />
                    <InfoCard
                      title="Availability"
                      rows={[
                        { label: "Status", value: formatValue(product.availability) },
                        { label: "Lead time", value: product.deliveryLeadTime },
                        { label: "Region", value: product.countryOfOrigin || product.supplierCountry },
                      ]}
                    />
                    <InfoCard
                      title="Applications"
                      rows={[
                        { label: "Applications", value: derived.applications.length ? derived.applications.join(", ") : requestText },
                        { label: "Industries", value: derived.industries.length ? derived.industries.join(", ") : requestText },
                      ]}
                    />
                    <InfoCard
                      title="Packaging"
                      rows={[
                        { label: "Packaging", value: (product as any).packaging },
                        { label: "Unit", value: product.moqUnit },
                      ]}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="specs">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <InfoCard
                      title="Product Identity"
                      rows={[
                        { label: "Chemical name", value: derived.chemicalName },
                        { label: "CAS number", value: product.casNumber },
                        { label: "Formula", value: derived.formula },
                        { label: "Purity", value: derived.purity },
                        { label: "Appearance", value: derived.appearance },
                        { label: "Color", value: derived.color },
                      ]}
                    />
                    <InfoCard
                      title="Commercial Terms"
                      rows={[
                        { label: "Minimum order quantity", value: `${product.moq} ${product.moqUnit}` },
                        { label: "Maximum quantity", value: getSpec(product, ["Maximum Quantity"]) },
                        { label: "Unit", value: product.moqUnit },
                        {
                          label: "Incoterms",
                          value: derived.incoterms.length ? (
                            <span className="flex flex-wrap justify-end gap-1 sm:justify-start">
                              {derived.incoterms.map((term) => <Badge key={term} variant="secondary">{term}</Badge>)}
                            </span>
                          ) : requestText,
                        },
                        { label: "Lead time", value: product.deliveryLeadTime },
                        { label: "Regional availability", value: product.countryOfOrigin || product.supplierCountry },
                      ]}
                    />
                    <InfoCard
                      title="Technical Properties"
                      rows={[
                        { label: "Solubility", value: derived.solubility },
                        { label: "Density", value: derived.density },
                        { label: "Melting point", value: derived.meltingPoint },
                        { label: "Shelf life", value: derived.shelfLife },
                        { label: "Storage conditions", value: derived.storage },
                      ]}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-3 max-w-3xl">
                  <DocumentCard title="Safety Data Sheet (SDS)" status={sdsDoc ? "Available" : requestText} href={sdsDoc?.fileUrl} />
                  <DocumentCard title="Technical Data Sheet (TDS)" status={tdsDoc ? "Available" : requestText} href={tdsDoc?.fileUrl} />
                  <DocumentCard title="Certificate of Analysis (COA)" status={coaDoc ? "Available" : requestText} href={coaDoc?.fileUrl} />
                  {supplierDocuments
                    .filter((doc) => ![sdsDoc?.id, tdsDoc?.id, coaDoc?.id].includes(doc.id))
                    .map((doc) => (
                      <DocumentCard key={doc.id} title={doc.title} status={`${doc.type}${doc.fileSize ? ` - ${doc.fileSize}` : ""}`} href={doc.fileUrl} />
                    ))}
                </TabsContent>

                <TabsContent value="supplier">
                  <Card className="max-w-3xl shadow-none">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-semibold">{product.supplierName}</h3>
                              {product.supplierVerified && <Badge variant="secondary" className="gap-1"><ShieldCheck className="w-3 h-3" /> Verified</Badge>}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" /> {product.supplierCountry || requestText}
                            </div>
                          </div>
                          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                            Contact this supplier for technical documentation, quote details, sample availability, and commercial terms for {product.name}.
                          </p>
                        </div>
                        <ContactSupplierDialog
                          supplierId={product.supplierId}
                          supplierName={product.supplierName}
                          productName={product.name}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </section>

          <aside className="lg:pt-1">
            <Card className="sticky top-24 border-primary/15 shadow-sm">
              <CardContent className="p-6 space-y-5">
                {product.basePrice && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Estimated Price</div>
                    <div className="text-3xl font-bold text-primary">
                      {product.currency} {product.basePrice.toLocaleString()}
                      <span className="text-base font-normal text-muted-foreground ml-1">/ {product.moqUnit}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label htmlFor="qty">Request Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Input id="qty" type="number" defaultValue={product.moq} min={product.moq} className="text-lg" />
                    <span className="font-medium px-3 text-muted-foreground bg-muted rounded-md h-10 flex items-center border">{product.moqUnit}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <MotionCTAButton className="w-full" onClick={handleRfq}>
                    Request Quotation (RFQ)
                  </MotionCTAButton>
                  <Button size="lg" variant="secondary" className="w-full" onClick={handleRfq}>
                    Request Sample
                  </Button>
                  <ContactSupplierDialog
                    supplierId={product.supplierId}
                    supplierName={product.supplierName}
                    productName={product.name}
                  />
                  {product.collectiveEligible && (
                    <Link href="/collective-orders">
                      <Button size="lg" variant="secondary" className="w-full text-base">
                        View Collective Orders
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Chemidot Buyer Protection
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
