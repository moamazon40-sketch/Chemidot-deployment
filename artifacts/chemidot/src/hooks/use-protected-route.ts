import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

type Options = {
  requiredRole?: "buyer" | "supplier" | "admin";
  redirectTo?: string;
};

export function useProtectedRoute(options: Options = {}) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { requiredRole, redirectTo = "/auth/login" } = options;

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

  return { user, isLoading };
}
