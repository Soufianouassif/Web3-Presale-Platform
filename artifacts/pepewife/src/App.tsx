import { useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import ConnectPage from "@/pages/connect";
import ConnectingPage from "@/pages/connecting";
import Whitepaper from "@/pages/whitepaper";
import RiskDisclaimer from "@/pages/risk-disclaimer";
import Terms from "@/pages/terms";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminBuyers from "@/pages/admin/buyers";
import LoadingPage from "@/components/loading-page";
import { LanguageProvider } from "@/i18n/context";
import { WalletProvider } from "@/contexts/wallet-context";
import { ToastProvider } from "@/components/wallet-toast";

const queryClient = new QueryClient();

function Router() {
  return (
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
      <Route component={NotFound} />
    </Switch>
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
