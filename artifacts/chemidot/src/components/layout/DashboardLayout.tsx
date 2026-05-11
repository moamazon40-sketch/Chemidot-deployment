import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  getDashboardOverviewRoute,
  getPreferredDashboardMode,
  getSafeDashboardModeRoute,
  userCanBuy,
  userCanSell,
  withDashboardMode,
  type DashboardMode,
} from "@/lib/account-capabilities";
import {
  LayoutDashboard, Package, FileText, Users, Settings, LogOut,
  MessageSquare, Store, ShoppingCart, User, ArrowLeftRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useListNotifications } from "@workspace/api-client-react";
import { useListConversations } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import logoImage from "@assets/Copy_of_Untitled_Design_(1)_1777886080670.png";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildNavGroups(user: any, mode: DashboardMode, t: Record<string, any>, unreadCount: number, rfqUnreadCount: number, orderUnreadCount: number): NavGroup[] {
  const sellPath = (path: string) => withDashboardMode(path, "sell");
  const buyPath = (path: string) => withDashboardMode(path, "buy");

  if (user.role === "admin") {
    return [
      {
        title: "Management",
        items: [
          { href: "/dashboard", label: t.overview, icon: LayoutDashboard },
          { href: "/admin", label: t.adminPanel, icon: Settings },
          { href: "/dashboard/messages", label: t.messages, icon: MessageSquare, badge: unreadCount },
        ],
      },
      {
        title: "Account",
        items: [
          { href: "/dashboard/settings", label: t.profileSettings, icon: User },
        ],
      },
    ];
  }

  if (mode === "buy") {
    return [
      {
        title: "Sourcing",
        items: [
          { href: buyPath("/dashboard"), label: t.overview, icon: LayoutDashboard },
          { href: "/marketplace", label: t.marketplace, icon: Store },
          { href: buyPath("/dashboard/rfqs"), label: t.rfqsQuotes, icon: FileText, badge: rfqUnreadCount },
          { href: buyPath("/dashboard/orders"), label: t.orders, icon: Package, badge: orderUnreadCount },
          { href: buyPath("/dashboard/collective"), label: t.collectiveOrdersSidebar, icon: Users },
        ],
      },
      {
        title: "Account",
        items: [
          { href: buyPath("/dashboard/messages"), label: t.messages, icon: MessageSquare, badge: unreadCount },
          { href: buyPath("/dashboard/settings"), label: t.profileSettings, icon: User },
        ],
      },
    ];
  }

  if (mode === "sell") {
    return [
      {
        title: "Sales",
        items: [
          { href: sellPath("/dashboard"), label: t.overview, icon: LayoutDashboard },
          { href: sellPath("/dashboard/products"), label: t.myProducts, icon: Store },
          { href: sellPath("/dashboard/rfqs"), label: t.rfqsQuotes, icon: FileText, badge: rfqUnreadCount },
          { href: sellPath("/dashboard/orders"), label: t.orders, icon: ShoppingCart, badge: orderUnreadCount },
        ],
      },
      {
        title: "Account",
        items: [
          { href: sellPath("/dashboard/messages"), label: t.messages, icon: MessageSquare, badge: unreadCount },
          { href: sellPath("/dashboard/settings"), label: t.profileSettings, icon: User },
        ],
      },
    ];
  }

  return [];
}

function AppSidebar({ groups, mode }: { groups: NavGroup[]; mode: DashboardMode }) {
  const { state } = useSidebar();
  const [location] = useLocation();
  const search = useSearch();
  const { logout, user } = useAuth();
  const isCollapsed = state === "collapsed";
  const dualMode = userCanBuy(user) && userCanSell(user) && user?.role !== "admin";
  const buySwitchHref = getSafeDashboardModeRoute(location, search, "buy", user);
  const sellSwitchHref = getSafeDashboardModeRoute(location, search, "sell", user);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className={cn("flex items-center gap-2 py-1", isCollapsed ? "justify-center px-0" : "px-2")}>
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src={logoImage} alt="Chemidot" className="h-7 w-7 object-contain shrink-0" />
            {!isCollapsed && (
              <span className="font-bold text-base tracking-tight">Chemidot</span>
            )}
          </Link>
        </div>
        {!isCollapsed && user && (
          <div className="px-2 pb-2 pt-1">
            <p className="text-xs font-medium truncate text-sidebar-foreground">{user.companyName}</p>
            <p className="text-[11px] text-sidebar-foreground/50 capitalize">
              {dualMode ? `${mode === "buy" ? "Buying" : "Selling"} view` : user.role}
            </p>
            {dualMode && (
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/40 p-1">
                <Link
                  href={buySwitchHref}
                  className={cn(
                    "rounded-md px-2 py-1 text-center text-[11px] font-medium",
                    mode === "buy" ? "bg-background text-foreground shadow-sm" : "text-sidebar-foreground/70"
                  )}
                >
                  Buying
                </Link>
                <Link
                  href={sellSwitchHref}
                  className={cn(
                    "rounded-md px-2 py-1 text-center text-[11px] font-medium",
                    mode === "sell" ? "bg-background text-foreground shadow-sm" : "text-sidebar-foreground/70"
                  )}
                >
                  Selling
                </Link>
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = location === item.href ||
                    (item.href !== "/dashboard" && item.href !== "/" && location.startsWith(item.href));
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link href={item.href} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge && item.badge > 0 ? (
                            <span className="ml-auto min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                              {item.badge > 9 ? "9+" : item.badge}
                            </span>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Log out"
              onClick={() => logout()}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function TopNav() {
  const { user, logout } = useAuth();
  const search = useSearch();
  const [location] = useLocation();

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  const mode = getPreferredDashboardMode(user, search);
  const dualMode = userCanBuy(user) && userCanSell(user) && user?.role !== "admin";
  const switchTarget = getSafeDashboardModeRoute(location, search, mode === "buy" ? "sell" : "buy", user);
  const roleLabel = user?.role === "admin"
    ? "Admin"
    : dualMode
      ? mode === "buy" ? "Buying" : "Selling"
      : userCanSell(user) ? "Supplier" : "Buyer";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        <div className="h-4 w-px bg-border hidden sm:block" />
        <p className="text-sm font-medium hidden sm:block">
          Hello, {user?.firstName ?? "there"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {dualMode && (
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex gap-1.5">
            <Link href={switchTarget}>
              <ArrowLeftRight className="h-3.5 w-3.5" />
              {mode === "buy" ? "Switch to Selling" : "Switch to Buying"}
            </Link>
          </Button>
        )}
        {roleLabel && (
          <Badge variant="outline" className="hidden sm:flex capitalize text-xs">
            {roleLabel}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                {roleLabel && (
                  <p className="text-xs text-primary font-medium">{roleLabel}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={user?.role === "admin" ? "/dashboard/settings" : getSafeDashboardModeRoute("/dashboard/settings", "", mode, user)} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const search = useSearch();
  const { t } = useLanguage();
  const mode = getPreferredDashboardMode(user, search);
  const { data: notifs } = useListNotifications(
    { unreadOnly: true },
    { query: { enabled: !!user } as any }
  );
  const { data: conversations } = useListConversations({
    query: { enabled: !!user && user.role !== "admin" } as any,
  });
  const messageUnreadCount = conversations?.reduce((total: number, convo: any) => total + (Number(convo.unreadCount) || 0), 0) ?? 0;
  const unreadCount = messageUnreadCount;
  const rfqUnreadCount = notifs?.filter((n: any) => n.relatedType === "rfq").length ?? 0;
  const orderUnreadCount = notifs?.filter((n: any) => n.relatedType === "order").length ?? 0;
  const fallbackMode = getPreferredDashboardMode(user, search);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center space-y-4">
          <Link href="/" className="inline-flex items-center justify-center gap-2 font-bold text-lg">
            <img src={logoImage} alt="Chemidot" className="h-9 w-9 object-contain" />
            Chemidot
          </Link>
          <div className="rounded-lg border bg-card p-6 shadow-sm space-y-3">
            <h1 className="text-xl font-semibold">Login required</h1>
            <p className="text-sm text-muted-foreground">
              Please log in with an authorized account to open this page.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button asChild>
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Go home</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "admin" && !userCanBuy(user) && !userCanSell(user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center space-y-4">
          <Link href="/" className="inline-flex items-center justify-center gap-2 font-bold text-lg">
            <img src={logoImage} alt="Chemidot" className="h-9 w-9 object-contain" />
            Chemidot
          </Link>
          <div className="rounded-lg border bg-card p-6 shadow-sm space-y-3">
            <h1 className="text-xl font-semibold">Dashboard unavailable</h1>
            <p className="text-sm text-muted-foreground">
              This account does not currently have buying or selling access.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button asChild>
                <Link href="/">Go home</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groups = buildNavGroups(user, fallbackMode, t, unreadCount, rfqUnreadCount, orderUnreadCount);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar groups={groups} mode={fallbackMode} />
      <SidebarInset className="flex flex-col min-h-screen min-w-0">
        <TopNav />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
