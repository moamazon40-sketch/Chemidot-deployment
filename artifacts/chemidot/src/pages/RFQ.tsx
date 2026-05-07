import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, MapPin, ChevronRight, ChevronLeft,
  CheckCircle2, Send, Users, FlaskConical, Info,
} from "lucide-react";
import { MotionCTAButton } from "@/components/MotionCTAButton";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCreateRfq, useListCategories } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Chemical & Order",  icon: FlaskConical },
  { id: 2, label: "Delivery & Specs",  icon: MapPin },
  { id: 3, label: "Review & Submit",   icon: Send },
];

const UNITS      = ["MT", "KG", "L", "TON", "Drums", "IBCs", "Units"];
const CURRENCIES = ["SAR", "USD", "EUR", "AED"];
const URGENCY    = ["Normal", "Urgent", "Critical"];

const EMPTY = {
  productName: "", casNumber: "", categoryId: "",
  quantity: "", unit: "MT", packaging: "",
  deliveryCity: "", deliveryAddress: "", requiredBy: "", urgency: "Normal",
  targetPrice: "", currency: "SAR", specifications: "",
  collectiveOrder: false, minQty: "", discount: "", closingDate: "",
  fullName: "", companyName: "", email: "", phone: "",
};

type Form = typeof EMPTY;

export default function RFQ() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const createRfq = useCreateRfq();
  const { data: categoriesData } = useListCategories();
  const categories = (categoriesData ?? []) as { id: number; name: string }[];

  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState<Form>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  const f = (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  const buildDescription = () => {
    const parts: string[] = [];
    if (form.packaging)      parts.push(`Packaging: ${form.packaging}`);
    if (form.deliveryAddress) parts.push(`Address: ${form.deliveryAddress}`);
    if (form.urgency !== "Normal") parts.push(`Urgency: ${form.urgency}`);
    if (form.targetPrice)    parts.push(`Target: ${form.currency} ${form.targetPrice}/unit`);
    if (form.collectiveOrder)
      parts.push(`Collective Order — Min Qty: ${form.minQty || "?"}, Discount: ${form.discount || "?"}%, Closes: ${form.closingDate || "TBD"}`);
    if (!user && form.fullName)
      parts.push(`Contact: ${form.fullName}, ${form.companyName}, ${form.email}, ${form.phone}`);
    return parts.join(" | ");
  };

  const validate = (s: number): boolean => {
    if (s === 1) {
      if (!form.productName.trim()) {
        toast({ title: "Product name is required", variant: "destructive" }); return false;
      }
      if (!form.quantity || isNaN(parseFloat(form.quantity))) {
        toast({ title: "Enter a valid quantity", variant: "destructive" }); return false;
      }
    }
    if (s === 2) {
      if (!form.deliveryCity.trim()) {
        toast({ title: "Delivery destination is required", variant: "destructive" }); return false;
      }
      if (!form.requiredBy) {
        toast({ title: "Required-by date is needed", variant: "destructive" }); return false;
      }
    }
    return true;
  };

  const next = () => { if (validate(step)) setStep(s => Math.min(s + 1, 3)); };

  const handleGuestRedirect = () => {
    sessionStorage.setItem("rfq_prefill", JSON.stringify(form));
    navigate("/auth/register");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading || !user) return;
    createRfq.mutate({
      data: {
        productName:         form.productName,
        casNumber:           form.casNumber  || undefined,
        quantity:            parseFloat(form.quantity),
        unit:                form.unit,
        deliveryDestination: form.deliveryCity,
        deliveryDeadline:    new Date(form.requiredBy).toISOString(),
        specifications:      form.specifications || undefined,
        description:         buildDescription()  || undefined,
        categoryId:          form.categoryId ? parseInt(form.categoryId) : undefined,
      },
    }, {
      onSuccess: () => { setSubmitted(true); window.scrollTo({ top: 0, behavior: "smooth" }); },
      onError:   () => toast({ title: "Failed to submit RFQ", description: "Please try again.", variant: "destructive" }),
    });
  };

  const minDate = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

  /* ── Success ── */
  if (submitted) {
    return (
      <MainLayout>
        <section className="relative overflow-hidden bg-hero min-h-[70vh] flex items-center">
          <div className="absolute inset-0 grid-pattern [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div className="mx-auto max-w-7xl px-6 md:px-10 relative w-full py-20">
            <div className="max-w-lg mx-auto text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-4xl font-extrabold text-primary">RFQ Submitted!</h1>
              <p className="text-muted-foreground text-lg">
                Your request has been sent to matched suppliers. You'll receive competitive quotes in your dashboard within 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <MotionCTAButton href="/dashboard/rfqs">View My RFQs</MotionCTAButton>
                <Button variant="outline" onClick={() => { setSubmitted(false); setStep(1); setForm(EMPTY); }}>
                  Submit Another RFQ
                </Button>
              </div>
            </div>
          </div>
        </section>
      </MainLayout>
    );
  }

  /* ── Main form ── */
  return (
    <MainLayout>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero pt-28 pb-16">
        <div className="absolute inset-0 grid-pattern [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 md:px-10 relative">
          <div className="mx-auto max-w-2xl text-center space-y-5 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-1.5 text-xs font-medium text-primary backdrop-blur">
              <FileText className="h-3.5 w-3.5 text-accent" />
              <span>Request for Quotation</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.05] tracking-tight text-primary">
              Source any chemical{" "}
              <span className="text-gradient">in 3 steps.</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Describe what you need and receive competitive quotes from verified Gulf suppliers within 24 hours.
            </p>
          </div>

          {/* Step indicator */}
          <div className="mt-10 flex items-center justify-center">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => step > s.id && setStep(s.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    step === s.id
                      ? "bg-primary text-white shadow-glow"
                      : step > s.id
                      ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                      : "bg-muted/60 text-muted-foreground cursor-default"
                  )}
                >
                  {step > s.id
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <s.icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden font-semibold">{s.id}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={cn("w-6 md:w-10 h-0.5 mx-1 md:mx-2 transition-colors", step > s.id ? "bg-primary/50" : "bg-border")} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 md:py-20 bg-surface-soft">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          <form onSubmit={handleSubmit}>

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-up">
                <div className="rounded-xl border border-border bg-white p-8 shadow-card-premium">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow shrink-0">
                      <FlaskConical className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-primary">Chemical & Order Details</h2>
                      <p className="text-xs text-muted-foreground">Tell us what you need and in what quantity.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Chemical / Product Name <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="e.g. Sodium Hydroxide, Ethylene Glycol…"
                        value={form.productName}
                        onChange={f("productName")}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label>CAS Number</Label>
                        <Input placeholder="e.g. 1310-73-2" value={form.casNumber} onChange={f("casNumber")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={form.categoryId}
                          onChange={f("categoryId")}
                        >
                          <option value="">Select category</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label>Quantity <span className="text-red-500">*</span></Label>
                        <Input
                          type="number" min="0.01" step="0.01"
                          placeholder="e.g. 25"
                          value={form.quantity}
                          onChange={f("quantity")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={form.unit}
                          onChange={f("unit")}
                        >
                          {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Packaging Type</Label>
                      <Input
                        placeholder="e.g. 25 kg bags, 200 L drums, IBC totes…"
                        value={form.packaging}
                        onChange={f("packaging")}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={next} className="gap-2 px-6">
                    Next: Delivery & Specs <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-up">

                {/* Delivery */}
                <div className="rounded-xl border border-border bg-white p-8 shadow-card-premium">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow shrink-0">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-primary">Delivery Information</h2>
                      <p className="text-xs text-muted-foreground">Where and when do you need this delivered?</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Delivery Destination <span className="text-red-500">*</span></Label>
                      <Input placeholder="e.g. Riyadh, Saudi Arabia" value={form.deliveryCity} onChange={f("deliveryCity")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Full Delivery Address</Label>
                      <Input placeholder="Building, street, district…" value={form.deliveryAddress} onChange={f("deliveryAddress")} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label>Required By <span className="text-red-500">*</span></Label>
                        <Input type="date" min={minDate} value={form.requiredBy} onChange={f("requiredBy")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Urgency</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={form.urgency}
                          onChange={f("urgency")}
                        >
                          {URGENCY.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical */}
                <div className="rounded-xl border border-border bg-white p-8 shadow-card-premium">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow shrink-0">
                      <FlaskConical className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-primary">Technical & Pricing</h2>
                      <p className="text-xs text-muted-foreground">Purity, grade, certifications, and your target budget.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label>Technical Specifications</Label>
                      <Textarea
                        placeholder="Purity ≥ 99%, food grade, REACH compliant, SDS required…"
                        rows={3}
                        value={form.specifications}
                        onChange={f("specifications")}
                        className="resize-none"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label>Target Price per Unit</Label>
                        <Input
                          type="number" min="0" step="0.01"
                          placeholder="e.g. 420"
                          value={form.targetPrice}
                          onChange={f("targetPrice")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={form.currency}
                          onChange={f("currency")}
                        >
                          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collective order */}
                <div className="rounded-xl border border-border bg-white p-8 shadow-card-premium">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow shrink-0">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-primary">Collective Order</h2>
                        <p className="text-xs text-muted-foreground">Pool with other buyers to unlock bulk pricing.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, collectiveOrder: !p.collectiveOrder }))}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors shrink-0 mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        form.collectiveOrder ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      aria-checked={form.collectiveOrder}
                      role="switch"
                    >
                      <span className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                        form.collectiveOrder ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  {form.collectiveOrder && (
                    <div className="mt-5 pt-5 border-t space-y-4">
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Min Quantity Target</Label>
                          <Input placeholder="e.g. 100 MT" value={form.minQty} onChange={f("minQty")} />
                        </div>
                        <div className="space-y-2">
                          <Label>Discount Expectation %</Label>
                          <Input type="number" min="0" max="100" placeholder="e.g. 15" value={form.discount} onChange={f("discount")} />
                        </div>
                        <div className="space-y-2">
                          <Label>Closing Date</Label>
                          <Input type="date" min={minDate} value={form.closingDate} onChange={f("closingDate")} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="button" onClick={next} className="gap-2 px-6">
                    Next: Review & Submit <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-up">

                {/* Summary */}
                <div className="rounded-xl border border-border bg-white p-8 shadow-card-premium">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-primary">RFQ Summary</h2>
                    <button type="button" onClick={() => setStep(1)} className="text-xs text-primary hover:underline">
                      Edit details
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {[
                      { label: "Chemical",       value: form.productName },
                      { label: "CAS Number",     value: form.casNumber || "—" },
                      { label: "Quantity",        value: `${form.quantity} ${form.unit}` },
                      { label: "Packaging",       value: form.packaging || "—" },
                      { label: "Delivery To",     value: form.deliveryCity },
                      { label: "Required By",     value: form.requiredBy ? new Date(form.requiredBy).toLocaleDateString("en-SA", { day: "numeric", month: "long", year: "numeric" }) : "—" },
                      { label: "Urgency",         value: form.urgency },
                      { label: "Target Price",    value: form.targetPrice ? `${form.currency} ${parseFloat(form.targetPrice).toLocaleString()} / unit` : "—" },
                      { label: "Collective Order", value: form.collectiveOrder ? "Yes" : "No" },
                    ].map(row => (
                      <div key={row.label} className="flex gap-3">
                        <span className="text-muted-foreground shrink-0 w-28 text-xs pt-0.5">{row.label}</span>
                        <span className="font-medium leading-snug">{row.value}</span>
                      </div>
                    ))}
                    {form.specifications && (
                      <div className="sm:col-span-2 flex gap-3 pt-2 border-t mt-1">
                        <span className="text-muted-foreground shrink-0 w-28 text-xs pt-0.5">Specifications</span>
                        <span className="font-medium leading-snug">{form.specifications}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Auth gate / contact */}
                {authLoading ? (
                  <div className="rounded-xl border border-border bg-white p-8 shadow-card-premium flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-muted animate-pulse shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ) : !user ? (
                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-8 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow shrink-0">
                        <Info className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-primary">Almost there!</h2>
                        <p className="text-xs text-muted-foreground">Create a free account to send your RFQ to verified suppliers.</p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name <span className="text-red-500">*</span></Label>
                        <Input placeholder="Ahmed Al-Rashid" value={form.fullName} onChange={f("fullName")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Company Name <span className="text-red-500">*</span></Label>
                        <Input placeholder="National Chemicals Co." value={form.companyName} onChange={f("companyName")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Work Email <span className="text-red-500">*</span></Label>
                        <Input type="email" placeholder="ahmed@company.com" value={form.email} onChange={f("email")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone / WhatsApp</Label>
                        <Input type="tel" placeholder="+966 5X XXX XXXX" value={form.phone} onChange={f("phone")} />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <MotionCTAButton type="button" onClick={handleGuestRedirect} className="flex-1 gap-2">
                        <Send className="w-4 h-4" />
                        Create Account & Send RFQ
                      </MotionCTAButton>
                      <Link href="/auth/login">
                        <Button type="button" variant="outline" className="w-full sm:w-auto">
                          Already have an account?
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-white p-8 shadow-card-premium space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-primary">Ready to submit</h2>
                        <p className="text-xs text-muted-foreground">
                          Signed in as <span className="font-medium">{user.email}</span>. Matched suppliers will see your company profile.
                        </p>
                      </div>
                    </div>

                    <MotionCTAButton type="submit" className="w-full gap-2" disabled={createRfq.isPending}>
                      {createRfq.isPending
                        ? "Sending to Suppliers…"
                        : <><Send className="w-4 h-4" /> Send RFQ to Suppliers</>}
                    </MotionCTAButton>
                  </div>
                )}

                <Button type="button" variant="ghost" onClick={() => setStep(2)} className="gap-2 text-muted-foreground">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
              </div>
            )}

          </form>

          {/* Trust strip */}
          <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-3">
            {["Verified suppliers only", "Quotes within 24 hours", "Free for buyers", "ISO-certified network"].map(item => (
              <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </MainLayout>
  );
}
