import { MainLayout } from "@/components/layout/MainLayout";
import { Link } from "wouter";
import {
  useListCollectiveOrders,
  useJoinCollectiveOrder,
  getListCollectiveOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, Clock, TrendingDown, Package, MapPin,
  CheckCircle2, ArrowRight, ShieldCheck, Zap, BarChart3, Target, PlusCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { CreateCollectiveOrderDialog } from "@/components/CreateCollectiveOrderDialog";
import { MotionCTAButton } from "@/components/MotionCTAButton";

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Package,
    title: "Browse Open Orders",
    desc: "Find collective orders for chemicals you already buy, or browse for new sourcing opportunities across the marketplace.",
  },
  {
    step: "02",
    icon: Users,
    title: "Commit Your Quantity",
    desc: "Add the volume you need. Your commitment is pooled with other buyers. As the total grows, everyone unlocks lower pricing tiers together.",
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Pay Securely & Receive",
    desc: "Once the order deadline hits and the target is reached, Chemidot coordinates fulfillment. Secure escrow protects your payment until delivery.",
  },
];

const BENEFITS = [
  { icon: TrendingDown, label: "Bulk pricing for growing orders" },
  { icon: Users,        label: "Pool demand with verified buyers" },
  { icon: ShieldCheck,  label: "Escrow-protected payments" },
  { icon: Zap,          label: "No minimum quantity to join" },
  { icon: BarChart3,    label: "Transparent pricing tiers" },
  { icon: Clock,        label: "Defined delivery deadlines" },
];

interface QuickJoinDialogProps {
  order: {
    id: number;
    productName: string;
    supplierName: string;
    unit: string;
    moqPerParticipant: number;
    currentPrice: number;
    basePrice: number;
    estimatedDiscount: number;
    deliveryRegion: string;
    currentQuantity: number;
    targetQuantity: number;
    participantCount: number;
  };
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onJoined: (qty: number) => void;
}

function QuickJoinDialog({ order, open, onOpenChange, onJoined }: QuickJoinDialogProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const joinMutation = useJoinCollectiveOrder();
  const [quantity, setQuantity] = useState(order.moqPerParticipant || 1);
  const [destination, setDestination] = useState(order.deliveryRegion || "");

  const estimatedTotal = quantity * order.currentPrice;
  const progress = Math.min(100, ((order.currentQuantity + quantity) / order.targetQuantity) * 100);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) return;
    if (!user) {
      toast({ title: "Login required", description: "Please sign in to join a collective order." });
      onOpenChange(false);
      navigate("/auth/login");
      return;
    }
    joinMutation.mutate(
      { id: order.id, data: { quantity, deliveryDestination: destination } },
      {
        onSuccess: () => {
          toast({
            title: "You're in!",
            description: `Committed ${quantity.toLocaleString()} ${order.unit} to ${order.productName}.`,
          });
          onJoined(quantity);
          onOpenChange(false);
        },
        onError: () => {
          toast({ title: "Could not join order", description: "Please try again.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Join Collective Order</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {order.productName} · <span className="font-medium">{order.supplierName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleJoin} className="space-y-5 pt-2">
          {/* Pricing summary */}
          <div className="bg-muted/40 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground mb-0.5">Current Price</p>
              <p className="text-lg font-bold text-primary">
                {order.currentPrice.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">/{order.unit}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground mb-0.5">Your Saving</p>
              <p className="text-lg font-bold text-green-600">-{order.estimatedDiscount}%</p>
            </div>
            <div className="col-span-2 pt-1 border-t">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Order progress after joining</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="qty">
              Quantity ({order.unit})
              {order.moqPerParticipant > 0 && (
                <span className="text-muted-foreground font-normal ml-1 text-xs">
                  min. {order.moqPerParticipant.toLocaleString()}
                </span>
              )}
            </Label>
            <Input
              id="qty"
              type="number"
              min={order.moqPerParticipant || 1}
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(order.moqPerParticipant || 1, Number(e.target.value)))}
              required
              className="text-lg font-semibold"
            />
          </div>

          {/* Delivery */}
          <div className="space-y-1.5">
            <Label htmlFor="dest">Delivery Region</Label>
            <Input
              id="dest"
              placeholder={`e.g. ${order.deliveryRegion}`}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>

          {/* Estimated total */}
          {quantity > 0 && (
            <div className="flex items-center justify-between border rounded-lg px-4 py-3 bg-primary/5">
              <span className="text-sm font-medium">Estimated Total</span>
              <span className="text-xl font-bold text-primary">
                USD {estimatedTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={joinMutation.isPending}>
              {joinMutation.isPending ? "Joining…" : "Confirm Commitment"}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            No payment required until order closes. Subject to Chemidot Collective terms.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CollectiveOrders() {
  const queryClient = useQueryClient();
  const { data: collectiveOrdersData, isLoading } = useListCollectiveOrders({ status: "open" });

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, []);

  // Local optimistic overlay: map of orderId → { qty delta, participants delta }
  const [optimistic, setOptimistic] = useState<Record<number, { qty: number; participants: number }>>({});
  const [joinDialog, setJoinDialog] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleJoined = (orderId: number, qty: number) => {
    setOptimistic((prev) => ({
      ...prev,
      [orderId]: {
        qty: (prev[orderId]?.qty ?? 0) + qty,
        participants: (prev[orderId]?.participants ?? 0) + 1,
      },
    }));
    // Also invalidate so next fetch is fresh
    queryClient.invalidateQueries({ queryKey: getListCollectiveOrdersQueryKey({ status: "open" }) });
  };

  const activeOrder = collectiveOrdersData?.collectiveOrders.find((o) => o.id === joinDialog);

  return (
    <MainLayout>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-hero pt-32 pb-20">
        <div className="absolute inset-0 grid-pattern [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 md:px-10 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="space-y-7 animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
                <Users className="h-3.5 w-3.5 text-accent" /> Chemidot Collective
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-primary">
                We save more.<br />
                <span className="text-gradient">Together.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                Join forces with other industrial buyers to unlock bulk pricing tiers that were previously only
                available to large conglomerates. The more volume committed, the lower the price, for everyone.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#active-orders">
                  <MotionCTAButton>
                    Browse Open Orders <ArrowRight className="w-4 h-4" />
                  </MotionCTAButton>
                </a>
                <Button size="lg" variant="outline" className="px-8 text-base gap-2" onClick={() => setCreateDialogOpen(true)}>
                  <PlusCircle className="w-4 h-4" /> Create Collective Order
                </Button>
              </div>
            </div>

            {/* Live order preview card */}
            <div className="relative">
              <div className="rounded-3xl border border-transparent bg-gradient-navy p-7 space-y-5 shadow-card-premium">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-accent/40 bg-white/5 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">Ethylene Glycol, Industrial Grade</p>
                      <p className="text-xs text-white/50">Collective order target</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-accent">Bulk pricing</p>
                    <p className="text-xs text-green-400">Order active</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur space-y-2">
                  <div className="flex justify-between text-xs text-white/50">
                    <span>Committed volume</span><span>Progress</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-gradient-primary" />
                  </div>
                  <p className="text-xs text-white/40">More participation unlocks better pricing</p>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">Active</p>
                    <p className="text-[11px] text-white/50">Buyers</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-green-400">Lower</p>
                    <p className="text-[11px] text-white/50">Savings</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-accent">Open</p>
                    <p className="text-[11px] text-white/50">Window</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-extrabold">How Collective Orders work.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="bg-background border rounded-2xl p-7 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 mb-5">
                  <span className="text-5xl font-black text-primary/10">{s.step}</span>
                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits strip ── */}
      <section className="py-12 bg-muted/30 border-b">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.label} className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-semibold leading-snug">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Active Orders ── */}
      <section id="active-orders" className="py-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold">Active Opportunities</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {isLoading
                  ? "Loading…"
                  : `${collectiveOrdersData?.total || 0} open orders, join before the deadline`}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-[200px] w-full rounded-none" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : collectiveOrdersData?.collectiveOrders.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center bg-muted/30 rounded-xl border border-dashed">
              <Users className="w-14 h-14 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">No active collective orders</h3>
              <p className="text-muted-foreground max-w-md">
                Check back soon. New opportunities are posted weekly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collectiveOrdersData?.collectiveOrders.map((order) => {
                const opt = optimistic[order.id] ?? { qty: 0, participants: 0 };
                const displayQty = order.currentQuantity + opt.qty;
                const displayParticipants = order.participantCount + opt.participants;
                const progress = Math.min(100, (displayQty / order.targetQuantity) * 100);
                const hasJoined = opt.participants > 0;

                return (
                  <Card
                    key={order.id}
                    className="flex flex-col overflow-hidden transition-all hover:shadow-lg group"
                  >
                    {/* Product image / placeholder */}
                    <div className="relative aspect-video max-h-[180px] bg-muted overflow-hidden flex items-center justify-center">
                      {order.productImageUrl ? (
                        <img
                          src={order.productImageUrl}
                          alt={order.productName}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <Package className="w-12 h-12 text-muted-foreground/30" />
                      )}

                      {/* Deadline badge */}
                      <div className="absolute top-3 left-3 bg-background/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded-md shadow border border-border/50 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-orange-500" />
                        Closes {new Date(order.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>

                      {/* Discount badge */}
                      <div className="absolute top-3 right-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        -{order.estimatedDiscount}%
                      </div>

                      {/* Joined overlay */}
                      {hasJoined && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <div className="bg-background/90 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-semibold text-primary shadow">
                            <CheckCircle2 className="w-4 h-4" /> Joined
                          </div>
                        </div>
                      )}
                    </div>

                    <CardHeader className="p-5 pb-3">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <div className="text-sm font-medium text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" /> {order.deliveryRegion}
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900 shrink-0"
                        >
                          {order.currentTier}
                        </Badge>
                      </div>
                      <Link href={`/collective-orders/${order.id}`}>
                        <h3 className="font-bold text-lg line-clamp-1 hover:text-primary transition-colors">
                          {order.productName}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">by {order.supplierName}</p>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 flex-1 space-y-4">
                      {/* Price row */}
                      <div className="grid grid-cols-2 gap-4 border-y py-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1 line-through">
                            Base: {order.basePrice.toLocaleString()}
                          </div>
                          <div className="font-bold text-primary text-xl flex items-baseline gap-1">
                            {order.currentPrice.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground">/{order.unit}</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center items-end text-right gap-1">
                          <div className="text-xs font-medium text-muted-foreground">Better pricing available</div>
                          {order.nextTierQuantity && (
                            <div className="text-xs text-orange-600 font-medium flex items-center gap-1">
                              <Target className="w-3 h-3" />
                              Next tier soon
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold">
                            {displayQty.toLocaleString()} {order.unit}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            of {order.targetQuantity.toLocaleString()} target
                          </span>
                        </div>
                        <Progress value={progress} className="h-2.5" />
                        <div className="flex justify-between items-center pt-0.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {displayParticipants} {displayParticipants === 1 ? "buyer" : "buyers"} joined
                          </div>
                          <span className="font-medium text-primary">{Math.round(progress)}%</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="p-5 pt-0 gap-2">
                      {hasJoined ? (
                        <Link href={`/collective-orders/${order.id}`} className="w-full">
                          <Button variant="outline" className="w-full gap-2 font-semibold">
                            <CheckCircle2 className="w-4 h-4 text-primary" /> View Details
                          </Button>
                        </Link>
                      ) : (
                        <>
                          <Button
                            className="flex-1 font-semibold"
                            onClick={() => setJoinDialog(order.id)}
                          >
                            Join Order
                          </Button>
                          <Link href={`/collective-orders/${order.id}`}>
                            <Button variant="outline" size="icon" title="View full details">
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {/* For suppliers CTA */}
          <div className="mt-16 bg-muted/30 border rounded-2xl p-8 md:p-12 text-center space-y-5 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold">Are you a supplier?</h3>
            <p className="text-muted-foreground">
              List your products as eligible for Collective Orders and access high-volume buyers you'd never
              reach individually.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/for-suppliers">
                <Button size="lg" variant="outline" className="px-8">
                  Learn More
                </Button>
              </Link>
              <MotionCTAButton href="/auth/register">
                Join as a Supplier <ArrowRight className="w-4 h-4" />
              </MotionCTAButton>
            </div>
          </div>
        </div>
      </section>

      {/* Quick-join dialog */}
      {joinDialog !== null && activeOrder && (
        <QuickJoinDialog
          order={activeOrder}
          open={joinDialog !== null}
          onOpenChange={(v) => !v && setJoinDialog(null)}
          onJoined={(qty) => {
            handleJoined(joinDialog!, qty);
            setJoinDialog(null);
          }}
        />
      )}
      <CreateCollectiveOrderDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </MainLayout>
  );
}
