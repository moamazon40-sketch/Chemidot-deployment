import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCreateCollectiveOrder, getListCollectiveOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, CheckCircle2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const UNITS = ["MT", "KG", "L", "TON", "Drums", "IBCs", "Units"];

export function CreateCollectiveOrderDialog({ open, onOpenChange }: Props) {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const createOrder = useCreateCollectiveOrder();

  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    targetQuantity: "",
    unit: "MT",
    basePrice: "",
    moqPerParticipant: "10",
    tier2Qty: "",
    tier2Discount: "",
    tier3Qty: "",
    tier3Discount: "",
    deadline: "",
    deliveryRegion: "Saudi Arabia",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const minDate = new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;
    if (!user) {
      toast({ title: "Login required", description: "Please sign in to create a collective order." });
      onOpenChange(false);
      navigate("/auth/login");
      return;
    }
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
        setSuccess(true);
        queryClient.invalidateQueries({ queryKey: getListCollectiveOrdersQueryKey({ status: "open" }) });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || "Could not create the collective order. Make sure your account can buy.";
        toast({ title: "Failed to create order", description: msg, variant: "destructive" });
      },
    });
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setSuccess(false);
      setForm({ productName: "", targetQuantity: "", unit: "MT", basePrice: "", moqPerParticipant: "10", tier2Qty: "", tier2Discount: "", tier3Qty: "", tier3Discount: "", deadline: "", deliveryRegion: "Saudi Arabia" });
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">Create Collective Order</DialogTitle>
          </div>
          <DialogDescription>
            Launch a collaborative purchasing campaign and allow multiple buyers to join together for better pricing.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <h3 className="text-lg font-bold">Collective order created!</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Your campaign is now live. Other buyers can start joining and committing their volume.
            </p>
            <Button className="mt-2" onClick={() => { handleClose(false); navigate("/collective-orders"); setTimeout(() => document.getElementById("active-orders")?.scrollIntoView({ behavior: "smooth" }), 300); }}>View Active Opportunities</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Product Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Sodium Hydroxide, Ethanol" value={form.productName} onChange={set("productName")} required />
              </div>

              <div className="space-y-1.5">
                <Label>Unit</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.unit} onChange={set("unit")}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Target Quantity <span className="text-destructive">*</span></Label>
                <Input type="number" min="1" step="0.01" placeholder="e.g. 500" value={form.targetQuantity} onChange={set("targetQuantity")} required />
              </div>

              <div className="space-y-1.5">
                <Label>Base Price/Unit (USD) <span className="text-destructive">*</span></Label>
                <Input type="number" min="0.01" step="0.01" placeholder="e.g. 420" value={form.basePrice} onChange={set("basePrice")} required />
              </div>

              <div className="space-y-1.5">
                <Label>MOQ per Participant <span className="text-destructive">*</span></Label>
                <Input type="number" min="1" step="0.01" placeholder="e.g. 10" value={form.moqPerParticipant} onChange={set("moqPerParticipant")} required />
              </div>

              <div className="space-y-1.5">
                <Label>Deadline <span className="text-destructive">*</span></Label>
                <Input type="date" min={minDate} value={form.deadline} onChange={set("deadline")} required />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Delivery Region <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Saudi Arabia, GCC" value={form.deliveryRegion} onChange={set("deliveryRegion")} required />
              </div>

              <div className="col-span-2 border-t pt-3">
                <p className="text-sm font-medium mb-2">Volume Pricing Tiers (optional)</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Input type="number" placeholder="Tier 2 min qty" value={form.tier2Qty} onChange={set("tier2Qty")} />
                  <Input type="number" placeholder="Tier 2 discount %" value={form.tier2Discount} onChange={set("tier2Discount")} />
                  <Input type="number" placeholder="Tier 3 min qty" value={form.tier3Qty} onChange={set("tier3Qty")} />
                  <Input type="number" placeholder="Tier 3 discount %" value={form.tier3Discount} onChange={set("tier3Discount")} />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => handleClose(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={createOrder.isPending}>
                {createOrder.isPending ? "Creating…" : "Launch Collective Order"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
