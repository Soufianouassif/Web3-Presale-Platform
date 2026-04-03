import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [loading, setLoading] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <WalletProvider>
          <ToastProvider>
          <TooltipProvider>
            {loading && <LoadingPage onComplete={() => setLoading(false)} />}
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
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
