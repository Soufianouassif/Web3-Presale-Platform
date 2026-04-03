import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Shield, Wifi, ChevronRight, Download, CheckCircle, X } from "lucide-react";
import { useLanguage } from "@/i18n/context";
import { useWallet } from "@/contexts/wallet-context";
import { useToast, mapErrorToCode, getWalletLabel } from "@/components/wallet-toast";
import LanguageSwitcher from "@/components/language-switcher";
import SEOHead from "@/components/seo-head";
import { getInstallUrl, type WalletType } from "@/lib/wallet";

const wallets: {
  id: WalletType;
  name: string;
  descKey: "phantomDesc" | "solflareDesc" | "metamaskDesc" | "okxDesc" | "trustDesc";
  color: string;
  shadow: string;
  bg: string;
  iconSrc: string;
  network: "solana" | "ethereum";
}[] = [
  {
    id: "phantom",
    name: "Phantom",
    descKey: "phantomDesc",
    color: "#AB47BC",
    shadow: "#7B1FA2",
    bg: "bg-[#F3E5F5]",
    iconSrc: "/wallet-phantom.png",
    network: "solana",
  },
  {
    id: "solflare",
    name: "Solflare",
    descKey: "solflareDesc",
    color: "#FC6E21",
    shadow: "#C94F0A",
    bg: "bg-[#FFF3E0]",
    iconSrc: "/wallet-solflare.svg",
    network: "solana",
  },
  {
    id: "metamask",
    name: "MetaMask",
    descKey: "metamaskDesc",
    color: "#E2761B",
    shadow: "#C65D0A",
    bg: "bg-[#FFF3E0]",
    iconSrc: "/wallet-metamask.png",
    network: "ethereum",
  },
  {
    id: "okx",
    name: "OKX Wallet",
    descKey: "okxDesc",
    color: "#000000",
    shadow: "#333333",
    bg: "bg-[#F5F5F5]",
    iconSrc: "/wallet-okx.svg",
    network: "ethereum",
  },
  {
    id: "trust",
    name: "Trust Wallet",
    descKey: "trustDesc",
    color: "#3375BB",
    shadow: "#1A5A9E",
    bg: "bg-[#E3F2FD]",
    iconSrc: "/wallet-trust.svg",
    network: "ethereum",
  },
];

export default function ConnectPage() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { status, walletType: connectedWallet, shortAddress, address, error, installedWallets, connect, disconnect, refreshDetection } = useWallet();
  const { showWalletError, showSuccess } = useToast();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    refreshDetection();
  }, [refreshDetection]);

  useEffect(() => {
    if (error && error !== lastError) {
      setLastError(error);
      const code = mapErrorToCode(error);
      const walletName = connectingId ? getWalletLabel(connectingId as WalletType) : undefined;
      showWalletError(code, walletName);
      setConnectingId(null);
    }
  }, [error, lastError, connectingId, showWalletError]);

  useEffect(() => {
    if (status === "connected" && connectingId) {
      const walletName = getWalletLabel(connectingId as WalletType);
      showSuccess("CONNECTED", walletName);
      navigate("/connecting");
    }
  }, [status, connectingId, navigate, showSuccess]);

  const handleConnect = async (walletId: WalletType) => {
    if (status === "connected" && connectedWallet === walletId) {
      // If coming from a buy intent, continue through the animation to home
      if (sessionStorage.getItem("pendingPurchase")) {
        setConnectingId(walletId);
        navigate("/connecting");
      } else {
        navigate("/dashboard");
      }
      return;
    }

    const isInstalled = installedWallets[walletId];
    if (!isInstalled) {
      showWalletError("NOT_INSTALLED", getWalletLabel(walletId));
      window.open(getInstallUrl(walletId), "_blank", "noopener,noreferrer");
      return;
    }

    setLastError(null);
    setConnectingId(walletId);
    const success = await connect(walletId);
    if (!success) {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    showSuccess("DISCONNECTED");
    setConnectingId(null);
    setLastError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F5E9] via-[#FCE4EC] to-[#FFFDE7] relative overflow-hidden">
      <SEOHead
        title="Connect Wallet – PEPEWIFE Presale"
        description="Connect your wallet to participate in the PEPEWIFE presale. Supports Phantom, Solflare, MetaMask, OKX Wallet, and Trust Wallet."
        path="/connect"
        noindex
      />
      <div className="absolute inset-0 pattern-dots opacity-30 pointer-events-none" />
      <div aria-hidden="true" className="absolute top-10 left-10 text-6xl opacity-20 animate-bounce" style={{ animationDuration: "3s" }}>🐸</div>
      <div aria-hidden="true" className="absolute top-20 right-16 text-5xl opacity-20 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>👛</div>
      <div aria-hidden="true" className="absolute bottom-20 left-20 text-5xl opacity-20 animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}>💎</div>
      <div aria-hidden="true" className="absolute bottom-10 right-10 text-6xl opacity-20 animate-bounce" style={{ animationDuration: "4.5s", animationDelay: "2s" }}>🚀</div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-10">
        <div className="absolute top-5 start-5 sm:top-8 sm:start-8 flex items-center gap-2">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 font-display text-[#1a1a2e] tracking-wider bg-white/80 backdrop-blur rounded-xl px-4 py-2 border-2 border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e] hover:shadow-[4px_4px_0px_#1a1a2e] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> {t.connect.back}
          </button>
        </div>

        <div className="absolute top-5 end-5 sm:top-8 sm:end-8">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-lg">
          {status === "connected" && address && (
            <div className="mb-4 meme-card bg-[#4CAF50]/10 rounded-2xl p-4 border-[#4CAF50]/30 backdrop-blur">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[#4CAF50] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-display text-[#4CAF50] tracking-wider">{t.connect.connectedAs}</div>
                  <div className="text-sm font-mono text-[#1a1a2e]/70 truncate">{shortAddress}</div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="shrink-0 text-xs font-display text-red-500 hover:text-red-700 tracking-wider px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-all"
                >
                  {t.connect.disconnect}
                </button>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <img src="/logo.png" alt="PEPEWIFE" className="w-16 h-16 mx-auto mb-4 rounded-full border-3 border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e]" />
            <div className="sticker bg-[#4CAF50] text-white text-sm inline-block mb-3" style={{ transform: "rotate(-2deg)" }}>{t.connect.step1}</div>
            <h1 className="text-4xl sm:text-5xl font-display text-[#1a1a2e] tracking-wider comic-shadow">
              {status === "connected" ? t.connect.switchWallet : t.connect.title}
            </h1>
            <p className="text-[#1a1a2e]/60 font-bold mt-2 max-w-sm mx-auto">
              {t.connect.subtitle}
            </p>
          </div>

          <div className="meme-card bg-white/90 backdrop-blur rounded-3xl overflow-hidden">
            <div className="zigzag-border" />
            <div className="p-5 sm:p-6 space-y-3">
              {wallets.map((w) => {
                const isInstalled = installedWallets[w.id];
                const isConnecting = connectingId === w.id && status === "connecting";
                const isThisConnected = status === "connected" && connectedWallet === w.id;
                const networkLabel = w.network === "solana" ? t.connect.networkSolana : t.connect.networkEthereum;

                return (
                  <button
                    key={w.id}
                    disabled={isConnecting || (connectingId !== null && connectingId !== w.id)}
                    aria-label={`Connect with ${w.name}`}
                    onClick={() => handleConnect(w.id)}
                    onMouseEnter={() => setHovered(w.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(w.id)}
                    onBlur={() => setHovered(null)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-3 transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                      isThisConnected
                        ? `${w.bg} border-[#4CAF50]`
                        : isConnecting
                        ? `${w.bg} scale-[0.98]`
                        : hovered === w.id
                        ? `${w.bg} translate-x-[-2px] translate-y-[-2px]`
                        : "bg-white border-[#1a1a2e]/10 shadow-[2px_2px_0px_#1a1a2e20] hover:shadow-[4px_4px_0px_#1a1a2e30]"
                    }`}
                    style={{
                      ...(isThisConnected
                        ? { borderColor: "#4CAF50", boxShadow: "4px 4px 0px #2E7D32" }
                        : isConnecting || hovered === w.id
                        ? { borderColor: w.color, boxShadow: `4px 4px 0px ${w.shadow}`, ["--tw-ring-color" as string]: w.color }
                        : {}),
                    }}
                  >
                    <div className={`shrink-0 rounded-xl overflow-hidden transition-transform duration-200 ${hovered === w.id ? "scale-110 rotate-[-3deg]" : ""}`}>
                      <img src={w.iconSrc} alt={w.name} className="w-10 h-10 rounded-xl" />
                    </div>
                    <div className="flex-1 text-start min-w-0">
                      <div className="font-display text-lg text-[#1a1a2e] tracking-wider flex items-center gap-2 flex-wrap">
                        {w.name}
                        {w.id === "phantom" && !isThisConnected && (
                          <span className="sticker bg-[#4CAF50] text-white text-[10px] px-2 py-0.5" style={{ transform: "rotate(-1deg)" }}>{t.connect.recommended}</span>
                        )}
                        {isThisConnected && (
                          <span className="sticker bg-[#4CAF50] text-white text-[10px] px-2 py-0.5" style={{ transform: "rotate(-1deg)" }}>{t.connect.connectedWallet}</span>
                        )}
                      </div>
                      <div className="text-xs text-[#1a1a2e]/50 font-bold flex items-center gap-2 flex-wrap">
                        <span>{t.connect[w.descKey]}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a1a2e]/5">{networkLabel}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-center gap-1">
                      {isConnecting ? (
                        <div role="status" aria-label="Connecting">
                          <div className="w-6 h-6 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: w.color, borderTopColor: "transparent" }} />
                        </div>
                      ) : isThisConnected ? (
                        <CheckCircle className="h-5 w-5 text-[#4CAF50]" />
                      ) : !isInstalled ? (
                        <Download className="h-5 w-5 text-[#FF4D9D]" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-[#1a1a2e]/30 group-hover:text-[#1a1a2e]/60 transition-colors" />
                      )}
                      {!isConnecting && !isThisConnected && (
                        <span className={`text-[9px] font-display tracking-wider ${isInstalled ? "text-[#4CAF50]" : "text-[#FF4D9D]"}`}>
                          {isInstalled ? t.connect.installed : t.connect.install}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
              <div className="meme-card bg-[#FFFDE7] rounded-2xl p-4 border-[#FFD54F] shadow-[3px_3px_0px_#F9A825]">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-[#b8860b] mt-0.5 shrink-0" />
                  <div>
                    <div className="font-display text-sm text-[#b8860b] tracking-wider mb-1">{t.connect.safuTitle}</div>
                    <p className="text-xs text-[#1a1a2e]/50 font-bold leading-relaxed">
                      {t.connect.safuText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center space-y-3">
            <p className="text-xs text-[#1a1a2e]/40 font-bold">
              {t.connect.noWallet} <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-[#AB47BC] font-display tracking-wide hover:underline inline-flex items-center gap-1">{t.connect.getPhantom} <ExternalLink className="h-3 w-3" /></a>
            </p>

            <div className="flex items-center justify-center gap-4 text-[#1a1a2e]/30">
              <div className="flex items-center gap-1 text-xs font-bold">
                <Wifi className="h-3 w-3" /> {t.connect.solanaMainnet}
              </div>
              <div className="w-1 h-1 rounded-full bg-[#1a1a2e]/20" />
              <div className="flex items-center gap-1 text-xs font-bold">
                <Wifi className="h-3 w-3" /> {t.connect.ethMainnet}
              </div>
              <div className="w-1 h-1 rounded-full bg-[#1a1a2e]/20" />
              <div className="flex items-center gap-1 text-xs font-bold">
                <Shield className="h-3 w-3" /> {t.connect.secureConnection}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
