import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "buyer" | "supplier" | "admin";
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate(redirectTo);
      return;
    }
    if (requiredRole && user.role !== requiredRole && user.role !== "admin") {
      navigate("/dashboard");
    }
  }, [user, isLoading, requiredRole, redirectTo, navigate]);

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

  return <>{children}</>;
}
