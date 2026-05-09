import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetAdminStats,
  useAdminListUsers,
  useAdminUpdateUserStatus,
  useAdminVerifySupplier,
  UserRole,
} from "@workspace/api-client-react";
import {
  Users, Building2, Package, DollarSign, ShieldCheck, ShieldAlert,
  CheckCircle2, Ban, ArrowUpDown, MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

type UserRow = {
  id: number;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);

  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { enabled: isAdmin },
  });
  const { data: usersData, isLoading: usersLoading, refetch } = useAdminListUsers(
    { role: roleFilter, limit: 200 },
    { query: { enabled: isAdmin } }
  );

  const updateStatusMutation = useAdminUpdateUserStatus();
  const verifyMutation = useAdminVerifySupplier();

  const handleUpdateStatus = (id: number, status: "active" | "suspended") => {
    updateStatusMutation.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: `User status updated to ${status}` });
          refetch();
        },
      }
    );
  };

  const handleVerify = (id: number) => {
    verifyMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Supplier verified successfully" });
        refetch();
      },
    });
  };

  const tableData: UserRow[] = useMemo(
    () =>
      (usersData?.users ?? []).map((u) => ({
        id: u.id,
        companyName: u.companyName ?? "",
        firstName: u.firstName ?? "",
        lastName: u.lastName ?? "",
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })),
    [usersData]
  );

  const columns: ColumnDef<UserRow>[] = useMemo(
    () => [
      {
        accessorKey: "companyName",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Company <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.companyName}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.firstName} {row.original.lastName}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Email <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">{row.getValue("email")}</span>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Role <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">{row.getValue("role")}</Badge>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Status <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const status = row.getValue<string>("status");
          return (
            <Badge
              className={
                status === "active"
                  ? "bg-green-100 text-green-800 hover:bg-green-100 border-none"
                  : status === "suspended"
                  ? "bg-red-100 text-red-800 hover:bg-red-100 border-none"
                  : "bg-amber-100 text-amber-800 hover:bg-amber-100 border-none"
              }
            >
              {status === "pending_verification" ? "Pending" : status}
            </Badge>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Joined <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {new Date(row.getValue("createdAt")).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {u.role === "supplier" && u.status === "pending_verification" && (
                  <DropdownMenuItem
                    className="text-green-600 focus:text-green-600"
                    onClick={() => handleVerify(u.id)}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" /> Verify Supplier
                  </DropdownMenuItem>
                )}
                {u.status === "active" && u.role !== "admin" && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleUpdateStatus(u.id, "suspended")}
                  >
                    <Ban className="mr-2 h-4 w-4" /> Suspend
                  </DropdownMenuItem>
                )}
                {u.status === "suspended" && (
                  <DropdownMenuItem
                    className="text-green-600 focus:text-green-600"
                    onClick={() => handleUpdateStatus(u.id, "active")}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [usersData]
  );

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-muted-foreground">Platform overview and user management.</p>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified Suppliers</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
                {stats.pendingVerifications > 0 && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    {stats.pendingVerifications} pending verification
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform GMV</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(stats.totalRevenue / 1_000_000).toFixed(1)}M</div>
                <p className="text-xs text-muted-foreground mt-1">Gross merchandise value</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
                <p className="text-xs text-muted-foreground mt-1">Active listings</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle>User Management</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {usersData?.users.length ?? 0} users total
                </p>
              </div>
              <Tabs
                value={roleFilter || "all"}
                onValueChange={(v) => setRoleFilter(v === "all" ? undefined : (v as UserRole))}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="buyer">Buyers</TabsTrigger>
                  <TabsTrigger value="supplier">Suppliers</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {usersLoading ? (
              <div className="py-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={tableData}
                searchKey="email"
                searchPlaceholder="Search by email..."
                pageSize={10}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
