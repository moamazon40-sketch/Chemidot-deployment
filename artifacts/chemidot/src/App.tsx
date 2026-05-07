import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollToTop } from "@/components/ScrollToTop";
import { PageTransition } from "@/components/PageTransition";

import NotFound from "@/pages/not-found";

const Home = lazy(() => import("@/pages/Home"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const SupplierProfile = lazy(() => import("@/pages/SupplierProfile"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const CollectiveOrders = lazy(() => import("@/pages/CollectiveOrders"));
const CollectiveOrderDetail = lazy(() => import("@/pages/CollectiveOrderDetail"));
const About = lazy(() => import("@/pages/About"));
const ForSuppliers = lazy(() => import("@/pages/ForSuppliers"));
const ForBuyers = lazy(() => import("@/pages/ForBuyers"));
const Contact = lazy(() => import("@/pages/Contact"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const Rfqs = lazy(() => import("@/pages/dashboard/Rfqs"));
const RfqDetail = lazy(() => import("@/pages/dashboard/RfqDetail"));
const Orders = lazy(() => import("@/pages/dashboard/Orders"));
const DashboardCollective = lazy(() => import("@/pages/dashboard/DashboardCollective"));
const Messages = lazy(() => import("@/pages/dashboard/Messages"));
const SupplierProducts = lazy(() => import("@/pages/dashboard/SupplierProducts"));
const AdminDashboard = lazy(() => import("@/pages/dashboard/Admin"));
const ProfileSettings = lazy(() => import("@/pages/dashboard/ProfileSettings"));
const RFQ = lazy(() => import("@/pages/RFQ"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="min-h-screen flex flex-col gap-4 p-8 animate-pulse">
      <Skeleton className="h-16 w-full rounded-none" />
      <div className="mx-auto max-w-7xl px-6 md:px-10 space-y-6 pt-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <PageTransition>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/suppliers/:id" component={SupplierProfile} />
        <Route path="/collective-orders" component={CollectiveOrders} />
        <Route path="/collective-orders/:id" component={CollectiveOrderDetail} />
        <Route path="/about" component={About} />
        <Route path="/for-suppliers" component={ForSuppliers} />
        <Route path="/for-buyers" component={ForBuyers} />
        <Route path="/contact" component={Contact} />
        <Route path="/rfq" component={RFQ} />

        <Route path="/auth/login" component={Login} />
        <Route path="/auth/register" component={Register} />

        <Route path="/dashboard" component={Dashboard} />
        <Route path="/dashboard/rfqs" component={Rfqs} />
        <Route path="/dashboard/rfqs/:id" component={RfqDetail} />
        <Route path="/dashboard/orders" component={Orders} />
        <Route path="/dashboard/collective" component={DashboardCollective} />
        <Route path="/dashboard/messages" component={Messages} />
        <Route path="/dashboard/products" component={SupplierProducts} />
        <Route path="/dashboard/settings" component={ProfileSettings} />

        <Route path="/admin" component={AdminDashboard} />

        <Route component={NotFound} />
      </Switch>
      </PageTransition>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="chemidot-theme">
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ScrollToTop />
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
