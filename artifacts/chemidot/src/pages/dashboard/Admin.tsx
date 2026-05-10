import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { getStoredToken } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldAlert,
  Users,
  Building2,
  Package,
  FileText,
  Layers,
  Tags,
  RefreshCw,
  CheckCircle2,
  Ban,
  Star,
  Save,
  Plus,
  EyeOff,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";

type AdminStats = {
  totalUsers: number;
  totalSuppliers: number;
  pendingVerifications: number;
  totalProducts: number;
  totalRfqs: number;
  activeCollectiveOrders: number;
};

type UserRow = {
  id: number;
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

type SupplierRow = {
  id: number;
  companyName: string;
  country: string;
  verified: boolean;
  featured?: boolean;
  productCount?: number;
  createdAt?: string;
  owner?: {
    id: number;
    email: string;
    status: string;
    role: string;
  } | null;
  supplierPlan: "trial" | "starter" | "growth" | "enterprise";
  subscriptionStatus: "trial" | "active" | "past_due" | "suspended" | "cancelled";
  featuredSupplier?: boolean;
  trialEndsAt?: string | null;
  gracePeriodEndsAt?: string | null;
  subscriptionStartedAt?: string | null;
  subscriptionRenewalDate?: string | null;
  billingCycle?: "monthly" | "yearly" | "custom";
  internalAdminNotes?: string | null;
  productLimit?: number | null;
  rfqAccessEnabled?: boolean;
  storefrontVisible?: boolean;
  productsPublic?: boolean;
  recentAudit?: Array<{
    id: number;
    action: string;
    createdAt: string | null;
  }>;
};

type ProductRow = {
  id: number;
  name: string;
  availability: string;
  featured?: boolean;
  supplier?: SupplierRow | null;
  category?: { name?: string } | null;
  createdAt?: string;
};

type RfqRow = {
  id: number;
  productName: string;
  quantity: string;
  unit: string;
  status: string;
  buyer?: { email?: string; companyName?: string | null } | null;
  createdAt?: string;
};

type CollectiveOrderRow = {
  id: number;
  productName: string;
  targetQuantity: string;
  currentQuantity: string;
  unit: string;
  status: string;
  supplier?: SupplierRow | null;
  createdAt?: string;
};

type OrderRow = {
  id: number;
  buyerId: number;
  supplierId: number;
  productName?: string | null;
  quantity: string;
  unit: string;
  totalPrice: string;
  currency: string;
  status: string;
  dealStage?: string | null;
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
  confirmedUnitPrice?: string | null;
  confirmedQuantity?: string | null;
  confirmedLeadTime?: string | null;
  confirmedIncoterm?: string | null;
  paymentTerms?: string | null;
  offerValidityDate?: string | null;
  proformaInvoiceUrl?: string | null;
  commercialInvoiceUrl?: string | null;
  invoiceIssuedAt?: string | null;
  invoiceStatus?: "not_issued" | "issued";
  orderDocumentNotes?: string | null;
  dealValue?: string | null;
  dealCurrency?: string | null;
  successFeeRate: string;
  successFeeAmount?: string | null;
  successFeePayer: "supplier";
  successFeeStatus?: "pending" | "invoiced" | "paid" | "waived" | null;
  successFeeNotes?: string | null;
  successFeeMarkedAt?: string | null;
  buyer?: { email?: string; companyName?: string | null } | null;
  supplier?: { id: number; companyName: string } | null;
  createdAt?: string | null;
};

type CategoryRow = {
  id: number;
  name: string;
  nameAr?: string;
  slug: string;
  iconUrl?: string | null;
  createdAt?: string;
};

type AdminData = {
  stats: AdminStats | null;
  users: UserRow[];
  suppliers: SupplierRow[];
  products: ProductRow[];
  orders: OrderRow[];
  rfqs: RfqRow[];
  collectiveOrders: CollectiveOrderRow[];
  categories: CategoryRow[];
};

const initialData: AdminData = {
  stats: null,
  users: [],
  suppliers: [],
  products: [],
  orders: [],
  rfqs: [],
  collectiveOrders: [],
  categories: [],
};

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `Request failed with status ${res.status}`);
  }

  return res.json();
}

function StatusBadge({ value }: { value: string | boolean }) {
  const text = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
  const normalized = String(text).toLowerCase();
  const className =
    normalized === "active" || normalized === "open" || normalized === "in_stock" || normalized === "yes" || normalized === "paid" || normalized === "completed" || normalized === "delivered" || normalized === "confirmed"
      ? "bg-green-100 text-green-800 hover:bg-green-100 border-none"
      : normalized === "suspended" || normalized === "closed" || normalized === "out_of_stock" || normalized === "no" || normalized === "cancelled" || normalized === "waived"
        ? "bg-red-100 text-red-800 hover:bg-red-100 border-none"
        : "bg-amber-100 text-amber-800 hover:bg-amber-100 border-none";

  return <Badge className={className}>{text}</Badge>;
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}

function SmallSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border bg-background px-2 text-xs"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [data, setData] = useState<AdminData>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [supplierPlanFilter, setSupplierPlanFilter] = useState("all");
  const [supplierStatusFilter, setSupplierStatusFilter] = useState("all");
  const [supplierFeaturedFilter, setSupplierFeaturedFilter] = useState("all");
  const isAdmin = user?.role === "admin";

  const loadAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [stats, users, suppliers, products, orders, rfqs, collectiveOrders, categories] = await Promise.all([
        adminRequest<AdminStats>("/api/admin/stats"),
        adminRequest<{ users: UserRow[] }>("/api/admin/users?limit=200"),
        adminRequest<{ suppliers: SupplierRow[] }>("/api/admin/suppliers?limit=200"),
        adminRequest<{ products: ProductRow[] }>("/api/admin/products?limit=200"),
        adminRequest<{ orders: OrderRow[] }>("/api/admin/orders?limit=200"),
        adminRequest<{ rfqs: RfqRow[] }>("/api/admin/rfqs?limit=200"),
        adminRequest<{ collectiveOrders: CollectiveOrderRow[] }>("/api/admin/collective-orders?limit=200"),
        adminRequest<CategoryRow[]>("/api/admin/categories"),
      ]);

      setData({
        stats,
        users: users.users ?? [],
        suppliers: suppliers.suppliers ?? [],
        products: products.products ?? [],
        orders: orders.orders ?? [],
        rfqs: rfqs.rfqs ?? [],
        collectiveOrders: collectiveOrders.collectiveOrders ?? [],
        categories: categories ?? [],
      });
    } catch (error) {
      toast({
        title: "Admin data failed to load",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;

    return {
      ...data,
      users: data.users.filter((item) =>
        [item.email, item.companyName, item.firstName, item.lastName, item.role, item.status]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      ),
      suppliers: data.suppliers.filter((item) =>
        [
          item.companyName,
          item.country,
          item.owner?.email,
          item.verified ? "verified" : "pending",
          item.supplierPlan,
          item.subscriptionStatus,
        ].filter(Boolean).join(" ").toLowerCase().includes(q)
      ),
      products: data.products.filter((item) =>
        [item.name, item.availability, item.supplier?.companyName, item.category?.name].filter(Boolean).join(" ").toLowerCase().includes(q)
      ),
      orders: data.orders.filter((item) =>
        [item.productName, item.status, item.dealStage, item.paymentStatus, item.fulfillmentStatus, item.currency, item.successFeeStatus, item.buyer?.email, item.buyer?.companyName, item.supplier?.companyName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      ),
      rfqs: data.rfqs.filter((item) =>
        [item.productName, item.status, item.buyer?.email, item.buyer?.companyName].filter(Boolean).join(" ").toLowerCase().includes(q)
      ),
      collectiveOrders: data.collectiveOrders.filter((item) =>
        [item.productName, item.status, item.supplier?.companyName].filter(Boolean).join(" ").toLowerCase().includes(q)
      ),
      categories: data.categories.filter((item) =>
        [item.name, item.nameAr, item.slug].filter(Boolean).join(" ").toLowerCase().includes(q)
      ),
    };
  }, [data, search]);

  const updateUserStatus = async (id: number, status: string) => {
    if (!confirm(`Change this user status to ${status}?`)) return;
    await adminRequest(`/api/admin/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    toast({ title: "User status updated" });
    loadAdminData();
  };

  const updateUserRole = async (id: number, role: string) => {
    if (!confirm(`Change this user role to ${role}?`)) return;
    await adminRequest(`/api/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    toast({ title: "User role updated" });
    loadAdminData();
  };

  const updateSupplier = async (id: number, body: Record<string, unknown>) => {
    await adminRequest(`/api/admin/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    toast({ title: "Supplier updated" });
    loadAdminData();
  };

  const updateSupplierSubscription = async (id: number, body: Record<string, unknown>, title = "Subscription updated") => {
    await adminRequest(`/api/admin/suppliers/${id}/subscription`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    toast({ title });
    loadAdminData();
  };

  const updateProduct = async (id: number, body: Record<string, unknown>) => {
    await adminRequest(`/api/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    toast({ title: "Product updated" });
    loadAdminData();
  };

  const updateStatus = async (path: string, status: string, label: string) => {
    if (!confirm(`Change ${label} status to ${status}?`)) return;
    await adminRequest(path, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    toast({ title: `${label} status updated` });
    loadAdminData();
  };

  const closeOrderDeal = async (order: OrderRow) => {
    const currentValue = order.dealValue ?? order.totalPrice;
    const value = prompt("Deal value", String(currentValue ?? ""));
    if (!value) return;
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      toast({ title: "Invalid deal value", variant: "destructive" });
      return;
    }
    if (!confirm("Mark this deal as completed and create a 2% success fee?")) return;
    await adminRequest(`/api/admin/orders/${order.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", dealValue: parsedValue, dealCurrency: order.dealCurrency ?? order.currency }),
    });
    toast({ title: "Deal closed and success fee calculated" });
    loadAdminData();
  };

  const updateSuccessFee = async (order: OrderRow, successFeeStatus?: "pending" | "invoiced" | "paid" | "waived") => {
    const dealValueInput = prompt("Deal value", String(order.dealValue ?? order.totalPrice));
    if (!dealValueInput) return;
    const dealValue = Number(dealValueInput);
    if (!Number.isFinite(dealValue) || dealValue <= 0) {
      toast({ title: "Invalid deal value", variant: "destructive" });
      return;
    }
    const notes = prompt("Admin notes", order.successFeeNotes ?? "") ?? order.successFeeNotes ?? "";
    await adminRequest(`/api/admin/orders/${order.id}/success-fee`, {
      method: "PATCH",
      body: JSON.stringify({
        dealValue,
        dealCurrency: order.dealCurrency ?? order.currency,
        successFeeStatus,
        successFeeNotes: notes,
      }),
    });
    toast({ title: "Success fee updated" });
    loadAdminData();
  };

  const updateOrderDealStage = async (order: OrderRow, dealStage: "admin_approved" | "admin_needs_review" | "cancelled") => {
    const notes = dealStage === "admin_needs_review" ? prompt("What needs review?", order.successFeeNotes ?? "") : "";
    if (dealStage === "cancelled" && !confirm("Cancel this deal? Buyer and supplier will be notified.")) return;
    await adminRequest(`/api/admin/orders/${order.id}/deal-stage`, {
      method: "PATCH",
      body: JSON.stringify({ dealStage, adminNotes: notes || undefined }),
    });
    toast({ title: "Deal review updated" });
    loadAdminData();
  };

  const updateOrderPaymentStatus = async (order: OrderRow, paymentStatus: "pending" | "confirmed") => {
    await adminRequest(`/api/admin/orders/${order.id}/payment-status`, {
      method: "PATCH",
      body: JSON.stringify({ paymentStatus }),
    });
    toast({ title: "Payment status updated" });
    loadAdminData();
  };

  const updateOrderFulfillmentStatus = async (order: OrderRow, fulfillmentStatus: "preparing" | "ready_for_pickup" | "shipped" | "delivered" | "completed" | "cancelled") => {
    await adminRequest(`/api/admin/orders/${order.id}/fulfillment-status`, {
      method: "PATCH",
      body: JSON.stringify({ fulfillmentStatus }),
    });
    toast({ title: "Fulfillment status updated" });
    loadAdminData();
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    await adminRequest("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setNewCategoryName("");
    toast({ title: "Category added" });
    loadAdminData();
  };

  const renameCategory = async (category: CategoryRow) => {
    const name = prompt("Category name", category.name);
    if (!name?.trim()) return;
    await adminRequest(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: name.trim(), nameAr: name.trim(), slug: name.trim().toLowerCase().replace(/\s+/g, "-") }),
    });
    toast({ title: "Category updated" });
    loadAdminData();
  };

  const visibleSuppliers = filtered.suppliers.filter((row) => {
    if (supplierPlanFilter !== "all" && row.supplierPlan !== supplierPlanFilter) return false;
    if (supplierStatusFilter !== "all" && row.subscriptionStatus !== supplierStatusFilter) return false;
    if (supplierFeaturedFilter === "featured" && !row.featuredSupplier) return false;
    if (supplierFeaturedFilter === "standard" && row.featuredSupplier) return false;
    return true;
  });

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-destructive">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p>You do not have permission to view the admin dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  const stats = data.stats;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-muted-foreground">Manage Chemidot marketplace data from one private workspace.</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search admin data..."
              className="w-full md:w-72"
            />
            <Button variant="outline" onClick={loadAdminData} disabled={loading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {loading && !stats ? (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={Users} label="Users" value={stats?.totalUsers ?? 0} />
            <StatCard icon={Building2} label="Suppliers" value={stats?.totalSuppliers ?? 0} />
            <StatCard icon={ShieldAlert} label="Pending" value={stats?.pendingVerifications ?? 0} />
            <StatCard icon={Package} label="Products" value={stats?.totalProducts ?? 0} />
            <StatCard icon={FileText} label="RFQs" value={stats?.totalRfqs ?? 0} />
            <StatCard icon={Layers} label="Collective" value={stats?.activeCollectiveOrders ?? 0} />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders & Fees</TabsTrigger>
            <TabsTrigger value="rfqs">RFQs</TabsTrigger>
            <TabsTrigger value="collective">Collective Orders</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.users.length === 0 ? <EmptyRow colSpan={5} label="No users found." /> : filtered.users.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.companyName || `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Unnamed user"}</div>
                          <div className="text-xs text-muted-foreground">{row.email}</div>
                        </TableCell>
                        <TableCell><StatusBadge value={row.role} /></TableCell>
                        <TableCell><StatusBadge value={row.status} /></TableCell>
                        <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <SmallSelect value={row.role} onChange={(role) => updateUserRole(row.id, role)} options={["buyer", "supplier", "admin"]} />
                            {row.status === "active" ? (
                              <Button variant="outline" size="sm" onClick={() => updateUserStatus(row.id, "suspended")} disabled={row.role === "admin"}>
                                <Ban className="h-3.5 w-3.5" />
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => updateUserStatus(row.id, "active")}>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <CardTitle>Companies & Suppliers</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <SmallSelect value={supplierPlanFilter} onChange={setSupplierPlanFilter} options={["all", "trial", "starter", "growth", "enterprise"]} />
                    <SmallSelect value={supplierStatusFilter} onChange={setSupplierStatusFilter} options={["all", "trial", "active", "past_due", "suspended", "cancelled"]} />
                    <SmallSelect value={supplierFeaturedFilter} onChange={setSupplierFeaturedFilter} options={["all", "featured", "standard"]} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead>Trial End</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSuppliers.length === 0 ? <EmptyRow colSpan={8} label="No suppliers found." /> : visibleSuppliers.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.companyName}</div>
                          <div className="text-xs text-muted-foreground">{row.owner?.email ?? "No owner email"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <StatusBadge value={row.supplierPlan} />
                            <SmallSelect
                              value={row.supplierPlan}
                              onChange={(supplierPlan) => updateSupplierSubscription(row.id, { supplierPlan, action: "assign_plan" }, "Supplier plan updated")}
                              options={["trial", "starter", "growth", "enterprise"]}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <StatusBadge value={row.subscriptionStatus} />
                            <SmallSelect
                              value={row.subscriptionStatus}
                              onChange={(subscriptionStatus) => {
                                if (subscriptionStatus === "cancelled" && !confirm(`Cancel subscription for ${row.companyName}? This will hide the storefront and products.`)) return;
                                if (subscriptionStatus === "suspended" && !confirm(`Suspend ${row.companyName}? This will hide the storefront and products.`)) return;
                                void updateSupplierSubscription(row.id, { subscriptionStatus }, "Subscription status updated");
                              }}
                              options={["trial", "active", "past_due", "suspended", "cancelled"]}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{row.productCount ?? 0}{row.productLimit ? ` / ${row.productLimit}` : ""}</div>
                          <div className="text-xs text-muted-foreground">{row.rfqAccessEnabled ? "RFQ enabled" : "RFQ off"}</div>
                        </TableCell>
                        <TableCell>{row.country}</TableCell>
                        <TableCell><StatusBadge value={!!row.featuredSupplier} /></TableCell>
                        <TableCell>{row.trialEndsAt ? new Date(row.trialEndsAt).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-xs">Storefront: <span className="font-medium">{row.storefrontVisible ? "Public" : "Hidden"}</span></div>
                            <div className="text-xs">Products: <span className="font-medium">{row.productsPublic ? "Public" : "Hidden"}</span></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => updateSupplier(row.id, { verified: !row.verified })}>
                              {row.verified ? "Unverify" : "Verify"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateSupplierSubscription(row.id, { featuredSupplier: !row.featuredSupplier, action: "toggle_featured" }, "Featured supplier updated")}
                            >
                              <Star className="mr-1 h-3.5 w-3.5" />
                              {row.featuredSupplier ? "Unfeature" : "Feature"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const trialEndsAt = prompt("Trial end date (YYYY-MM-DD)", row.trialEndsAt ? row.trialEndsAt.slice(0, 10) : "");
                                if (!trialEndsAt) return;
                                const gracePeriodEndsAt = prompt("Grace period end date (optional, YYYY-MM-DD)", row.gracePeriodEndsAt ? row.gracePeriodEndsAt.slice(0, 10) : "");
                                void updateSupplierSubscription(row.id, {
                                  action: "start_trial",
                                  trialEndsAt: `${trialEndsAt}T00:00:00.000Z`,
                                  gracePeriodEndsAt: gracePeriodEndsAt ? `${gracePeriodEndsAt}T00:00:00.000Z` : null,
                                }, "Trial started");
                              }}
                            >
                              <CreditCard className="mr-1 h-3.5 w-3.5" />
                              Trial
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!confirm(`Suspend ${row.companyName}? This will hide the storefront and unpublish products.`)) return;
                                void updateSupplierSubscription(row.id, { action: "suspend" }, "Supplier suspended");
                              }}
                            >
                              Suspend
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateSupplierSubscription(row.id, { action: "reactivate" }, "Supplier reactivated")}
                            >
                              Reactivate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!confirm(`Hide storefront for ${row.companyName}?`)) return;
                                void updateSupplierSubscription(row.id, { action: row.storefrontVisible ? "hide_storefront" : "show_storefront" }, row.storefrontVisible ? "Storefront hidden" : "Storefront shown");
                              }}
                            >
                              <EyeOff className="mr-1 h-3.5 w-3.5" />
                              {row.storefrontVisible ? "Hide" : "Show"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (row.productsPublic && !confirm(`Unpublish all public products for ${row.companyName}?`)) return;
                                void updateSupplierSubscription(row.id, { action: row.productsPublic ? "unpublish_products" : "publish_products" }, row.productsPublic ? "Products unpublished" : "Products republished");
                              }}
                            >
                              {row.productsPublic ? "Unpublish Products" : "Publish Products"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const internalAdminNotes = prompt("Internal admin notes", row.internalAdminNotes ?? "");
                                if (internalAdminNotes === null) return;
                                void updateSupplierSubscription(row.id, { internalAdminNotes, action: "update_notes" }, "Admin notes updated");
                              }}
                            >
                              Notes
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader><CardTitle>Products</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead>Featured</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.products.length === 0 ? <EmptyRow colSpan={6} label="No products found." /> : filtered.products.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.supplier?.companyName ?? "-"}</TableCell>
                        <TableCell>{row.category?.name ?? "-"}</TableCell>
                        <TableCell><StatusBadge value={row.availability} /></TableCell>
                        <TableCell><StatusBadge value={!!row.featured} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <SmallSelect value={row.availability} onChange={(availability) => updateProduct(row.id, { availability })} options={["in_stock", "limited", "out_of_stock"]} />
                            <Button variant="outline" size="sm" onClick={() => updateProduct(row.id, { featured: !row.featured })}>
                              {row.featured ? "Unfeature" : "Feature"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Orders & Success Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Deal Value</TableHead>
                      <TableHead>Success Fee</TableHead>
                      <TableHead>Fee Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.orders.length === 0 ? <EmptyRow colSpan={7} label="No orders found." /> : filtered.orders.map((row) => {
                      const dealValue = row.dealValue ?? row.totalPrice;
                      const feeAmount = row.successFeeAmount ?? (Number(dealValue) * 0.02).toFixed(2);
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="font-medium">{row.productName || `Order #${row.id}`}</div>
                            <div className="text-xs text-muted-foreground">#{row.id} - {row.quantity} {row.unit} - <StatusBadge value={row.dealStage ?? row.status} /></div>
                            {(row.proformaInvoiceUrl || row.commercialInvoiceUrl) && (
                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                {row.proformaInvoiceUrl && (
                                  <a className="inline-flex items-center gap-1 text-primary hover:underline" href={row.proformaInvoiceUrl} target="_blank" rel="noreferrer">
                                    Proforma <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                                {row.commercialInvoiceUrl && (
                                  <a className="inline-flex items-center gap-1 text-primary hover:underline" href={row.commercialInvoiceUrl} target="_blank" rel="noreferrer">
                                    Commercial <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{row.buyer?.companyName || row.buyer?.email || "-"}</TableCell>
                          <TableCell>{row.supplier?.companyName ?? "-"}</TableCell>
                          <TableCell>{row.dealCurrency ?? row.currency} {Number(dealValue).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="font-medium">{row.dealCurrency ?? row.currency} {Number(feeAmount).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">2% - payer: supplier</div>
                          </TableCell>
                          <TableCell><StatusBadge value={row.successFeeStatus ?? "not started"} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {row.status !== "completed" ? (
                                <>
                                  {(row.dealStage === "supplier_confirmed" || row.dealStage === "admin_needs_review") && (
                                    <>
                                      <Button variant="outline" size="sm" onClick={() => updateOrderDealStage(row, "admin_approved")}>
                                        Approve Deal
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => updateOrderDealStage(row, "admin_needs_review")}>
                                        Needs Review
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={() => updateOrderDealStage(row, "cancelled")}>
                                        Cancel
                                      </Button>
                                    </>
                                  )}
                                  {row.dealStage === "invoice_issued" && (
                                    <SmallSelect
                                      value={row.paymentStatus ?? "pending"}
                                      onChange={(status) => updateOrderPaymentStatus(row, status as "pending" | "confirmed")}
                                      options={["pending", "confirmed"]}
                                    />
                                  )}
                                  {row.paymentStatus === "confirmed" && (
                                    <SmallSelect
                                      value={row.fulfillmentStatus ?? "not_started"}
                                      onChange={(status) => updateOrderFulfillmentStatus(row, status as "preparing" | "ready_for_pickup" | "shipped" | "delivered" | "completed" | "cancelled")}
                                      options={["preparing", "ready_for_pickup", "shipped", "delivered", "completed", "cancelled"]}
                                    />
                                  )}
                                  <Button variant="outline" size="sm" onClick={() => closeOrderDeal(row)}>
                                    Close Deal
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <SmallSelect
                                    value={row.successFeeStatus ?? "pending"}
                                    onChange={(status) => updateSuccessFee(row, status as "pending" | "invoiced" | "paid" | "waived")}
                                    options={["pending", "invoiced", "paid", "waived"]}
                                  />
                                  <Button variant="outline" size="sm" onClick={() => updateSuccessFee(row)}>
                                    Fee Details
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rfqs">
            <Card>
              <CardHeader><CardTitle>RFQs</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RFQ</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.rfqs.length === 0 ? <EmptyRow colSpan={5} label="No RFQs found." /> : filtered.rfqs.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.productName}</TableCell>
                        <TableCell>{row.buyer?.companyName || row.buyer?.email || "-"}</TableCell>
                        <TableCell>{row.quantity} {row.unit}</TableCell>
                        <TableCell><StatusBadge value={row.status} /></TableCell>
                        <TableCell className="text-right">
                          <SmallSelect value={row.status} onChange={(status) => updateStatus(`/api/admin/rfqs/${row.id}/status`, status, "RFQ")} options={["pending", "active", "closed", "awarded"]} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collective">
            <Card>
              <CardHeader><CardTitle>Collective Orders</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.collectiveOrders.length === 0 ? <EmptyRow colSpan={5} label="No collective orders found." /> : filtered.collectiveOrders.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.productName}</TableCell>
                        <TableCell>{row.supplier?.companyName ?? "-"}</TableCell>
                        <TableCell>{row.currentQuantity} / {row.targetQuantity} {row.unit}</TableCell>
                        <TableCell><StatusBadge value={row.status} /></TableCell>
                        <TableCell className="text-right">
                          <SmallSelect value={row.status} onChange={(status) => updateStatus(`/api/admin/collective-orders/${row.id}/status`, status, "Collective order")} options={["open", "closing_soon", "closed", "fulfilled"]} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Categories</CardTitle>
                  <div className="flex gap-2">
                    <Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="New category name" />
                    <Button onClick={createCategory} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.categories.length === 0 ? <EmptyRow colSpan={4} label="No categories found." /> : filtered.categories.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.slug}</TableCell>
                        <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => renameCategory(row)}>
                            <Save className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
