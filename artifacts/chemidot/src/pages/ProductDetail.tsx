import { MainLayout } from "@/components/layout/MainLayout";
import { Link, useRoute, useLocation } from "wouter";
import { useGetProduct } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ArrowLeft, Package, MapPin, Truck, Box, FileText, CheckCircle2, MessageCircle } from "lucide-react";
import { MotionCTAButton } from "@/components/MotionCTAButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

function ContactSupplierDialog({ supplierId, supplierName, productName }: { supplierId: number; supplierName: string; productName: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState(`Hi, I'm interested in your product "${productName}". Could you please provide more information about pricing and availability?`);
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
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your message..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={sending || !message.trim()} className="gap-2">
              <MessageCircle className="w-4 h-4" />
              {sending ? "Sending…" : "Send Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const id = Number(params?.id);
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [supplierDocuments, setSupplierDocuments] = useState<Array<{ id: number; title: string; type: string; fileUrl: string; fileSize?: string | null }>>([]);

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id } as any
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-8 space-y-8">
          <Skeleton className="h-8 w-32" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-[500px] w-full rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-32 w-full mt-8" />
              <Skeleton className="h-48 w-full mt-4" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!product) {
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

  useEffect(() => {
    let cancelled = false;
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
  }, [product.supplierId]);

  const handleRfq = () => {
    if (authLoading) return;
    if (!user) { navigate("/auth/login"); return; }
    const qty = (document.getElementById("qty") as HTMLInputElement)?.value || "";
    const params = new URLSearchParams();
    params.set("product", product.name);
    if (qty) params.set("qty", qty);
    navigate(`/dashboard/rfqs?${params.toString()}`);
  };

  return (
    <MainLayout>
      <div className="bg-muted/30 border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-4">
          <Link href="/marketplace" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10 py-8">
        <div className="grid lg:grid-cols-3 gap-10">
          
          {/* Image */}
          <div className="lg:col-span-1 space-y-4">
            <div className="aspect-square bg-white rounded-xl border overflow-hidden flex items-center justify-center p-4 relative">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <Package className="w-24 h-24 text-muted-foreground/30" />
              )}
              {product.collectiveEligible && (
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground text-sm py-1 border-none shadow-md">
                  Collective Eligible
                </Badge>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 grid md:grid-cols-5 gap-10">
            <div className="md:col-span-3 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{product.categoryName}</Badge>
                  {product.casNumber && (
                    <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">CAS: {product.casNumber}</span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">{product.name}</h1>
                <p className="text-lg text-muted-foreground">{product.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 py-4 border-y">
                <Link href={`/suppliers/${product.supplierId}`} className="flex items-center gap-2 hover:bg-muted p-2 -ml-2 rounded-lg transition-colors">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center border font-bold text-secondary-foreground">
                    {product.supplierName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-1">
                      {product.supplierName}
                      {product.supplierVerified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {product.supplierCountry}
                    </div>
                  </div>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5"><Box className="w-4 h-4"/> MOQ</div>
                  <div className="font-medium text-lg">{product.moq} {product.moqUnit}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Availability</div>
                  <div className="font-medium text-lg capitalize">{product.availability.replace('_', ' ')}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5"><Truck className="w-4 h-4"/> Lead Time</div>
                  <div className="font-medium text-lg">{product.deliveryLeadTime}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="w-4 h-4"/> Origin</div>
                  <div className="font-medium text-lg">{product.countryOfOrigin || product.supplierCountry}</div>
                </div>
              </div>
            </div>

            {/* Action Card */}
            <div className="md:col-span-2">
              <Card className="sticky top-24 border-primary/20 shadow-lg">
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
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto bg-transparent p-0 overflow-x-auto flex-nowrap">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Overview</TabsTrigger>
              <TabsTrigger value="specs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Technical Specs</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">Documents</TabsTrigger>
            </TabsList>
            <div className="py-6">
              <TabsContent value="overview" className="space-y-6">
                <div className="prose max-w-4xl dark:prose-invert">
                  <h3>About {product.name}</h3>
                  <p>{product.description}</p>
                </div>
              </TabsContent>
              <TabsContent value="specs">
                {product.technicalSpecs && product.technicalSpecs.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden max-w-4xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 font-medium">Property</th>
                          <th className="px-4 py-3 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {product.technicalSpecs.map((spec, i) => (
                          <tr key={i} className="hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{spec.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {spec.value} {spec.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No technical specifications provided.</p>
                )}
              </TabsContent>
              <TabsContent value="documents">
                {supplierDocuments.length > 0 || product.sdsDocumentUrl ? (
                  <div className="space-y-3 max-w-4xl">
                    {supplierDocuments.map((doc) => (
                      <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 text-red-600 rounded flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium">{doc.title}</div>
                            <div className="text-sm text-muted-foreground">{doc.type}{doc.fileSize ? ` • ${doc.fileSize}` : ""}</div>
                          </div>
                        </div>
                        <span className="text-sm text-primary">Open</span>
                      </a>
                    ))}
                    {product.sdsDocumentUrl && !supplierDocuments.some((doc) => doc.fileUrl === product.sdsDocumentUrl) ? (
                      <a href={product.sdsDocumentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-10 h-10 bg-red-100 text-red-600 rounded flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium">Safety Data Sheet (SDS)</div>
                          <div className="text-sm text-muted-foreground">PDF Document</div>
                        </div>
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No documents available.</p>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
