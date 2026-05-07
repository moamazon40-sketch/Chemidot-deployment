import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { useListRfqs, useCreateRfq, useUpdateRfq, useDeleteRfq, useListCategories, getListRfqsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Plus, Clock, CheckCircle2, Award,
  MapPin, Package, ChevronRight, Users, Pencil, Trash2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link, useSearch } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:  { label: "Active",   color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",    icon: Clock },
  pending: { label: "Pending",  color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
  awarded: { label: "Awarded",  color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",  icon: Award },
  closed:  { label: "Closed",   color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",         icon: CheckCircle2 },
};

function CreateRfqDialog({ onCreated, defaultProduct = "", defaultQty = "" }: {
  onCreated: () => void;
  defaultProduct?: string;
  defaultQty?: string;
}) {
  const { data: categories } = useListCategories();
  const createRfq = useCreateRfq();
  const { toast } = useToast();
  const [open, setOpen] = useState(!!defaultProduct);
  const [form, setForm] = useState({
    productName: defaultProduct,
    casNumber: "",
    quantity: defaultQty,
    unit: "MT",
    deliveryDestination: "",
    deliveryDeadline: "",
    description: "",
    specifications: "",
    categoryId: "",
  });

  // Sync if defaultProduct changes (e.g. first render)
  useEffect(() => {
    if (defaultProduct) {
      setForm(p => ({ ...p, productName: defaultProduct, quantity: defaultQty || p.quantity }));
      setOpen(true);
    }
  }, [defaultProduct, defaultQty]);

  const f = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName || !form.quantity || !form.deliveryDestination || !form.deliveryDeadline) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createRfq.mutate({
      data: {
        productName: form.productName,
        casNumber: form.casNumber || undefined,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        deliveryDestination: form.deliveryDestination,
        deliveryDeadline: new Date(form.deliveryDeadline).toISOString(),
        description: form.description || undefined,
        specifications: form.specifications || undefined,
        categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
      },
    }, {
      onSuccess: () => {
        toast({ title: "RFQ submitted!", description: "Matched suppliers will be notified." });
        setOpen(false);
        setForm({ productName: "", casNumber: "", quantity: "", unit: "MT", deliveryDestination: "", deliveryDeadline: "", description: "", specifications: "", categoryId: "" });
        onCreated();
      },
      onError: () => toast({ title: "Failed to create RFQ", variant: "destructive" }),
    });
  };

  const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shrink-0 gap-2"><Plus className="w-4 h-4" /> Create RFQ</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request for Quotation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Product / Chemical Name <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Sodium Hydroxide" value={form.productName} onChange={f("productName")} required />
            </div>
            <div className="space-y-1.5">
              <Label>CAS Number</Label>
              <Input placeholder="e.g. 1310-73-2" value={form.casNumber} onChange={f("casNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.categoryId} onChange={f("categoryId")}>
                <option value="">Select category</option>
                {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity <span className="text-red-500">*</span></Label>
              <Input type="number" min="0.01" step="0.01" placeholder="e.g. 50" value={form.quantity} onChange={f("quantity")} required />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.unit} onChange={f("unit")}>
                {["MT", "KG", "L", "TON", "Drums", "IBCs", "Units"].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Delivery Destination <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. Riyadh, Saudi Arabia" value={form.deliveryDestination} onChange={f("deliveryDestination")} required />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Required By <span className="text-red-500">*</span></Label>
              <Input type="date" min={minDate} value={form.deliveryDeadline} onChange={f("deliveryDeadline")} required />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Technical Specifications</Label>
              <Input placeholder="e.g. Purity ≥ 99%, food grade" value={form.specifications} onChange={f("specifications")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Additional Notes</Label>
              <Textarea rows={3} placeholder="Any other requirements or notes for suppliers..." value={form.description} onChange={f("description")} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createRfq.isPending}>
              {createRfq.isPending ? "Submitting…" : "Submit RFQ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRfqDialog({ rfq, open, onOpenChange, onUpdated }: {
  rfq: { id: number; productName: string; quantity: number; unit: string; deliveryDestination: string; deliveryDeadline: string; status: string };
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}) {
  const { data: categories } = useListCategories();
  const updateRfq = useUpdateRfq();
  const { toast } = useToast();
  const [form, setForm] = useState({
    productName: rfq.productName,
    quantity: String(rfq.quantity),
    unit: rfq.unit,
    deliveryDestination: rfq.deliveryDestination,
    deliveryDeadline: rfq.deliveryDeadline ? new Date(rfq.deliveryDeadline).toISOString().split("T")[0] : "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        productName: rfq.productName,
        quantity: String(rfq.quantity),
        unit: rfq.unit,
        deliveryDestination: rfq.deliveryDestination,
        deliveryDeadline: rfq.deliveryDeadline ? new Date(rfq.deliveryDeadline).toISOString().split("T")[0] : "",
      });
    }
  }, [open, rfq]);

  const f = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productName || !form.quantity || !form.deliveryDestination || !form.deliveryDeadline) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    updateRfq.mutate({
      id: rfq.id,
      data: {
        productName: form.productName,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        deliveryDestination: form.deliveryDestination,
        deliveryDeadline: new Date(form.deliveryDeadline).toISOString(),
      },
    }, {
      onSuccess: () => {
        toast({ title: "RFQ updated successfully" });
        onOpenChange(false);
        onUpdated();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || "Failed to update RFQ";
        toast({ title: msg, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit RFQ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Product / Chemical Name <span className="text-red-500">*</span></Label>
              <Input value={form.productName} onChange={f("productName")} required />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity <span className="text-red-500">*</span></Label>
              <Input type="number" min="0.01" step="0.01" value={form.quantity} onChange={f("quantity")} required />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.unit} onChange={f("unit")}>
                {["MT", "KG", "L", "TON", "Drums", "IBCs", "Units"].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Delivery Destination <span className="text-red-500">*</span></Label>
              <Input value={form.deliveryDestination} onChange={f("deliveryDestination")} required />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Required By <span className="text-red-500">*</span></Label>
              <Input type="date" value={form.deliveryDeadline} onChange={f("deliveryDeadline")} required />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateRfq.isPending}>
              {updateRfq.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRfqDialog({ rfq, open, onOpenChange, onDeleted }: {
  rfq: { id: number; productName: string; status: string };
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const deleteRfq = useDeleteRfq();
  const { toast } = useToast();

  const handleDelete = () => {
    deleteRfq.mutate({ id: rfq.id }, {
      onSuccess: () => {
        toast({ title: "RFQ deleted" });
        onOpenChange(false);
        onDeleted();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || "Failed to delete RFQ";
        toast({ title: msg, variant: "destructive" });
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete RFQ</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the RFQ for "{rfq.productName}"? This action cannot be undone and will also remove any associated quotations.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleteRfq.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function Rfqs() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const search = useSearch();
  const qc = useQueryClient();
  const [editingRfq, setEditingRfq] = useState<any>(null);
  const [deletingRfq, setDeletingRfq] = useState<any>(null);

  // Read pre-fill params from ProductDetail navigation
  const params = new URLSearchParams(search);
  const prefillProduct = params.get("product") || "";
  const prefillQty = params.get("qty") || "";

  const { data, isLoading, refetch } = useListRfqs({
    status: statusFilter === "all" ? undefined : (statusFilter as any),
  });

  const filtered = data?.rfqs ?? [];

  const statusCounts = (data?.rfqs ?? []).reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Requests for Quotation</h1>
            <p className="text-muted-foreground">
              {user?.role === "buyer"
                ? "Track your sourcing requests and compare supplier quotes."
                : "Review incoming RFQs and submit competitive quotes."}
            </p>
          </div>
          {user?.role === "buyer" && (
            <CreateRfqDialog
              onCreated={() => refetch()}
              defaultProduct={prefillProduct}
              defaultQty={prefillQty}
            />
          )}
        </div>

        {/* Summary pills */}
        {!isLoading && (data?.total ?? 0) > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["active", "pending", "awarded", "closed"] as const).map(s => {
              const meta = STATUS_META[s];
              const Icon = meta.icon;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-xl border p-3 text-left hover:shadow-sm transition-all ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">{meta.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{statusCounts[s] ?? 0}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="bg-transparent p-0 h-auto gap-1">
                {["all", "active", "pending", "awarded", "closed"].map(s => (
                  <TabsTrigger
                    key={s}
                    value={s}
                    className="data-[state=active]:bg-muted data-[state=active]:shadow-none rounded-md px-3 py-1.5 capitalize text-sm"
                  >
                    {s === "all" ? "All" : s}
                    {s !== "all" && statusCounts[s] ? (
                      <span className="ml-1.5 bg-muted-foreground/15 text-muted-foreground rounded-full px-1.5 py-0.5 text-[11px] font-medium">
                        {statusCounts[s]}
                      </span>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No RFQs found</h3>
                <p className="text-muted-foreground mt-1 mb-4 text-sm">
                  {user?.role === "buyer"
                    ? "You haven't created any requests yet."
                    : "No RFQs available to quote on right now."}
                </p>
                {user?.role === "buyer" && (
                  <CreateRfqDialog onCreated={() => refetch()} defaultProduct={prefillProduct} defaultQty={prefillQty} />
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(rfq => {
                  const meta = STATUS_META[rfq.status] ?? STATUS_META.active;
                  const StatusIcon = meta.icon;
                  const quoteProgress = Math.min(100, (rfq.quotationCount / 5) * 100);
                  const canEdit = user?.role === "buyer" && rfq.status !== "awarded" && rfq.status !== "closed";
                  const canDelete = user?.role === "buyer" && rfq.status !== "awarded";
                  return (
                    <div key={rfq.id} className="p-5 hover:bg-muted/30 transition-colors group">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <Link href={`/dashboard/rfqs/${rfq.id}`} className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-base truncate">{rfq.productName}</span>
                              <Badge variant="outline" className={`border-transparent text-xs shrink-0 ${meta.color}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {meta.label}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-mono text-xs">#{rfq.id.toString().padStart(5, "0")}</span>
                              <span className="flex items-center gap-1">
                                <Package className="w-3 h-3" /> {rfq.quantity} {rfq.unit}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {rfq.deliveryDestination}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Due {new Date(rfq.deliveryDeadline).toLocaleDateString()}
                              </span>
                              {rfq.buyerCompanyName && user?.role !== "buyer" && (
                                <span>{rfq.buyerCompanyName}</span>
                              )}
                            </div>
                          </div>
                        </Link>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right mr-2">
                            <div className="flex items-center gap-1.5 justify-end mb-1">
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-semibold text-sm">{rfq.quotationCount}</span>
                              <span className="text-xs text-muted-foreground">quotes</span>
                            </div>
                            <Progress value={quoteProgress} className="h-1.5 w-20" />
                          </div>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={(e) => { e.preventDefault(); setEditingRfq(rfq); }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.preventDefault(); setDeletingRfq(rfq); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Link href={`/dashboard/rfqs/${rfq.id}`}>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </Link>
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

      {editingRfq && (
        <EditRfqDialog rfq={editingRfq} open={!!editingRfq} onOpenChange={(v) => { if (!v) setEditingRfq(null); }} onUpdated={() => { setEditingRfq(null); refetch(); }} />
      )}
      {deletingRfq && (
        <DeleteRfqDialog rfq={deletingRfq} open={!!deletingRfq} onOpenChange={(v) => { if (!v) setDeletingRfq(null); }} onDeleted={() => { setDeletingRfq(null); refetch(); }} />
      )}
    </DashboardLayout>
  );
}
