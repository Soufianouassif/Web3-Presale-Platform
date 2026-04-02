import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Shield, Wifi, ChevronRight } from "lucide-react";

const wallets = [
  {
    id: "phantom",
    name: "Phantom",
    desc: "The friendly Solana wallet",
    color: "#AB47BC",
    shadow: "#7B1FA2",
    bg: "bg-[#F3E5F5]",
    icon: (
      <svg viewBox="0 0 128 128" className="w-10 h-10">
        <defs><linearGradient id="phantom-g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#534BB1"/><stop offset="100%" stopColor="#551BF9"/></linearGradient></defs>
        <rect width="128" height="128" rx="26" fill="url(#phantom-g)"/>
        <path d="M110.5 64.2c0-25.4-20.6-46-46-46S18.5 38.8 18.5 64.2c0 .7 0 1.3.1 2 1.2-22.3 19.6-40 42-40 23.3 0 42.2 19.3 42 43.2 0 7.2-3.5 13.5-8.8 17.5h10.6c3.9-5.5 6.1-12.2 6.1-19.5v-3.2z" fill="white" opacity=".9"/>
        <circle cx="44" cy="62" r="6" fill="white"/>
        <circle cx="72" cy="62" r="6" fill="white"/>
      </svg>
    ),
    url: "https://phantom.app",
  },
  {
    id: "metamask",
    name: "MetaMask",
    desc: "The crypto wallet for DeFi",
    color: "#E2761B",
    shadow: "#C65D0A",
    bg: "bg-[#FFF3E0]",
    icon: (
      <svg viewBox="0 0 128 128" className="w-10 h-10">
        <rect width="128" height="128" rx="26" fill="#F6851B"/>
        <path d="M100 38L72 50l5 12 23-24z" fill="#E4761B" stroke="#E4761B"/>
        <path d="M28 38l28 12-5 12L28 38z" fill="#E4761B" stroke="#E4761B"/>
        <path d="M88 78l-8 18 17 5 5-17H88z" fill="#E4761B" stroke="#E4761B"/>
        <path d="M26 84l5 17 17-5-8-18H26z" fill="#E4761B" stroke="#E4761B"/>
        <path d="M49 58l-5 10 22 1-1-23-16 12z" fill="#E4761B" stroke="#E4761B"/>
        <path d="M79 58l-16-12-1 23 22-1-5-10z" fill="#E4761B" stroke="#E4761B"/>
        <path d="M48 96l13-7-11-8-2 15z" fill="#E4761B" stroke="#E4761B"/>
        <path d="M67 89l13 7-2-15-11 8z" fill="#E4761B" stroke="#E4761B"/>
        <path d="M44 68l22 1 22-1-5-10H49l-5 10z" fill="white" opacity=".3"/>
      </svg>
    ),
    url: "https://metamask.io",
  },
  {
    id: "binance",
    name: "Binance Wallet",
    desc: "Binance Chain wallet",
    color: "#F0B90B",
    shadow: "#C99A00",
    bg: "bg-[#FFFDE7]",
    icon: (
      <svg viewBox="0 0 128 128" className="w-10 h-10">
        <rect width="128" height="128" rx="26" fill="#F0B90B"/>
        <path d="M64 28L50 42l14 14 14-14L64 28zM36 50L22 64l14 14 14-14L36 50zM92 50L78 64l14 14 14-14L92 50zM64 72L50 86l14 14 14-14L64 72z" fill="white"/>
      </svg>
    ),
    url: "https://www.binance.com/en/web3wallet",
  },
  {
    id: "trust",
    name: "Trust Wallet",
    desc: "The most trusted wallet",
    color: "#3375BB",
    shadow: "#1A5A9E",
    bg: "bg-[#E3F2FD]",
    icon: (
      <svg viewBox="0 0 128 128" className="w-10 h-10">
        <rect width="128" height="128" rx="26" fill="#3375BB"/>
        <path d="M64 30c-18 14-30 14-30 14s2 36 30 54c28-18 30-54 30-54s-12 0-30-14z" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M64 30c-18 14-30 14-30 14s2 36 30 54V30z" fill="#E8F0FE"/>
      </svg>
    ),
    url: "https://trustwallet.com",
  },
];

export default function ConnectPage() {
  const [, navigate] = useLocation();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const handleConnect = (walletId: string) => {
    setConnecting(walletId);
    setTimeout(() => {
      setConnecting(null);
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8F5E9] via-[#FCE4EC] to-[#FFFDE7] relative overflow-hidden">
      <div className="absolute inset-0 pattern-dots opacity-30 pointer-events-none" />
      <div aria-hidden="true" className="absolute top-10 left-10 text-6xl opacity-20 animate-bounce" style={{ animationDuration: "3s" }}>🐸</div>
      <div aria-hidden="true" className="absolute top-20 right-16 text-5xl opacity-20 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>👛</div>
      <div aria-hidden="true" className="absolute bottom-20 left-20 text-5xl opacity-20 animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}>💎</div>
      <div aria-hidden="true" className="absolute bottom-10 right-10 text-6xl opacity-20 animate-bounce" style={{ animationDuration: "4.5s", animationDelay: "2s" }}>🚀</div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-10">
        <button
          onClick={() => navigate("/")}
          className="absolute top-5 left-5 sm:top-8 sm:left-8 flex items-center gap-2 font-display text-[#1a1a2e] tracking-wider bg-white/80 backdrop-blur rounded-xl px-4 py-2 border-2 border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e] hover:shadow-[4px_4px_0px_#1a1a2e] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> BACK
        </button>

        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="PEPEWIFE" className="w-16 h-16 mx-auto mb-4 rounded-full border-3 border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e]" />
            <div className="sticker bg-[#4CAF50] text-white text-sm inline-block mb-3" style={{ transform: "rotate(-2deg)" }}>🔌 STEP 1</div>
            <h1 className="text-4xl sm:text-5xl font-display text-[#1a1a2e] tracking-wider comic-shadow">
              Connect Wallet 👛
            </h1>
            <p className="text-[#1a1a2e]/60 font-bold mt-2 max-w-sm mx-auto">
              Choose your weapon ser. Pick a wallet to enter the PEPEWIFE presale. LFG! 🚀
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
                    {w.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-display text-lg text-[#1a1a2e] tracking-wider flex items-center gap-2">
                      {w.name}
                      {w.id === "phantom" && (
                        <span className="sticker bg-[#4CAF50] text-white text-[10px] px-2 py-0.5" style={{ transform: "rotate(-1deg)" }}>RECOMMENDED</span>
                      )}
                    </div>
                    <div className="text-xs text-[#1a1a2e]/50 font-bold">{w.desc}</div>
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
                    <div className="font-display text-sm text-[#b8860b] tracking-wider mb-1">SAFU ZONE 🛡️</div>
                    <p className="text-xs text-[#1a1a2e]/50 font-bold leading-relaxed">
                      We never access your private keys or seed phrase. This connection only allows viewing your public address. NFA. DYOR.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center space-y-3">
            <p className="text-xs text-[#1a1a2e]/40 font-bold">
              Don't have a wallet? <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-[#AB47BC] font-display tracking-wide hover:underline inline-flex items-center gap-1">Get Phantom <ExternalLink className="h-3 w-3" /></a>
            </p>

            <div className="flex items-center justify-center gap-4 text-[#1a1a2e]/30">
              <div className="flex items-center gap-1 text-xs font-bold">
                <Wifi className="h-3 w-3" /> Solana Mainnet
              </div>
              <div className="w-1 h-1 rounded-full bg-[#1a1a2e]/20" />
              <div className="flex items-center gap-1 text-xs font-bold">
                <Shield className="h-3 w-3" /> Secure Connection
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
