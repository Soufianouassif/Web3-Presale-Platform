import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Shield, Wifi, ChevronRight } from "lucide-react";
import { useLanguage } from "@/i18n/context";
import LanguageSwitcher from "@/components/language-switcher";

const wallets = [
  {
    id: "phantom",
    name: "Phantom",
    descKey: "phantomDesc" as const,
    color: "#AB47BC",
    shadow: "#7B1FA2",
    bg: "bg-[#F3E5F5]",
    iconSrc: "/wallet-phantom.png",
    url: "https://phantom.app",
  },
  {
    id: "metamask",
    name: "MetaMask",
    descKey: "metamaskDesc" as const,
    color: "#E2761B",
    shadow: "#C65D0A",
    bg: "bg-[#FFF3E0]",
    iconSrc: "/wallet-metamask.png",
    url: "https://metamask.io",
  },
  {
    id: "binance",
    name: "Binance Wallet",
    descKey: "binanceDesc" as const,
    color: "#F0B90B",
    shadow: "#C99A00",
    bg: "bg-[#FFFDE7]",
    iconSrc: "/wallet-binance.png",
    url: "https://www.binance.com/en/web3wallet",
  },
  {
    id: "trust",
    name: "Trust Wallet",
    descKey: "trustDesc" as const,
    color: "#3375BB",
    shadow: "#1A5A9E",
    bg: "bg-[#E3F2FD]",
    iconSrc: "/wallet-trust.svg",
    url: "https://trustwallet.com",
  },
];

export default function ConnectPage() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const handleConnect = (walletId: string) => {
    setConnecting(walletId);
    setTimeout(() => {
      setConnecting(null);
      navigate("/connecting");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F5E9] via-[#FCE4EC] to-[#FFFDE7] relative overflow-hidden">
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
          <div className="text-center mb-8">
            <img src="/logo.png" alt="PEPEWIFE" className="w-16 h-16 mx-auto mb-4 rounded-full border-3 border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e]" />
            <div className="sticker bg-[#4CAF50] text-white text-sm inline-block mb-3" style={{ transform: "rotate(-2deg)" }}>{t.connect.step1}</div>
            <h1 className="text-4xl sm:text-5xl font-display text-[#1a1a2e] tracking-wider comic-shadow">
              {t.connect.title}
            </h1>
            <p className="text-[#1a1a2e]/60 font-bold mt-2 max-w-sm mx-auto">
              {t.connect.subtitle}
            </p>
          </div>

          <div className="meme-card bg-white/90 backdrop-blur rounded-3xl overflow-hidden">
            <div className="zigzag-border" />
            <div className="p-5 sm:p-6 space-y-3">
              {wallets.map((w) => (
                <button
                  key={w.id}
                  disabled={connecting !== null}
                  aria-label={`Connect with ${w.name}`}
                  onClick={() => handleConnect(w.id)}
                  onMouseEnter={() => setHovered(w.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(w.id)}
                  onBlur={() => setHovered(null)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-3 transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    connecting === w.id
                      ? `${w.bg} scale-[0.98]`
                      : hovered === w.id
                      ? `${w.bg} translate-x-[-2px] translate-y-[-2px]`
                      : "bg-white border-[#1a1a2e]/10 shadow-[2px_2px_0px_#1a1a2e20] hover:shadow-[4px_4px_0px_#1a1a2e30]"
                  }`}
                  style={{
                    ...(connecting === w.id || hovered === w.id
                      ? { borderColor: w.color, boxShadow: `4px 4px 0px ${w.shadow}`, ["--tw-ring-color" as string]: w.color }
                      : {}),
                  }}
                >
                  <div className={`shrink-0 rounded-xl overflow-hidden transition-transform duration-200 ${hovered === w.id ? "scale-110 rotate-[-3deg]" : ""}`}>
                    <img src={w.iconSrc} alt={w.name} className="w-10 h-10 rounded-xl" />
                  </div>
                  <div className="flex-1 text-start">
                    <div className="font-display text-lg text-[#1a1a2e] tracking-wider flex items-center gap-2">
                      {w.name}
                      {w.id === "phantom" && (
                        <span className="sticker bg-[#4CAF50] text-white text-[10px] px-2 py-0.5" style={{ transform: "rotate(-1deg)" }}>{t.connect.recommended}</span>
                      )}
                    </div>
                    <div className="text-xs text-[#1a1a2e]/50 font-bold">{t.connect[w.descKey]}</div>
                  </div>
                  <div className="shrink-0">
                    {connecting === w.id ? (
                      <div role="status" aria-label="Connecting">
                        <div className="w-6 h-6 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: w.color, borderTopColor: "transparent" }} />
                      </div>
                    ) : (
                      <ChevronRight className="h-5 w-5 text-[#1a1a2e]/30 group-hover:text-[#1a1a2e]/60 transition-colors" />
                    )}
                  </div>
                </button>
              ))}
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
                <Shield className="h-3 w-3" /> {t.connect.secureConnection}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
