import { lazy, Suspense, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/context";
import { WalletProvider } from "@/contexts/wallet-context";
import { ToastProvider } from "@/components/wallet-toast";
import LoadingPage from "@/components/loading-page";

import Home from "@/pages/home";
import ConnectPage from "@/pages/connect";
import ConnectingPage from "@/pages/connecting";
import Dashboard from "@/pages/dashboard";

const NotFound = lazy(() => import("@/pages/not-found"));
const Whitepaper = lazy(() => import("@/pages/whitepaper"));
const RiskDisclaimer = lazy(() => import("@/pages/risk-disclaimer"));
const Terms = lazy(() => import("@/pages/terms"));
const AdminLogin = lazy(() => import("@/pages/admin/login"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminBuyers = lazy(() => import("@/pages/admin/buyers"));
const AdminReferrals = lazy(() => import("@/pages/admin/referrals"));
const AdminSessions = lazy(() => import("@/pages/admin/sessions"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
      <div className="w-8 h-8 border-4 border-[#FF4D9D] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/connect" component={ConnectPage} />
        <Route path="/connecting" component={ConnectingPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/whitepaper" component={Whitepaper} />
        <Route path="/risk-disclaimer" component={RiskDisclaimer} />
        <Route path="/terms" component={Terms} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/buyers" component={AdminBuyers} />
        <Route path="/admin/referrals" component={AdminReferrals} />
        <Route path="/admin/sessions" component={AdminSessions} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");
  const [loading, setLoading] = useState(!isAdmin);

  if (isAdmin) return <>{children}</>;

  return (
    <>
      {loading && <LoadingPage onComplete={() => setLoading(false)} />}
      {children}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <WalletProvider>
          <ToastProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AdminRouteGuard>
                  <Router />
                </AdminRouteGuard>
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </ToastProvider>
        </WalletProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
