import { MainLayout } from "@/components/layout/MainLayout";
import { Link, useRoute, useLocation } from "wouter";
import { useGetCollectiveOrder, useJoinCollectiveOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Clock, ArrowLeft, Package, MapPin, TrendingDown, Target, Building2, HelpCircle } from "lucide-react";
import { MotionCTAButton } from "@/components/MotionCTAButton";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getStoredToken, useAuth } from "@/lib/auth";
import { userCanSell } from "@/lib/account-capabilities";

async function collectiveAction(path: string, body: unknown) {
  const token = getStoredToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || "Request failed");
  }
  return res.json();
}

export default function CollectiveOrderDetail() {
  const [, params] = useRoute("/collective-orders/:id");
  const id = Number(params?.id);
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [quantity, setQuantity] = useState<number>(0);
  const [destination, setDestination] = useState("");
  const [offerForm, setOfferForm] = useState({
    unitPrice: "",
    availableQty: "",
    leadTime: "",
    incoterms: "DAP",
    paymentTerms: "",
    deliveryModel: "to_be_agreed",
    deliveryCostMode: "quoted_after_supplier_offer",
    notes: "",
  });

  const { data: order, isLoading, refetch } = useGetCollectiveOrder(id, {
    query: { enabled: !!id } as any
  });

  const joinMutation = useJoinCollectiveOrder();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join a collective order.",
      });
      navigate("/auth/login");
      return;
    }
    
    joinMutation.mutate(
      { id, data: { quantity, deliveryDestination: destination } },
      {
        onSuccess: () => {
          toast({
            title: "Successfully Joined!",
            description: `You have committed to ${quantity} ${order?.unit}.`,
          });
          refetch();
        }
      }
    );
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await collectiveAction(`/api/collective-orders/${id}/offers`, {
        unitPrice: Number(offerForm.unitPrice),
        currency: "SAR",
        availableQty: Number(offerForm.availableQty),
        leadTime: offerForm.leadTime,
        incoterms: offerForm.incoterms.split(",").map((v) => v.trim()).filter(Boolean),
        paymentTerms: offerForm.paymentTerms || undefined,
        deliveryModel: offerForm.deliveryModel,
        deliveryCostMode: offerForm.deliveryCostMode,
        notes: offerForm.notes || undefined,
      });
      toast({ title: "Offer submitted", description: "Chemidot and the lead buyer can now review it." });
      refetch();
    } catch (err: any) {
      toast({ title: "Offer failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRecommendOffer = async (offerId: number) => {
    try {
      await collectiveAction(`/api/collective-orders/${id}/recommend-offer`, { offerId });
      toast({ title: "Offer recommended", description: "Chemidot Admin will review and approve the final selection." });
      refetch();
    } catch (err: any) {
      toast({ title: "Could not recommend offer", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-8 space-y-8">
          <Skeleton className="h-8 w-48" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!order) return null;

  const progress = Math.min(100, (order.currentQuantity / order.targetQuantity) * 100);
  const currency = order.product?.currency || order.offers?.[0]?.currency || "SAR";
  const stage = order.collectiveStage || "gathering";
  const isLeadBuyer = user?.id && order.createdByBuyerId === user.id;
  const canSubmitOffer = userCanSell(user) && stage === "offers_open";

  return (
    <MainLayout>
      <div className="bg-muted/30 border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-4">
          <Link href="/collective-orders" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Collective Orders
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10 py-8">
        <div className="grid lg:grid-cols-3 gap-10">
          
          <div className="lg:col-span-2 space-y-8">
            {/* Header Info */}
            <div className="flex gap-6">
              <div className="w-32 h-32 md:w-40 md:h-40 shrink-0 bg-white border rounded-xl overflow-hidden flex items-center justify-center p-2">
                {order.productImageUrl ? (
                  <img src={order.productImageUrl} alt={order.productName} className="w-full h-full object-contain" />
                ) : (
                  <Package className="w-12 h-12 text-muted-foreground/30" />
                )}
              </div>
              <div className="flex flex-col justify-center space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Collective Order</Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Closes {new Date(order.deadline).toLocaleDateString()}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{order.productName}</h1>
                {order.supplierId ? (
                  <Link href={`/suppliers/${order.supplierId}`} className="text-muted-foreground hover:text-primary flex items-center gap-1.5 w-fit">
                    <Building2 className="w-4 h-4" /> {order.supplierName}
                  </Link>
                ) : (
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Supplier offers pending
                  </div>
                )}
              </div>
            </div>

            {/* Progress Card */}
            <Card className="border-primary/20 shadow-md bg-gradient-to-br from-background to-primary/5">
              <CardContent className="p-6 md:p-8 space-y-6">
                <div className="grid sm:grid-cols-3 gap-6 sm:gap-4 mb-2">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Current Volume</div>
                    <div className="text-2xl font-bold">{order.currentQuantity.toLocaleString()} <span className="text-base font-normal text-muted-foreground">{order.unit}</span></div>
                  </div>
                  <div className="sm:text-center">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Target Volume</div>
                    <div className="text-2xl font-bold">{order.targetQuantity.toLocaleString()} <span className="text-base font-normal text-muted-foreground">{order.unit}</span></div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Buyers Joined</div>
                    <div className="text-2xl font-bold flex items-center sm:justify-end gap-2">
                      <Users className="w-5 h-5 text-primary" /> {order.participantCount}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-primary">{Math.round(progress)}% Funded</span>
                    {order.nextTierQuantity && (
                      <span className="text-muted-foreground">Next tier unlocks at {order.nextTierQuantity.toLocaleString()} {order.unit}</span>
                    )}
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Stage: {stage.replace(/_/g, " ")}</Badge>
                  <Badge variant="secondary">Lead buyer managed</Badge>
                  <Badge variant="secondary">Admin protected</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  The collective price applies to the product unit price. Delivery costs may vary based on each buyer's location unless the supplier includes delivery in the offer.
                </p>
              </CardContent>
            </Card>

            {/* Pricing Tiers */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-primary" />
                Volume Pricing Tiers
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {order.pricingTiers.map((tier, idx) => {
                  const isCurrent = order.currentPrice === tier.pricePerUnit;
                  return (
                    <Card key={idx} className={isCurrent ? "border-primary shadow-sm relative overflow-hidden" : "bg-muted/30"}>
                      {isCurrent && (
                        <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Tier {idx + 1}</CardTitle>
                        <CardDescription>
                          {tier.minQuantity.toLocaleString()}{tier.maxQuantity ? ` - ${tier.maxQuantity.toLocaleString()}` : '+'} {order.unit}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{currency} {tier.pricePerUnit.toLocaleString()}</div>
                        <div className="text-sm text-green-600 font-medium mt-1">-{tier.discountPercent}% from base</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {canSubmitOffer && (
              <Card>
                <CardHeader>
                  <CardTitle>Submit Supplier Offer</CardTitle>
                  <CardDescription>Buyer details stay private until Chemidot locks and approves allocation sharing.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleOfferSubmit} className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unit Price (SAR)</Label>
                      <Input type="number" min="0.01" step="0.01" value={offerForm.unitPrice} onChange={(e) => setOfferForm(v => ({ ...v, unitPrice: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Available Quantity ({order.unit})</Label>
                      <Input type="number" min="0.01" step="0.01" value={offerForm.availableQty} onChange={(e) => setOfferForm(v => ({ ...v, availableQty: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Lead Time</Label>
                      <Input placeholder="e.g. 14 days" value={offerForm.leadTime} onChange={(e) => setOfferForm(v => ({ ...v, leadTime: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Incoterms</Label>
                      <Input placeholder="DAP, CIF, DDP" value={offerForm.incoterms} onChange={(e) => setOfferForm(v => ({ ...v, incoterms: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery Model</Label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={offerForm.deliveryModel} onChange={(e) => setOfferForm(v => ({ ...v, deliveryModel: e.target.value }))}>
                        <option value="supplier_delivery_to_each_buyer">Supplier delivery to each buyer</option>
                        <option value="one_delivery_hub">One delivery hub</option>
                        <option value="buyer_pickup">Buyer pickup</option>
                        <option value="to_be_agreed">To be agreed</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery Cost</Label>
                      <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={offerForm.deliveryCostMode} onChange={(e) => setOfferForm(v => ({ ...v, deliveryCostMode: e.target.value }))}>
                        <option value="included">Included</option>
                        <option value="separate_per_buyer">Separate per buyer</option>
                        <option value="quoted_after_supplier_offer">Quoted after supplier offer</option>
                        <option value="one_hub_delivery">One hub delivery</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Payment Terms</Label>
                      <Input placeholder="e.g. 50% advance, balance before delivery" value={offerForm.paymentTerms} onChange={(e) => setOfferForm(v => ({ ...v, paymentTerms: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Notes</Label>
                      <Textarea value={offerForm.notes} onChange={(e) => setOfferForm(v => ({ ...v, notes: e.target.value }))} />
                    </div>
                    <Button type="submit" className="sm:col-span-2">Submit Offer</Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {(order.offers?.length ?? 0) > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Supplier Offers</h2>
                <div className="grid gap-4">
                  {order.offers?.map((offer) => (
                    <Card key={offer.id} className={order.recommendedOfferId === offer.id ? "border-primary" : ""}>
                      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold">{offer.supplierName}</div>
                          <div className="text-sm text-muted-foreground">
                            {offer.currency} {offer.unitPrice.toLocaleString()} / {order.unit} · {offer.availableQty.toLocaleString()} {order.unit} available · {offer.leadTime}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Delivery: {offer.deliveryCostMode.replace(/_/g, " ")} · {offer.incoterms.join(", ") || "Incoterms on request"}
                          </div>
                        </div>
                        {isLeadBuyer && (
                          <Button variant={order.recommendedOfferId === offer.id ? "secondary" : "outline"} onClick={() => handleRecommendOffer(offer.id)}>
                            {order.recommendedOfferId === offer.id ? "Recommended" : "Recommend Offer"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Participants */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Demand Summary</h2>
              <Card>
                <div className="divide-y">
                  {order.participants.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground">
                          {p.companyName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{p.companyName.substring(0, 3)}***{p.companyName.substring(p.companyName.length - 2)}</div>
                          <div className="text-xs text-muted-foreground">{p.deliveryDestination}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{p.quantity.toLocaleString()} {order.unit}</div>
                        <div className="text-xs text-muted-foreground">{new Date(p.joinedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                  {order.participants.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No participants yet. Be the first to join!
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-lg border-primary/20">
              <CardHeader className="bg-muted/30 border-b pb-6">
                <CardTitle>Join Collective Order</CardTitle>
                <CardDescription>Commit volume to unlock better pricing for everyone.</CardDescription>
              </CardHeader>
              <form onSubmit={handleJoin}>
                <CardContent className="p-6 space-y-6">
                  
                  <div className="bg-primary/5 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Unit Price</span>
                      <span className="font-bold">{currency} {order.currentPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Minimum Commitment</span>
                      <span className="font-medium">{order.moqPerParticipant} {order.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-primary/10 pt-2">
                      <span className="text-muted-foreground flex items-center gap-1">Est. Savings <HelpCircle className="w-3 h-3"/></span>
                      <span className="font-bold text-green-600">{currency} {order.estimatedSavingsPerTon}/ton</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="qty">Commitment Quantity ({order.unit})</Label>
                      <Input 
                        id="qty" 
                        type="number" 
                        min={order.moqPerParticipant} 
                        value={quantity || ''} 
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        required
                        className="text-lg font-medium"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="destination">Delivery Region</Label>
                      <Input 
                        id="destination" 
                        placeholder={`e.g. ${order.deliveryRegion}`}
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Order restricted to {order.deliveryRegion} region.</p>
                    </div>
                  </div>

                  {quantity > 0 && (
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">Estimated Total</span>
                        <span className="text-xl font-bold text-primary">{currency} {(quantity * order.currentPrice).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-right">Price may decrease if higher tiers are reached</p>
                    </div>
                  )}

                  <MotionCTAButton type="submit" className="w-full" disabled={joinMutation.isPending}>
                    {joinMutation.isPending ? "Processing..." : "Commit Volume"}
                  </MotionCTAButton>
                  
                  <div className="text-xs text-center text-muted-foreground">
                    No payment required until order closes. Subject to Chemidot Collective terms.
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
