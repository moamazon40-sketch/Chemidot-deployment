import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { useListOrders, useUpdateOrderStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Package, Search, Truck, CheckCircle2, Clock, ArrowRight,
  XCircle, Loader2, ShoppingBag,
} from "lucide-react";
import { statusColor, formatDate, formatCurrency } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const STATUS_STEPS = ["confirmed", "processing", "shipped", "delivered"];

const STATUS_META: Record<string, { label: string; icon: any; color: string }> = {
  pending:    { label: "Pending",    icon: Clock,        color: "bg-yellow-100 text-yellow-800" },
  confirmed:  { label: "Confirmed",  icon: CheckCircle2, color: "bg-blue-100 text-blue-800" },
  processing: { label: "Processing", icon: Loader2,      color: "bg-indigo-100 text-indigo-800" },
  shipped:    { label: "Shipped",    icon: Truck,        color: "bg-purple-100 text-purple-800" },
  delivered:  { label: "Delivered",  icon: CheckCircle2, color: "bg-green-100 text-green-800" },
  cancelled:  { label: "Cancelled",  icon: XCircle,      color: "bg-red-100 text-red-800" },
};

function OrderStatusTimeline({ status }: { status: string }) {
  const currentIdx = STATUS_STEPS.indexOf(status);
  if (status === "cancelled" || status === "pending") return null;

  return (
    <div className="flex items-center gap-0 w-full mt-3">
      {STATUS_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const meta = STATUS_META[step];
        const StepIcon = meta.icon;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center ${done ? "text-primary" : "text-muted-foreground/40"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                done ? "border-primary bg-primary/10" : "border-muted-foreground/20"
              }`}>
                <StepIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] mt-1 font-medium">{meta.label}</span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mt-[-14px] ${
                idx < currentIdx ? "bg-primary" : "bg-muted-foreground/15"
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function UpdateStatusDialog({ order, onUpdated }: {
  order: any;
  onUpdated: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const updateStatus = useUpdateOrderStatus();
  const [open, setOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || "");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");

  const isSupplier = user?.role === "supplier";
  const isBuyer = user?.role === "buyer";

  const NEXT_STATUS: Record<string, { label: string; role: string }> = {
    pending:    { label: "Confirm Order", role: "supplier" },
    confirmed:  { label: "Start Processing", role: "supplier" },
    processing: { label: "Mark as Shipped", role: "supplier" },
    shipped:    { label: "Confirm Delivery", role: "buyer" },
  };

  const next = NEXT_STATUS[order.status];
  if (!next) return null;
  if (next.role === "supplier" && !isSupplier) return null;
  if (next.role === "buyer" && !isBuyer) return null;

  const nextStatus = STATUS_STEPS[STATUS_STEPS.indexOf(order.status) + 1] || (order.status === "pending" ? "confirmed" : null);
  if (!nextStatus) return null;

  const needsTracking = order.status === "processing";

  const handleUpdate = () => {
    updateStatus.mutate({
      id: order.id,
      data: {
        status: nextStatus as any,
        trackingNumber: needsTracking && trackingNumber ? trackingNumber : undefined,
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : undefined,
      },
    }, {
      onSuccess: () => {
        toast({ title: `Order status updated to ${nextStatus}` });
        setOpen(false);
        onUpdated();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || "Failed to update status";
        toast({ title: msg, variant: "destructive" });
      },
    });
  };

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <ArrowRight className="w-3.5 h-3.5" /> {next.label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{next.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Update order #{order.id.toString().padStart(6, "0")} status to <strong>{nextStatus}</strong>.
            </p>
            {needsTracking && (
              <div className="space-y-1.5">
                <Label>Tracking Number</Label>
                <Input
                  placeholder="Enter tracking number"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                />
              </div>
            )}
            {(needsTracking || order.status === "confirmed") && (
              <div className="space-y-1.5">
                <Label>Estimated Delivery</Label>
                <Input
                  type="date"
                  value={estimatedDelivery}
                  onChange={e => setEstimatedDelivery(e.target.value)}
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={updateStatus.isPending}>
                {updateStatus.isPending ? "Updating…" : next.label}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useListOrders();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allOrders = data?.orders ?? [];
  const filtered = allOrders.filter(o => {
    if (statusFilter === "active" && ["delivered", "cancelled"].includes(o.status)) return false;
    if (statusFilter === "completed" && o.status !== "delivered") return false;
    if (statusFilter !== "all" && statusFilter !== "active" && statusFilter !== "completed") return true;
    if (searchTerm && !o.productName.toLowerCase().includes(searchTerm.toLowerCase())
      && !o.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
      && !o.id.toString().includes(searchTerm)) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">
              {user?.role === "supplier"
                ? "Manage and fulfill your customer orders."
                : "Track and manage your order history."}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex justify-between items-center">
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto overflow-x-auto">
                <TabsList className="bg-transparent p-0 border-b border-border/0 justify-start h-auto flex-nowrap">
                  <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none px-4 py-2">All Orders</TabsTrigger>
                  <TabsTrigger value="active" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none px-4 py-2">Active</TabsTrigger>
                  <TabsTrigger value="completed" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 border-primary rounded-none px-4 py-2">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-64 hidden md:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  className="pl-9 bg-muted/50 border-transparent h-9"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No orders found</h3>
                <p className="text-muted-foreground mt-1">
                  {user?.role === "supplier"
                    ? "You haven't received any orders yet."
                    : "You don't have any orders matching the current filter."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((order) => {
                  const meta = STATUS_META[order.status] ?? STATUS_META.pending;
                  const StatusIcon = meta.icon;
                  return (
                    <div key={order.id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-base">{order.productName}</span>
                            <Badge variant="outline" className={`border-transparent ${meta.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {meta.label}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground text-xs">Order ID</div>
                              <div className="font-mono">#{order.id.toString().padStart(6, '0')}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">{user?.role === 'buyer' ? 'Supplier' : 'Buyer'}</div>
                              <div className="truncate">{order.supplierName}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">Date</div>
                              <div>{formatDate(order.createdAt)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">Amount</div>
                              <div className="font-medium text-primary">{formatCurrency(order.totalPrice, order.currency)}</div>
                            </div>
                          </div>

                          <OrderStatusTimeline status={order.status} />
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                          {order.trackingNumber && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                              <Truck className="w-4 h-4" /> {order.trackingNumber}
                            </div>
                          )}
                          {order.estimatedDelivery && (
                            <div className="text-xs text-muted-foreground">
                              ETA: {formatDate(order.estimatedDelivery)}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <UpdateStatusDialog order={order} onUpdated={refetch} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
