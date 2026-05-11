import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardOverviewRoute, getPreferredDashboardMode, userCanBuy, userCanSell } from "@/lib/account-capabilities";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "buyer" | "supplier" | "admin";
  requiredCapability?: "buy" | "sell";
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredCapability,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const safeDashboardFallback = user ? getDashboardOverviewRoute(getPreferredDashboardMode(user, window.location.search)) : "/dashboard";

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate(redirectTo);
      return;
    }
    if (requiredRole && user.role !== requiredRole && user.role !== "admin") {
      navigate(safeDashboardFallback);
      return;
    }
    if (requiredCapability === "buy" && !userCanBuy(user)) {
      navigate(safeDashboardFallback);
      return;
    }
    if (requiredCapability === "sell" && !userCanSell(user)) {
      navigate(safeDashboardFallback);
    }
  }, [user, isLoading, requiredRole, requiredCapability, redirectTo, navigate, safeDashboardFallback]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col gap-4 p-8">
        <Skeleton className="h-14 w-full" />
        <div className="flex gap-4 flex-1">
          <Skeleton className="w-60 h-full rounded-xl" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;
  if (requiredRole && user.role !== requiredRole && user.role !== "admin") return null;
  if (requiredCapability === "buy" && !userCanBuy(user)) return null;
  if (requiredCapability === "sell" && !userCanSell(user)) return null;

  return <>{children}</>;
}
