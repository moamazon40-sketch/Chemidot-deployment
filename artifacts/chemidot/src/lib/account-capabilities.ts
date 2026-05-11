import type { User } from "@workspace/api-client-react";

export type DashboardMode = "buy" | "sell";

export function userCanBuy(user?: Pick<User, "role" | "canBuy"> | null): boolean {
  if (!user) return false;
  return user.role === "admin" || user.canBuy === true;
}

export function userCanSell(user?: Pick<User, "role" | "canSell"> | null): boolean {
  if (!user) return false;
  return user.role === "admin" || user.canSell === true;
}

export function getPreferredDashboardMode(user?: Pick<User, "role" | "canBuy" | "canSell"> | null, search = ""): DashboardMode {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const requested = params.get("mode");
  if (requested === "sell" && userCanSell(user)) return "sell";
  if (requested === "buy" && userCanBuy(user)) return "buy";
  if (userCanBuy(user)) return "buy";
  return "sell";
}

export function withDashboardMode(path: string, mode: DashboardMode): string {
  const [pathname, hash = ""] = path.split("#");
  const [basePath, queryString = ""] = pathname.split("?");
  const params = new URLSearchParams(queryString);
  params.set("mode", mode);
  const next = `${basePath}?${params.toString()}`;
  return hash ? `${next}#${hash}` : next;
}
