import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRoute, useLocation } from "wouter";
import {
  useGetRfq,
  useListRfqQuotations,
  useSubmitQuotation,
  useListNegotiationMessages,
  useSendNegotiationMessage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, ShieldCheck, Clock, CheckCircle2, FileText,
  Package, MapPin, Calendar, Building2, DollarSign, Send, Star,
  XCircle, MessageSquare, ArrowUpDown, TrendingDown,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getStoredToken, useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  active:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  awarded: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed:  "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

const QUOT_STATUS_COLORS: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired:  "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

function SubmitQuoteDialog({ rfqId, rfqQuantity, onSubmitted }: {
  rfqId: number;
  rfqQuantity: number;
  onSubmitted: () => void;
}) {
  const { toast } = useToast();
  const submitQuotation = useSubmitQuotation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    pricePerUnit: "",
    currency: "USD",
    deliveryTime: "",
    notes: "",
    validUntil: "",
  });

  const f = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const total = form.pricePerUnit ? parseFloat(form.pricePerUnit) * rfqQuantity : 0;
  const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pricePerUnit || !form.deliveryTime) {
      toast({ title: "Fill in required fields", variant: "destructive" });
      return;
    }
    submitQuotation.mutate({
      id: rfqId,
      data: {
        pricePerUnit: parseFloat(form.pricePerUnit),
        currency: form.currency,
        deliveryTime: form.deliveryTime,
        notes: form.notes || undefined,
        validUntil: form.validUntil
          ? new Date(form.validUntil).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString(),
      },
    }, {
      onSuccess: () => {
        toast({ title: "Quote submitted!", description: "The buyer will be notified." });
        setOpen(false);
        setForm({ pricePerUnit: "", currency: "USD", deliveryTime: "", notes: "", validUntil: "" });
        onSubmitted();
      },
      onError: () => toast({ title: "Failed to submit quote", variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Send className="w-4 h-4" /> Submit Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Your Quotation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Price per Unit <span className="text-red-500">*</span></Label>
              <Input
                type="number" min="0.01" step="0.01"
                placeholder="e.g. 420"
                value={form.pricePerUnit} onChange={f("pricePerUnit")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.currency} onChange={f("currency")}>
                {["USD", "SAR", "EUR", "AED"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Lead Time <span className="text-red-500">*</span></Label>
              <Input placeholder="e.g. 14–21 days" value={form.deliveryTime} onChange={f("deliveryTime")} required />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Quote Valid Until</Label>
              <Input type="date" min={minDate} value={form.validUntil} onChange={f("validUntil")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes to Buyer</Label>
              <Textarea rows={3} placeholder="Purity, packaging, certifications, payment terms…" value={form.notes} onChange={f("notes")} />
            </div>
          </div>

          {total > 0 && (
            <div className="bg-primary/5 rounded-lg p-3 flex justify-between items-center text-sm border">
              <span className="text-muted-foreground">Estimated Total ({rfqQuantity.toLocaleString()} units)</span>
              <span className="font-bold text-primary text-base">
                {form.currency} {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitQuotation.isPending}>
              {submitQuotation.isPending ? "Submitting…" : "Send Quote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NegotiationThread({ rfqId, quotationId, quotationStatus }: {
  rfqId: number;
  quotationId: number;
  quotationStatus: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: messages, refetch } = useListNegotiationMessages(rfqId, quotationId, { query: { enabled: true } as any });
  const sendMessage = useSendNegotiationMessage();
  const [expanded, setExpanded] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [isCounterOffer, setIsCounterOffer] = useState(false);
  const [proposedPrice, setProposedPrice] = useState("");
  const [proposedDelivery, setProposedDelivery] = useState("");

  const canNegotiate = quotationStatus === "pending";
  const allMessages = messages ?? [];

  const handleSend = () => {
    if (!msgText.trim()) return;
    sendMessage.mutate({
      id: rfqId,
      qid: quotationId,
      data: {
        type: isCounterOffer ? "counter_offer" : "message",
        content: msgText,
        proposedPrice: isCounterOffer && proposedPrice ? parseFloat(proposedPrice) : undefined,
        proposedDeliveryTime: isCounterOffer && proposedDelivery ? proposedDelivery : undefined,
      },
    }, {
      onSuccess: () => {
        setMsgText("");
        setProposedPrice("");
        setProposedDelivery("");
        setIsCounterOffer(false);
        refetch();
      },
      onError: () => toast({ title: "Failed to send", variant: "destructive" }),
    });
  };

  return (
    <div className="mt-3 border-t pt-3">
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Negotiation ({allMessages.length} messages)
        <ArrowUpDown className="w-3 h-3" />
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {allMessages.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No messages yet. Start the negotiation.</p>
          )}

          <div className="max-h-60 overflow-y-auto space-y-2">
            {allMessages.map((m: any) => (
              <div
                key={m.id}
                className={`rounded-lg p-2.5 text-sm ${
                  m.senderId === user?.id
                    ? "bg-primary/10 ml-6"
                    : "bg-muted mr-6"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-medium text-xs">{m.senderName}</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {m.senderRole}
                  </Badge>
                  {m.type === "counter_offer" && (
                    <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1 py-0 h-4 border-none">
                      <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> Counter Offer
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{m.content}</p>
                {m.proposedPrice && (
                  <div className="mt-1.5 bg-background/60 rounded p-2 text-xs flex gap-4">
                    <span>Proposed price: <strong>${m.proposedPrice.toLocaleString()}/unit</strong></span>
                    {m.proposedDeliveryTime && <span>Delivery: <strong>{m.proposedDeliveryTime}</strong></span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {canNegotiate && (
            <div className="space-y-2 border-t pt-2">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCounterOffer}
                    onChange={e => setIsCounterOffer(e.target.checked)}
                    className="rounded"
                  />
                  Counter offer
                </label>
              </div>
              {isCounterOffer && (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number" min="0.01" step="0.01"
                    placeholder="Price/unit"
                    value={proposedPrice}
                    onChange={e => setProposedPrice(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Lead time"
                    value={proposedDelivery}
                    onChange={e => setProposedDelivery(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  placeholder="Write a message…"
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  className="text-sm flex-1"
                />
                <Button
                  size="sm"
                  className="self-end"
                  onClick={handleSend}
                  disabled={sendMessage.isPending || !msgText.trim()}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RfqDetail() {
  const [, params] = useRoute("/dashboard/rfqs/:id");
  const id = Number(params?.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [rejectingQid, setRejectingQid] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"price" | "time" | "date">("price");

  const { data: rfq, isLoading, refetch } = useGetRfq(id, { query: { enabled: !!id } as any });
  const { data: quotations, isLoading: quotLoading, refetch: refetchQuotations } = useListRfqQuotations(id, { query: { enabled: !!id } as any });

  useEffect(() => {
    if (!user || !id) return;
    fetch("/api/notifications/read-related", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getStoredToken() ?? ""}`,
      },
      body: JSON.stringify({ relatedType: "rfq" }),
    }).finally(() => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
    });
  }, [id, qc, user]);

  const handleAccept = async (quotationId: number, supplierName: string) => {
    try {
      const token = localStorage.getItem("chemidot_token");
      const res = await fetch(`/api/rfqs/${id}/quotations/${quotationId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Quotation accepted!", description: `Order created with ${supplierName}` });
      navigate("/dashboard/orders");
    } catch {
      toast({ title: "Error", description: "Could not accept quotation", variant: "destructive" });
    }
  };

  const handleReject = async (quotationId: number) => {
    try {
      const token = localStorage.getItem("chemidot_token");
      const res = await fetch(`/api/rfqs/${id}/quotations/${quotationId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Quotation rejected" });
      setRejectingQid(null);
      refetch();
      refetchQuotations();
    } catch {
      toast({ title: "Error", description: "Could not reject quotation", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-4xl">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!rfq) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold">RFQ not found</h2>
          <Link href="/dashboard/rfqs">
            <Button className="mt-4" variant="outline">Back to RFQs</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const allQuotations = (quotations ?? rfq.quotations ?? []) as any[];

  const sortedQuotations = [...allQuotations].sort((a, b) => {
    if (sortBy === "price") return a.pricePerUnit - b.pricePerUnit;
    if (sortBy === "time") return (a.deliveryTime || "").localeCompare(b.deliveryTime || "");
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const bestQuote = allQuotations.length > 0
    ? allQuotations.reduce((a, b) => a.pricePerUnit < b.pricePerUnit ? a : b)
    : null;
    
  // Enhanced comparison metrics
  const getComparisonScore = (quote: any) => {
    const priceScore = bestQuote ? Math.min(100, (bestQuote.pricePerUnit / quote.pricePerUnit) * 100) : 100;
    const timeScore = quote.deliveryTime ? Math.max(0, 30 - parseInt(quote.deliveryTime.replace(/\D+/g, ''))) : 50;
    const statusScore = quote.status === 'pending' ? 100 : quote.status === 'accepted' ? 50 : 0;
    return Math.round((priceScore + timeScore + statusScore) / 3);
  };

  const pendingQuotes = allQuotations.filter((q: any) => q.status === "pending");

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/rfqs">
            <Button variant="ghost" size="icon" className="rounded-full mt-0.5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{rfq.productName}</h1>
              <Badge className={`border-transparent ${STATUS_COLORS[rfq.status] ?? ""}`}>
                {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              RFQ #{rfq.id.toString().padStart(5, "0")}
              {rfq.buyerCompanyName && ` · ${rfq.buyerCompanyName}`}
            </p>
          </div>
          {user?.role === "supplier" && rfq.status === "active" && (
            <SubmitQuoteDialog
              rfqId={id}
              rfqQuantity={rfq.quantity}
              onSubmitted={() => { refetch(); refetchQuotations(); }}
            />
          )}
        </div>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Package,   label: "Product / Chemical",   value: rfq.productName },
                { icon: FileText,  label: "CAS Number",           value: (rfq as any).casNumber || "-" },
                { icon: Package,   label: "Quantity Required",     value: `${rfq.quantity.toLocaleString()} ${rfq.unit}` },
                { icon: MapPin,    label: "Delivery Destination",  value: rfq.deliveryDestination },
                { icon: Calendar,  label: "Delivery Deadline",     value: new Date(rfq.deliveryDeadline).toLocaleDateString() },
                { icon: Building2, label: "Buyer Company",         value: rfq.buyerCompanyName || "-" },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="font-medium text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {(rfq as any).specifications && (
              <div className="mt-5 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-1">Technical Specifications</p>
                <p className="text-sm font-mono bg-muted/50 rounded-md px-3 py-2">{(rfq as any).specifications}</p>
              </div>
            )}
            {(rfq as any).description && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Additional Notes</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{(rfq as any).description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {bestQuote && user?.role === "buyer" && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-0.5">Best Quote Available</p>
              <p className="font-bold text-green-800 dark:text-green-300">
                {bestQuote.currency} {bestQuote.pricePerUnit.toLocaleString()} / {rfq.unit}
                <span className="font-normal text-sm ml-2 text-green-700 dark:text-green-400">
                  from {bestQuote.supplierName}
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-700 dark:text-green-400">Total</p>
              <p className="font-bold text-green-800 dark:text-green-300">
                {bestQuote.currency} {(bestQuote.pricePerUnit * rfq.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        )}

        {user?.role === "buyer" && pendingQuotes.length >= 2 && (
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4" /> Quote Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Supplier</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Price/Unit</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Lead Time</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Valid Until</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground">Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingQuotes
                    .sort((a: any, b: any) => a.pricePerUnit - b.pricePerUnit)
                    .map((q: any, idx: number) => {
                      const isBest = idx === 0;
                      return (
                        <tr key={q.id} className={`border-b last:border-0 ${isBest ? "bg-green-50/50 dark:bg-green-950/10" : ""}`}>
                          <td className="py-2.5 px-3 font-medium">
                            {q.supplierName}
                            {isBest && <Badge className="ml-2 bg-green-100 text-green-800 text-[10px] border-none">Best</Badge>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-primary">
                            {q.currency} {q.pricePerUnit.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">
                            {q.currency} {(q.pricePerUnit * rfq.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-2.5 px-3">{q.deliveryTime}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {q.supplierVerified
                              ? <ShieldCheck className="w-4 h-4 text-blue-500 mx-auto" />
                              : <span className="text-muted-foreground">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              Received Quotations
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({allQuotations.length} received)
              </span>
            </h2>
            {allQuotations.length > 1 && (
              <div className="flex items-center gap-1.5 text-sm">
                <span className="text-muted-foreground text-xs">Sort:</span>
                {(["price", "time", "date"] as const).map(s => (
                  <button
                    key={s}
                    className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${
                      sortBy === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => setSortBy(s)}
                  >
                    {s === "time" ? "Lead Time" : s === "date" ? "Newest" : "Price"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {quotLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : allQuotations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No quotations received yet</p>
                <p className="text-sm mt-1">
                  {user?.role === "buyer"
                    ? "Suppliers will respond to your request shortly."
                    : "Be the first to submit a competitive quote."}
                </p>
                {user?.role === "supplier" && rfq.status === "active" && (
                  <div className="mt-4">
                    <SubmitQuoteDialog
                      rfqId={id}
                      rfqQuantity={rfq.quantity}
                      onSubmitted={() => { refetch(); refetchQuotations(); }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedQuotations.map((q: any) => {
                const isBest = bestQuote?.id === q.id && allQuotations.length > 1;
                return (
                  <Card
                    key={q.id}
                    className={`transition-all ${
                      q.status === "accepted"
                        ? "border-green-500 bg-green-50/30 dark:bg-green-950/10"
                        : q.status === "rejected"
                        ? "border-red-200 bg-red-50/20 dark:bg-red-950/10 opacity-60"
                        : isBest
                        ? "border-primary/40 bg-primary/5"
                        : ""
                    }`}
                  >
                    <CardContent className="pt-4 pb-4">
                      {isBest && q.status === "pending" && (
                        <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mb-3">
                          <Star className="w-3.5 h-3.5" /> Best Price
                        </div>
                      )}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Supplier</p>
                            <div className="flex items-center gap-1 font-medium">
                              {q.supplierName}
                              {q.supplierVerified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Unit Price</p>
                            <p className="font-bold text-primary text-base">{q.currency} {q.pricePerUnit.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Total ({rfq.quantity.toLocaleString()} {rfq.unit})</p>
                            <p className="font-semibold">{q.currency} {(q.pricePerUnit * rfq.quantity).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-0.5">Lead Time</p>
                            <p className="font-medium">{q.deliveryTime}</p>
                          </div>
                          {q.notes && (
                            <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t">
                              <p className="text-muted-foreground text-xs mb-0.5">Supplier Notes</p>
                              <p className="text-sm italic text-muted-foreground">{q.notes}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`border-none ${QUOT_STATUS_COLORS[q.status] ?? ""}`}>
                            {q.status === "accepted" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {q.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                            {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                          </Badge>
                          {user?.role === "buyer" && rfq.status === "active" && q.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant={isBest ? "default" : "outline"}
                                className="gap-1.5"
                                onClick={() => handleAccept(q.id, q.supplierName)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-destructive hover:text-destructive"
                                onClick={() => setRejectingQid(q.id)}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {q.status !== "rejected" && q.status !== "expired" && (
                        <NegotiationThread
                          rfqId={id}
                          quotationId={q.id}
                          quotationStatus={q.status}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={rejectingQid !== null} onOpenChange={v => { if (!v) setRejectingQid(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this quotation? The supplier will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectingQid && handleReject(rejectingQid)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
