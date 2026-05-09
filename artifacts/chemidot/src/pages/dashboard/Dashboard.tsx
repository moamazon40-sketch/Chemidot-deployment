import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth, getStoredToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetBuyerStats, useGetSupplierStats } from "@workspace/api-client-react";
import {
  FileText, Package, Users, DollarSign, TrendingUp, Activity,
  PackageSearch, MessageSquare, Pencil, Upload, X, Image as ImageIcon,
  Building2, Star, ShoppingCart, BarChart3, Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

/* ─── Shared helpers ─── */
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn("w-3 h-3", i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

/* ─── Styled KPI stat card ─── */
function StatCard({
  label, value, sub, icon: Icon, iconBg, iconColor, href,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  href?: string;
}) {
  const [, navigate] = useLocation();
  const card = (
    <Card className={cn("border shadow-sm hover:shadow-md transition-shadow", href && "cursor-pointer")} onClick={href ? () => navigate(href) : undefined}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-extrabold tracking-tight leading-none">{value}</p>
          <p className="text-sm font-semibold text-foreground/80 mt-1">{label}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
  return card;
}

/* ─── Custom tooltip for charts ─── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

/* ─── Donut chart legend dot ─── */
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      <span className="text-xs text-white/70">{label}</span>
    </div>
  );
}

/* ─── Image upload helper ─── */
async function uploadImage(file: File): Promise<string> {
  const token = getStoredToken();
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch("/api/suppliers/upload-image", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

/* ─── Edit Company Profile Dialog ─── */
function EditCompanyProfileDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File, setPreview: (v: string | null) => void, setUrl: (v: string) => void) => {
    setPreview(URL.createObjectURL(file));
    try {
      const url = await uploadImage(file);
      setUrl(url);
    } catch {
      toast({ title: "Upload failed", description: "Could not upload image. Paste a URL instead.", variant: "destructive" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = getStoredToken();
      const body: Record<string, string> = {};
      if (companyName.trim()) body.companyName = companyName.trim();
      if (description.trim()) body.description = description.trim();
      if (logoUrl.trim()) body.logoUrl = logoUrl.trim();
      if (coverUrl.trim()) body.coverUrl = coverUrl.trim();
      const res = await fetch("/api/suppliers/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Company profile updated!", description: "Your storefront has been updated." });
      onSaved?.();
      onClose();
    } catch {
      toast({ title: "Failed to save", description: "Could not update company profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Edit Company Profile
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-6 pt-2">
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input placeholder="Your company name" value={companyName} onChange={e => setCompanyName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Company Description</Label>
            <Textarea rows={5} placeholder="Describe your company…" value={description} onChange={e => setDescription(e.target.value)} />
            <p className="text-xs text-muted-foreground">Appears in your public storefront "About Us" section.</p>
          </div>
          <div className="space-y-2">
            <Label>Cover Picture</Label>
            <div className="relative w-full h-36 rounded-xl border-2 border-dashed overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => coverRef.current?.click()}>
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  <button type="button" className="absolute top-2 right-2 bg-background/80 rounded-full p-1" onClick={e => { e.stopPropagation(); setCoverPreview(null); setCoverUrl(""); }}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-sm">Click to upload cover image</span>
                  <span className="text-xs">JPG, PNG, WebP, max 5MB</span>
                </div>
              )}
            </div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, setCoverPreview, setCoverUrl); }} />
            <Input placeholder="Or paste a URL: https://example.com/cover.jpg" value={coverUrl} onChange={e => { setCoverUrl(e.target.value); setCoverPreview(e.target.value || null); }} />
          </div>
          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors shrink-0 overflow-hidden relative" onClick={() => logoRef.current?.click()}>
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                    <button type="button" className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5" onClick={e => { e.stopPropagation(); setLogoPreview(null); setLogoUrl(""); }}>
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground text-center px-2">
                    <Upload className="w-5 h-5" />
                    <span className="text-xs leading-tight">Upload logo</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, setLogoPreview, setLogoUrl); }} />
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => logoRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Choose File
                </Button>
                <p className="text-xs text-muted-foreground">Recommended: square image, min 200×200px</p>
                <Input placeholder="Or paste logo URL" value={logoUrl} onChange={e => { setLogoUrl(e.target.value); setLogoPreview(e.target.value || null); }} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Profile"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back, {user.firstName}. Here's what's happening today.</p>
        </div>
        {user.role === "buyer" && <BuyerDashboard />}
        {user.role === "supplier" && <SupplierDashboard />}
        {user.role === "admin" && <div className="text-muted-foreground italic">Admin dashboard functionality is located in the Admin Panel tab.</div>}
      </div>
    </DashboardLayout>
  );
}

/* ══════════════════════════════════════════════════════
   BUYER DASHBOARD
══════════════════════════════════════════════════════ */
function BuyerDashboard() {
  const { data: stats, isLoading } = useGetBuyerStats();
  if (isLoading) return <DashboardSkeleton />;
  if (!stats) return null;

  /* Donut data */
  const donutData = [
    { name: "Active RFQs", value: stats.activeRfqs || 1, color: "#6366f1" },
    { name: "Orders", value: stats.pendingOrders || 1, color: "#f59e0b" },
    { name: "Collective", value: stats.collectiveOrdersJoined || 1, color: "#ef4444" },
  ];
  const total = donutData.reduce((s, d) => s + d.value, 0);
  const pct = total > 0 ? Math.round((donutData[0].value / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active RFQs"       value={`${stats.activeRfqs}+`}              sub={`${stats.totalRfqs} total`}         icon={FileText}     iconBg="bg-indigo-100 dark:bg-indigo-900/30"  iconColor="text-indigo-600 dark:text-indigo-400" href="/dashboard/rfqs" />
        <StatCard label="Pending Orders"     value={`${stats.pendingOrders}+`}            sub={`${stats.totalOrders} total`}        icon={ShoppingCart}  iconBg="bg-amber-100 dark:bg-amber-900/30"    iconColor="text-amber-600 dark:text-amber-400"   href="/dashboard/orders" />
        <StatCard label="Collective Orders"  value={`${stats.collectiveOrdersJoined}+`}   sub="Active participations"              icon={Users}        iconBg="bg-rose-100 dark:bg-rose-900/30"      iconColor="text-rose-600 dark:text-rose-400"     href="/dashboard/collective" />
        <StatCard label="Total Savings"      value={`$${stats.totalSavings.toLocaleString()}`} sub="Via collective orders"         icon={DollarSign}   iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" href="/dashboard/collective" />
      </div>

      {/* Chart row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Multi-line spend chart */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Spend Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <div className="h-[280px] px-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthlySpend} margin={{ top: 16, right: 24, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="buyGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="transparent" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="transparent" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v / 1000}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }} />
                  <Line type="monotone" dataKey="value" name="Spend" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Dark donut analytics card */}
        <Card className="lg:col-span-3 bg-[hsl(225,86%,13%)] border-0 shadow-sm text-white">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold text-white">Analytics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-2 pb-4">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-white">{pct}%</span>
                <span className="text-xs text-white/60 mt-0.5">Active RFQs</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              {donutData.map(d => <LegendDot key={d.name} color={d.color} label={d.name.split(" ")[0]} />)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Recent activity + spend breakdown */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Recent Orders table */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">Activity</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentActivity.slice(0, 6).map((a, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                              <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="font-medium text-foreground/90 line-clamp-1">{a.description}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spend summary */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Spend Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Total Spend", value: `$${(stats.monthlySpend?.reduce((s: number, m: any) => s + m.value, 0) || 0).toLocaleString()}`, color: "bg-indigo-500", pct: 75 },
              { label: "Pending Orders", value: stats.pendingOrders, color: "bg-amber-400", pct: 45 },
              { label: "Saved via Collective", value: `$${stats.totalSavings.toLocaleString()}`, color: "bg-emerald-500", pct: 60 },
            ].map(item => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{item.label}</span>
                  <span className="font-bold">{item.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SUPPLIER DASHBOARD
══════════════════════════════════════════════════════ */
function SupplierDashboard() {
  const { data: stats, isLoading } = useGetSupplierStats();
  const [, navigate] = useLocation();

  if (isLoading) return <DashboardSkeleton />;
  if (!stats) return null;
  const subscription = stats as typeof stats & {
    supplierPlan?: string;
    subscriptionStatus?: string;
    trialEndsAt?: string | null;
    gracePeriodEndsAt?: string | null;
    subscriptionRenewalDate?: string | null;
    productLimit?: number | null;
    hasReachedProductLimit?: boolean;
    storefrontVisible?: boolean;
    productsPublic?: boolean;
    rfqAccessEnabled?: boolean;
  };
  const isSuspended = subscription.subscriptionStatus === "suspended" || subscription.subscriptionStatus === "cancelled";

  /* Donut data */
  const donutData = [
    { name: "Revenue", value: stats.totalRevenue || 0, color: "#6366f1" },
    { name: "Pending", value: stats.pendingOrders || 0, color: "#f59e0b" },
    { name: "RFQs", value: stats.activeRfqs || 0, color: "#ef4444" },
  ];
  const totalD = donutData.reduce((s, d) => s + d.value, 0);
  const pctD = totalD > 0 ? Math.round((donutData[0].value / totalD) * 100) : 0;

  const chartData = stats.revenueByMonth || [];

  return (
    <div className="space-y-6">
      {isSuspended && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          Your supplier account is currently suspended. Please contact Chemidot support to reactivate your storefront.
        </div>
      )}

      {/* Edit profile banner */}
      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-5 py-4">
        <div>
          <p className="font-semibold text-sm">Company Profile</p>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your storefront, documents, brands, and optional expert profiles from one place.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => navigate("/dashboard/settings")}>
          <Pencil className="w-3.5 h-3.5" /> Open Settings
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Plan</p>
            <p className="text-xl font-bold capitalize">{subscription.supplierPlan ?? "trial"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Subscription Status</p>
            <p className="text-xl font-bold capitalize">{subscription.subscriptionStatus ?? "trial"}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Renewal / Trial End</p>
            <p className="text-sm font-semibold">
              {subscription.subscriptionRenewalDate
                ? new Date(subscription.subscriptionRenewalDate).toLocaleDateString()
                : subscription.trialEndsAt
                  ? new Date(subscription.trialEndsAt).toLocaleDateString()
                  : "Not set"}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Catalog Usage</p>
            <p className="text-sm font-semibold">
              {stats.totalProducts}{subscription.productLimit ? ` / ${subscription.productLimit}` : " / Unlimited"}
            </p>
            {subscription.hasReachedProductLimit && (
              <p className="text-xs text-amber-600">Upgrade your plan to publish more products.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue"  value={`$${stats.totalRevenue.toLocaleString()}`} sub="+12.5% this month" icon={DollarSign}    iconBg="bg-indigo-100 dark:bg-indigo-900/30"  iconColor="text-indigo-600 dark:text-indigo-400" href="/dashboard/orders" />
        <StatCard label="Active RFQs"    value={`${stats.activeRfqs}+`}                    sub="Needs attention"  icon={FileText}     iconBg="bg-amber-100 dark:bg-amber-900/30"    iconColor="text-amber-600 dark:text-amber-400"   href="/dashboard/rfqs" />
        <StatCard label="Pending Orders" value={`${stats.pendingOrders}+`}                  sub="Awaiting fulfill" icon={Package}       iconBg="bg-rose-100 dark:bg-rose-900/30"      iconColor="text-rose-600 dark:text-rose-400"     href="/dashboard/orders" />
        <StatCard label="Response Rate"  value={`${stats.responseRate}%`}                   sub={`Avg ${stats.avgResponseTime}`} icon={Zap} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* Chart row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Multi-line revenue chart */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Reports</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            <div className="h-[280px] px-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 16, right: 24, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="transparent" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="transparent" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v / 1000}k`} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "4 4" }} />
                  <Line type="monotone" dataKey="value"  name="Revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="orders" name="Orders"  stroke="#f472b6" strokeWidth={2.5} dot={{ r: 4, fill: "#f472b6", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Dark donut analytics */}
        <Card className="lg:col-span-3 bg-[hsl(225,86%,13%)] border-0 shadow-sm text-white">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold text-white">Analytics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-2 pb-4">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-white">{pctD}%</span>
                <span className="text-xs text-white/60 mt-0.5">Transactions</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              {donutData.map(d => <LegendDot key={d.name} color={d.color} label={d.name} />)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Recent Orders table */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">Product Name</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">Price</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">MOQ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topProducts.slice(0, 6).map(p => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                              {p.imageUrl
                                ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                                : <PackageSearch className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium line-clamp-1">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.categoryName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-foreground/90">
                          {p.currency} {p.basePrice?.toLocaleString() ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-block bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {p.moqUnit}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products with star ratings */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.topProducts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No products listed yet</p>
            )}
            {stats.topProducts.slice(0, 5).map((product, i) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {product.imageUrl
                    ? <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <PackageSearch className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <StarRating rating={4 - (i % 2) * 0.5} />
                  <p className="text-sm font-semibold mt-0.5 line-clamp-1">{product.name}</p>
                  <p className="text-sm font-bold text-primary">
                    {product.currency} {product.basePrice?.toLocaleString() ?? "-"}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4"><CardContent className="p-6"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
        <Card className="lg:col-span-3"><CardContent className="p-6"><Skeleton className="h-[280px] w-full" /></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4"><CardContent className="p-6"><Skeleton className="h-[200px] w-full" /></CardContent></Card>
        <Card className="lg:col-span-3"><CardContent className="p-6"><Skeleton className="h-[200px] w-full" /></CardContent></Card>
      </div>
    </div>
  );
}
