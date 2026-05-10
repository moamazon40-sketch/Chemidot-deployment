import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Search, Menu, Bell, Languages, ChevronDown,
  ShoppingCart, Store, Users, Info, Mail, FileText
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { MotionCTAButton } from "@/components/MotionCTAButton";
import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useListNotifications, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { useLocation as useWouterLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getStoredToken } from "@/lib/storage";
import { useQueryClient } from "@tanstack/react-query";
import logoImage from "@assets/Copy_of_Untitled_Design_(1)_1777886080670.png";

function NotificationsBell() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, navigate] = useWouterLocation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: notifications, refetch } = useListNotifications({ unreadOnly: true });
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications?.length ?? 0;

  const handleMarkAll = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      },
    });
  };

  const fallbackHref = () => (user?.role === "admin" ? "/admin" : "/dashboard");

  const notificationHref = (n: any) => {
    if (n.targetUrl) return n.targetUrl;
    if (n.relatedType === "rfq" && n.relatedId) {
      return user?.role === "admin" ? "/admin?tab=rfqs" : `/dashboard/rfqs/${n.relatedId}`;
    }
    if (n.relatedType === "order" && n.relatedId) {
      return user?.role === "admin" ? "/admin?tab=orders" : `/dashboard/orders?orderId=${n.relatedId}`;
    }
    if (n.relatedType === "message") return "/dashboard/messages";
    return fallbackHref();
  };

  const handleNotificationClick = async (n: any) => {
    const target = notificationHref(n);
    setOpen(false);
    if (!n.isRead) {
      try {
        await fetch(`/api/notifications/${n.id}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getStoredToken() ?? ""}` },
        });
        await refetch();
        await queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      } catch {
        // Navigation should still happen even if the read marker fails.
      }
    }
    navigate(target || fallbackHref());
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>{t.notifications}</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={handleMarkAll}>
              {t.markAllRead}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!notifications || notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t.noNotifications}
          </div>
        ) : (
          notifications.slice(0, 8).map((n: any) => (
            <DropdownMenuItem
              key={n.id}
              onSelect={(event) => {
                event.preventDefault();
                void handleNotificationClick(n);
              }}
              className={cn(
                "flex flex-col items-start gap-0.5 py-2.5 cursor-pointer",
                !n.isRead && "bg-primary/5"
              )}
            >
                <span className="font-medium text-sm">{n.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      className="gap-1.5 font-medium text-xs px-2"
      title={lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
    >
      <Languages className="h-4 w-4" />
      {lang === "en" ? "عربي" : "EN"}
    </Button>
  );
}

/* Flyout nav dropdown */
type FlyoutItem = { label: string; href: string; icon: React.ElementType; desc: string };
function FlyoutDropdown({ label, items }: { label: string; items: FlyoutItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(true);
  };

  const scheduleClose = () => {
    closeTimerRef.current = setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <div ref={ref} className="relative" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        type="button"
        className={cn(
          "flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1",
          open && "text-foreground"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(o => !o)}
        onFocus={openMenu}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 pt-2">
          <div className="absolute left-0 top-0 h-3 w-full" />
          <div className="w-72 bg-background border rounded-2xl shadow-xl p-2 overflow-hidden">
          {items.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors mt-0.5">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-snug">{item.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{item.desc}</p>
                </div>
              </div>
            </Link>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SOLUTIONS_ITEMS: FlyoutItem[] = [
  { label: "Request a Quote", href: "/rfq",               icon: FileText,     desc: "Submit an RFQ and get quotes from verified suppliers" },
  { label: "For Buyers",      href: "/for-buyers",        icon: ShoppingCart, desc: "Source chemicals smarter, faster, and cheaper" },
  { label: "For Suppliers",   href: "/for-suppliers",     icon: Store,        desc: "Grow your sales across the Gulf region" },
  { label: "Collective Orders", href: "/collective-orders", icon: Users,      desc: "Pool demand and unlock bulk pricing tiers" },
];

const COMPANY_ITEMS: FlyoutItem[] = [
  { label: "About Us",   href: "/about",   icon: Info,     desc: "Our mission, values, and Vision 2030 alignment" },
  { label: "Contact Us", href: "/contact", icon: Mail,     desc: "Get in touch with our team in Riyadh" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useWouterLocation();
  const [searchVal, setSearchVal] = useState("");
  const [location] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/marketplace?search=${encodeURIComponent(searchVal.trim())}`);
  };

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium transition-colors hover:text-foreground",
        location === href ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-6 md:px-10 flex h-16 items-center justify-between">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <img src={logoImage} alt="Chemidot" className="h-8 w-8 object-contain" />
            <span className="hidden font-bold sm:inline-block text-lg">Chemidot</span>
          </Link>
          <nav className="hidden md:flex items-center gap-5">
            {navLink("/marketplace", t.marketplace)}
            {navLink("/suppliers", t.suppliers)}
            <FlyoutDropdown label="Solutions" items={SOLUTIONS_ITEMS} />
            <FlyoutDropdown label="Company"   items={COMPANY_ITEMS} />
          </nav>
        </div>

        {/* Center: search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 items-center justify-center px-6 max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t.searchPlaceholder}
              className="w-full bg-muted/50 pl-9 border-transparent focus-visible:ring-primary/20 focus-visible:border-primary"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
            />
          </div>
        </form>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <LangToggle />
          <ModeToggle />
          {user ? (
            <div className="hidden md:flex items-center gap-1">
              <NotificationsBell />
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors px-2">
                {t.dashboard}
              </Link>
              <Button variant="ghost" size="sm" onClick={() => logout()}>{t.logout}</Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/auth/login" className="text-sm font-medium hover:text-primary transition-colors">
                {t.login}
              </Link>
              <MotionCTAButton href="/auth/register" size="sm">
                {t.signUp}
              </MotionCTAButton>
            </div>
          )}

          {/* Mobile sheet */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-6 py-6">
                <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center space-x-2">
                  <img src={logoImage} alt="Chemidot" className="h-8 w-8 object-contain" />
                  <span className="font-bold text-lg">Chemidot</span>
                </Link>

                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Marketplace</p>
                  {[
                    { href: "/marketplace",      label: t.marketplace },
                    { href: "/suppliers",         label: t.suppliers },
                    { href: "/collective-orders", label: t.collectiveOrders },
                  ].map(l => (
                    <Link key={l.href} href={l.href} onClick={() => setIsOpen(false)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-2 rounded-lg hover:bg-muted transition-colors">
                      {l.label}
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Solutions</p>
                  {[
                    { href: "/rfq",               label: "Request a Quote" },
                    { href: "/for-buyers",        label: "For Buyers" },
                    { href: "/for-suppliers",     label: "For Suppliers" },
                  ].map(l => (
                    <Link key={l.href} href={l.href} onClick={() => setIsOpen(false)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-2 rounded-lg hover:bg-muted transition-colors">
                      {l.label}
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">Company</p>
                  {[
                    { href: "/about",   label: "About Us" },
                    { href: "/contact", label: "Contact Us" },
                  ].map(l => (
                    <Link key={l.href} href={l.href} onClick={() => setIsOpen(false)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-2 rounded-lg hover:bg-muted transition-colors">
                      {l.label}
                    </Link>
                  ))}
                </div>

                <div className="pt-2 border-t flex flex-col gap-2">
                  {user ? (
                    <>
                      <Link href="/dashboard" onClick={() => setIsOpen(false)}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-2 rounded-lg hover:bg-muted transition-colors">
                        {t.dashboard}
                      </Link>
                      <Button variant="ghost" className="justify-start px-2" onClick={() => { logout(); setIsOpen(false); }}>{t.logout}</Button>
                    </>
                  ) : (
                    <>
                      <Link href="/auth/login" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full">{t.login}</Button>
                      </Link>
                      <MotionCTAButton href="/auth/register" className="w-full" onClick={() => setIsOpen(false)}>
                        {t.signUp}
                      </MotionCTAButton>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
