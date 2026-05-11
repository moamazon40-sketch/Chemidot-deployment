import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { getPreferredDashboardMode, userCanSell } from "@/lib/account-capabilities";
import { useCreateCollectiveOrder, useListCollectiveOrders, useListCategories } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, ArrowRight, Plus, Package } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

function CreateCollectiveOrderDialog({ onCreated }: { onCreated: () => void }) {
  const createOrder = useCreateCollectiveOrder();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    targetQuantity: "", unit: "MT",
    moqPerParticipant: "10",
    basePrice: "",
    tier2Qty: "", tier2Discount: "",
    tier3Qty: "", tier3Discount: "",
    deadline: "",
    deliveryRegion: "Saudi Arabia",
  });


  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName || !form.targetQuantity || !form.deadline || !form.basePrice || !form.deliveryRegion) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    const tiers: any[] = [{ minQuantity: 1, maxQuantity: null, pricePerUnit: parseFloat(form.basePrice), discountPercent: 0 }];
    if (form.tier2Qty && form.tier2Discount) tiers.push({ minQuantity: parseFloat(form.tier2Qty), maxQuantity: null, pricePerUnit: parseFloat(form.basePrice) * (1 - parseFloat(form.tier2Discount) / 100), discountPercent: parseFloat(form.tier2Discount) });
    if (form.tier3Qty && form.tier3Discount) tiers.push({ minQuantity: parseFloat(form.tier3Qty), maxQuantity: null, pricePerUnit: parseFloat(form.basePrice) * (1 - parseFloat(form.tier3Discount) / 100), discountPercent: parseFloat(form.tier3Discount) });

    createOrder.mutate({
      data: {
        productName: form.productName,
        targetQuantity: parseFloat(form.targetQuantity),
        unit: form.unit,
        moqPerParticipant: parseFloat(form.moqPerParticipant),
        deadline: new Date(form.deadline).toISOString(),
        deliveryRegion: form.deliveryRegion,
        pricingTiers: tiers,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Collective order created!", description: "Buyers can now join your order." });
        setOpen(false);
        setForm({ productName: "", targetQuantity: "", unit: "MT", moqPerParticipant: "10", basePrice: "", tier2Qty: "", tier2Discount: "", tier3Qty: "", tier3Discount: "", deadline: "", deliveryRegion: "Saudi Arabia" });
        onCreated();
      },
      onError: () => toast({ title: "Failed to create collective order", variant: "destructive" }),
    });
  };

  const minDate = new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0];

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="w-4 h-4" /> Create Collective Order
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Collective Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Product Name <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Sodium Hydroxide, Ethanol" value={form.productName} onChange={f("productName")} required />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.unit} onChange={f("unit")}>
                  {["MT", "KG", "L", "TON", "Drums", "IBCs", "Units"].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Target Quantity <span className="text-red-500">*</span></Label>
                <Input type="number" min="1" step="0.01" placeholder="e.g. 500" value={form.targetQuantity} onChange={f("targetQuantity")} required />
              </div>
              <div className="space-y-1.5">
                <Label>Base Price/Unit (USD) <span className="text-red-500">*</span></Label>
                <Input type="number" min="0.01" step="0.01" placeholder="e.g. 420" value={form.basePrice} onChange={f("basePrice")} required />
              </div>
              <div className="space-y-1.5">
                <Label>MOQ per Participant <span className="text-red-500">*</span></Label>
                <Input type="number" min="1" step="0.01" placeholder="e.g. 10" value={form.moqPerParticipant} onChange={f("moqPerParticipant")} required />
              </div>
              <div className="space-y-1.5">
                <Label>Deadline <span className="text-red-500">*</span></Label>
                <Input type="date" min={minDate} value={form.deadline} onChange={f("deadline")} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Delivery Region <span className="text-red-500">*</span></Label>
                <Input placeholder="e.g. Saudi Arabia, GCC" value={form.deliveryRegion} onChange={f("deliveryRegion")} required />
              </div>
              <div className="col-span-2 border-t pt-3">
                <p className="text-sm font-medium mb-2">Volume Pricing Tiers (optional)</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Input type="number" placeholder="Tier 2 min qty" value={form.tier2Qty} onChange={f("tier2Qty")} />
                  <Input type="number" placeholder="Tier 2 discount %" value={form.tier2Discount} onChange={f("tier2Discount")} />
                  <Input type="number" placeholder="Tier 3 min qty" value={form.tier3Qty} onChange={f("tier3Qty")} />
                  <Input type="number" placeholder="Tier 3 discount %" value={form.tier3Discount} onChange={f("tier3Discount")} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createOrder.isPending}>
                {createOrder.isPending ? "Creating…" : "Create Order"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DashboardCollective() {
  const { user } = useAuth();
  const mode = getPreferredDashboardMode(user, window.location.search);
  const isSupplier = mode === "sell" && userCanSell(user);

  const { data, isLoading, refetch } = useListCollectiveOrders({ limit: 20 });
  const myOrders = (data?.collectiveOrders ?? []).filter((o: any) =>
    isSupplier
      ? o.supplierId != null  // supplier sees orders they created
      : o.participants?.some((p: any) => p.userId === user?.id) // buyer sees orders they joined
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "completed": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Collective Orders</h1>
            <p className="text-muted-foreground">
              {isSupplier ? "Manage your group buying listings." : "Track your group buying participation."}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/collective-orders">
              <Button variant="outline" className="gap-2">Browse Open Orders <ArrowRight className="w-4 h-4" /></Button>
            </Link>
            {isSupplier && <CreateCollectiveOrderDialog onCreated={refetch} />}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSupplier ? "My Collective Listings" : "My Participations"}</CardTitle>
            <CardDescription>
              {isSupplier ? "Collective orders you have created." : "Collective orders you have joined."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : myOrders.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">
                  {isSupplier ? "No collective orders created yet" : "No active participations"}
                </h3>
                <p className="text-muted-foreground mt-1 mb-4 max-w-md">
                  {isSupplier
                    ? "Create a collective order to let multiple buyers pool their purchases for better pricing."
                    : "You haven't joined any collective orders yet. Group buying allows you to access bulk pricing."}
                </p>
                {isSupplier
                  ? <CreateCollectiveOrderDialog onCreated={refetch} />
                  : <Link href="/collective-orders"><Button variant="outline" className="gap-2">Explore Collective Orders <ArrowRight className="w-4 h-4" /></Button></Link>
                }
              </div>
            ) : (
              <div className="divide-y">
                {myOrders.map((order: any) => (
                  <div key={order.id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{order.title}</span>
                        <Badge variant="outline" className={`border-transparent ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                        <span>{order.currentQuantity ?? 0} / {order.targetQuantity} {order.unit}</span>
                        <span>•</span>
                        <span>{order.currency} {order.pricePerUnit}/unit</span>
                        <span>•</span>
                        <span>{order.participantCount ?? 0} participants</span>
                        {order.deadline && (
                          <><span>•</span><span>Deadline: {new Date(order.deadline).toLocaleDateString()}</span></>
                        )}
                      </div>
                    </div>
                    <Link href={`/collective-orders/${order.id}`}>
                      <Button variant="secondary" size="sm">View Details</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
