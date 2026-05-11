import type { User } from "@workspace/api-client-react";

export type DashboardMode = "buy" | "sell";
const SHARED_DASHBOARD_PATHS = new Set([
  "/dashboard",
  "/dashboard/rfqs",
  "/dashboard/orders",
  "/dashboard/messages",
  "/dashboard/settings",
]);
const BUY_ONLY_DASHBOARD_PATHS = new Set([
  "/dashboard/collective",
]);
const SELL_ONLY_DASHBOARD_PATHS = new Set([
  "/dashboard/products",
]);

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

export function getDashboardOverviewRoute(mode: DashboardMode): string {
  return withDashboardMode("/dashboard", mode);
}

export function withDashboardMode(path: string, mode: DashboardMode): string {
  const [pathname, hash = ""] = path.split("#");
  const [basePath, queryString = ""] = pathname.split("?");
  const params = new URLSearchParams(queryString);
  params.set("mode", mode);
  const next = `${basePath}?${params.toString()}`;
  return hash ? `${next}#${hash}` : next;
}

function isKnownDashboardPath(pathname: string): boolean {
  return SHARED_DASHBOARD_PATHS.has(pathname)
    || BUY_ONLY_DASHBOARD_PATHS.has(pathname)
    || SELL_ONLY_DASHBOARD_PATHS.has(pathname);
}

function isPathAllowedForMode(pathname: string, mode: DashboardMode): boolean {
  if (SHARED_DASHBOARD_PATHS.has(pathname)) return true;
  if (mode === "buy") return BUY_ONLY_DASHBOARD_PATHS.has(pathname);
  return SELL_ONLY_DASHBOARD_PATHS.has(pathname);
}

export function getSafeDashboardModeRoute(
  currentPath: string,
  currentSearch: string,
  targetMode: DashboardMode,
  user?: Pick<User, "role" | "canBuy" | "canSell"> | null,
): string {
  if (user?.role === "admin") return "/admin";

  const normalizedPath = currentPath.startsWith("/dashboard") ? currentPath : "/dashboard";
  const preferredMode = getPreferredDashboardMode(user, currentSearch);
  const targetAllowed = targetMode === "buy" ? userCanBuy(user) : userCanSell(user);
  const safeTargetMode = targetAllowed ? targetMode : preferredMode;

  if (!isKnownDashboardPath(normalizedPath)) {
    return getDashboardOverviewRoute(safeTargetMode);
  }

  if (!isPathAllowedForMode(normalizedPath, safeTargetMode)) {
    return getDashboardOverviewRoute(safeTargetMode);
  }

  return withDashboardMode(normalizedPath + currentSearch, safeTargetMode);
}
