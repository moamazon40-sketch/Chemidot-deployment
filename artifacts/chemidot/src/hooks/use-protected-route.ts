import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { userCanBuy, userCanSell } from "@/lib/account-capabilities";

type Options = {
  requiredRole?: "buyer" | "supplier" | "admin";
  requiredCapability?: "buy" | "sell";
  redirectTo?: string;
};

export function useProtectedRoute(options: Options = {}) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { requiredRole, requiredCapability, redirectTo = "/auth/login" } = options;

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate(redirectTo);
      return;
    }
    if (requiredRole && user.role !== requiredRole && user.role !== "admin") {
      navigate("/dashboard");
      return;
    }
    if (requiredCapability === "buy" && !userCanBuy(user)) {
      navigate("/dashboard");
      return;
    }
    if (requiredCapability === "sell" && !userCanSell(user)) {
      navigate("/dashboard");
    }
  }, [user, isLoading, requiredRole, requiredCapability, redirectTo, navigate]);

  return { user, isLoading };
}
