import React, { useState, useEffect } from "react";
import { Menu, X, Twitter, Send, Wallet, Copy, Check, ChevronDown, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiSolana, SiTether, SiEthereum } from "react-icons/si";
import { useLocation } from "wouter";
import { useLanguage } from "@/i18n/context";
import LanguageSwitcher from "@/components/language-switcher";
import SEOHead from "@/components/seo-head";
import { useWallet } from "@/contexts/wallet-context";
import { useToast } from "@/components/wallet-toast";
import WalletBuyModal from "@/components/wallet-buy-modal";
import { fetchPresaleState, type PresaleState } from "@/lib/presale-contract";

export default function Dashboard() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currency, setCurrency] = useState<"SOL" | "USDT_SPL" | "USDT_ETH">("SOL");
  const [buyAmount, setBuyAmount] = useState("");
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showEthModal, setShowEthModal] = useState(false);
  const [copiedEth, setCopiedEth] = useState(false);
  const [dashTxSig, setDashTxSig] = useState<string | null>(null);
  const [presaleData, setPresaleData] = useState<PresaleState | null>(null);
  const [solPrice, setSolPrice] = useState<number>(150);
  const [ethPrice, setEthPrice] = useState<number>(3000);
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<Date | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const { t, dir } = useLanguage();
  const isRTL = dir === "rtl";
  const { status, shortAddress, address, network, disconnect } = useWallet();
  const { showSuccess } = useToast();
  const [walletCopied, setWalletCopied] = useState(false);

  const walletAddress = shortAddress || "7xKp...4mNr";
  const fullWallet = address || "7xKp4mNrQ9vB...kL2xNw";
  const [, navigate] = useLocation();

  useEffect(() => {
    if (status === "disconnected" || status === "error") {
      navigate("/connect");
    }
  }, [status, navigate]);

  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // ── Price feed ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPricesLoading(true);
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum&vs_currencies=usd");
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (!cancelled) {
          if (d?.solana?.usd)  setSolPrice(d.solana.usd);
          if (d?.ethereum?.usd) setEthPrice(d.ethereum.usd);
          setPricesUpdatedAt(new Date());
        }
      } catch { /* keep fallback */ } finally { if (!cancelled) setPricesLoading(false); }
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // ── Presale state ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPresaleState().then(s => { if (s) setPresaleData(s); }).catch(() => {});
  }, []);

  // ── Buy box constants & computations ────────────────────────────────────────
  const LIMITS = {
    SOL:      { min: 1,    max: 50 },
    USDT_SPL: { min: 100,  max: 10000 },
    USDT_ETH: { min: 100,  max: 10000 },
  };
  const currSym = currency === "SOL" ? "SOL" : "USDT";
  const lim = LIMITS[currency];

  const errMsg = (tpl: string, val: number) =>
    tpl.replace("{0}", val.toString()).replace("{1}", currSym);

  const amountNum = parseFloat(buyAmount);
  const amountError =
    buyAmount !== "" && !/^\d+(\.\d*)?$/.test(buyAmount)
      ? t.presale.errorInvalid
      : buyAmount !== "" && !isNaN(amountNum) && amountNum < lim.min
      ? errMsg(t.presale.errorTooLow, lim.min)
      : buyAmount !== "" && !isNaN(amountNum) && amountNum > lim.max
      ? errMsg(t.presale.errorTooHigh, lim.max)
      : "";

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/[^0-9.]/.test(val)) return;
    if ((val.match(/\./g) || []).length > 1) return;
    setBuyAmount(val);
  };

  const ETH_WALLET = "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97";
  const copyEthAddress = () => {
    navigator.clipboard.writeText(ETH_WALLET).then(() => {
      setCopiedEth(true);
      setTimeout(() => setCopiedEth(false), 2000);
    });
  };

  const fmt = (n: number) => {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9)  return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6)  return (n / 1e6).toFixed(2) + "M";
    return n.toLocaleString();
  };

  const P = ({ v, className = "", style }: { v: string; className?: string; style?: React.CSSProperties }) => {
    const num = parseFloat(v.replace("$", ""));
    if (isNaN(num) || num >= 0.001) return <span className={className} style={style}>{v}</span>;
    const afterDot = num.toFixed(20).split(".")[1];
    let zeros = 0;
    for (const ch of afterDot) { if (ch !== "0") break; zeros++; }
    const sig = afterDot.slice(zeros).replace(/0+$/, "");
    return (
      <span className={className} style={style}>
        $0.0<sup style={{ fontSize: "0.65em", lineHeight: 1 }}>{zeros}</sup>{sig}
      </span>
    );
  };

  const STAGE_PRICES_STATIC = ["$0.00000001", "$0.00000002", "$0.00000004", "$0.00000006"];
  const STAGE_COLORS = ["#4CAF50", "#FF4D9D", "#FFD54F", "#42A5F5"];
  const STAGE_DATA = STAGE_PRICES_STATIC.map((price, i) => ({
    stage: i + 1,
    price,
    tokens: 5_000_000_000_000,
    sold: presaleData ? Number(presaleData.stages[i].tokensSold) : (i === 0 ? 15_000_000_000 : 0),
    color: STAGE_COLORS[i],
  }));
  const LISTING_PRICE = "$0.061327";
  const currentStage = presaleData ? presaleData.currentStage : 0;
  const totalSold = STAGE_DATA.reduce((a, s) => a + s.sold, 0);
  const totalTokens = STAGE_DATA.reduce((a, s) => a + s.tokens, 0);
  const presaleFilled = Math.round((totalSold / totalTokens) * 100);

  const stagePrice = parseFloat(STAGE_DATA[currentStage].price.replace("$", ""));
  const amountUSD = !isNaN(amountNum) && buyAmount !== ""
    ? currency === "SOL" ? amountNum * solPrice
    : currency === "USDT_ETH" ? amountNum * ethPrice
    : amountNum
    : 0;
  const tokensOut = stagePrice > 0 && amountUSD > 0 ? Math.floor(amountUSD / stagePrice) : 0;

  type StageStatus = "active" | "sold-out" | "upcoming";
  const presaleStages: Array<{ stage: number; name: string; price: string; tokens: string; sold: number; total: string; status: StageStatus; color: string; shadow: string; emoji: string }> = [
    { stage: 1, name: t.dashboard.earlyBird, price: STAGE_DATA[0].price, tokens: fmt(STAGE_DATA[0].tokens), sold: STAGE_DATA[0].sold, total: "$0", status: currentStage === 0 ? "active" : currentStage > 0 ? "sold-out" : "upcoming", color: "#4CAF50", shadow: "#2E7D32", emoji: currentStage > 0 ? "✅" : currentStage === 0 ? "🔥" : "🔒" },
    { stage: 2, name: t.dashboard.community, price: STAGE_DATA[1].price, tokens: fmt(STAGE_DATA[1].tokens), sold: STAGE_DATA[1].sold, total: "$0", status: currentStage === 1 ? "active" : currentStage > 1 ? "sold-out" : "upcoming", color: "#FF4D9D", shadow: "#C2185B", emoji: currentStage > 1 ? "✅" : currentStage === 1 ? "🔥" : "🔒" },
    { stage: 3, name: t.dashboard.growth, price: STAGE_DATA[2].price, tokens: fmt(STAGE_DATA[2].tokens), sold: STAGE_DATA[2].sold, total: "$0", status: currentStage === 2 ? "active" : currentStage > 2 ? "sold-out" : "upcoming", color: "#42A5F5", shadow: "#1565C0", emoji: currentStage > 2 ? "✅" : currentStage === 2 ? "🔥" : "🔒" },
    { stage: 4, name: t.dashboard.final, price: STAGE_DATA[3].price, tokens: fmt(STAGE_DATA[3].tokens), sold: STAGE_DATA[3].sold, total: "$0", status: currentStage === 3 ? "active" : currentStage > 3 ? "sold-out" : "upcoming", color: "#AB47BC", shadow: "#7B1FA2", emoji: currentStage > 3 ? "✅" : currentStage === 3 ? "🔥" : "🔒" },
  ];

  const tabs = [
    { id: "overview", label: t.dashboard.overview, icon: "📊" },
    { id: "purchases", label: t.dashboard.myPurchases, icon: "🛒" },
    { id: "claim", label: t.dashboard.claim, icon: "🎁" },
    { id: "referrals", label: t.dashboard.referrals, icon: "🤝" },
    { id: "transactions", label: t.dashboard.transactions, icon: "📜" },
  ];

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: "linear-gradient(180deg, #FFFDE7 0%, #E8F5E9 30%, #FFF9C4 60%, #F3E5F5 100%)", backgroundAttachment: "fixed" }}>
      <SEOHead
        title="Investor Dashboard – PEPEWIFE Presale"
        description="Track your PEPEWIFE presale investment, referral rewards, and token allocation. View presale stages and claim your $PWIFE tokens."
        path="/dashboard"
        noindex
      />

      <nav className="fixed top-0 w-full z-50 border-b-4 border-[#1a1a2e]" style={{ background: "linear-gradient(90deg, #FFFDE7, #E8F5E9)" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-4 lg:gap-8">
              <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer wiggle-hover shrink-0" onClick={() => navigate("/")}>
                <img src="/logo.png" alt="PEPEWIFE" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#1a1a2e] shrink-0" />
                <span className="font-display text-xl sm:text-2xl text-[#1a1a2e] tracking-wide whitespace-nowrap" style={{ textShadow: isRTL ? "-2px 2px 0px #FFD54F" : "2px 2px 0px #FFD54F" }}>PEPEWIFE</span>
                <span className="hidden sm:inline-block bg-[#FF4D9D] text-white text-[10px] font-display px-2 py-0.5 rounded-full border-2 border-[#1a1a2e] whitespace-nowrap" style={{ transform: "rotate(3deg)" }}>$PWIFE</span>
              </div>
              <div className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-5">
                <button onClick={() => navigate("/")} className="flex items-center gap-1 font-display text-base text-[#1a1a2e] hover:text-[#FF4D9D] transition-colors tracking-wide wiggle-hover whitespace-nowrap">
                  <span>🏠</span> <span>{t.nav.home}</span>
                </button>
                <span className="font-display text-base text-[#FF4D9D] tracking-wide whitespace-nowrap border-b-2 border-[#FF4D9D]">
                  📊 {t.nav.dashboard}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <div className="relative">
                <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-1.5 bg-[#4CAF50]/10 border-2 border-[#4CAF50] text-[#4CAF50] rounded-xl px-3 h-9 font-display text-sm tracking-wide whitespace-nowrap shadow-[2px_2px_0px_#2E7D32]">
                  <Wallet className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{walletAddress}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showDropdown && (
                  <div className="absolute end-0 top-full mt-2 w-72 meme-card bg-white rounded-xl p-3 space-y-2 z-50">
                    <div className="text-xs font-display text-[#1a1a2e]/40 tracking-wider">{t.nav.wallet}</div>
                    <div className="bg-[#FFFDE7] rounded-lg px-3 py-2 border border-[#FFD54F]">
                      <div className="font-mono text-xs text-[#1a1a2e] truncate mb-1.5">{walletAddress}</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (address) {
                              navigator.clipboard.writeText(address);
                              setWalletCopied(true);
                              setTimeout(() => setWalletCopied(false), 2000);
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] font-display tracking-wider text-[#42A5F5] hover:text-[#1565C0] transition-colors"
                        >
                          {walletCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {walletCopied ? t.nav.copied : t.nav.copyAddress}
                        </button>
                        <span className="text-[#1a1a2e]/10">|</span>
                        <a
                          href={network === "solana"
                            ? `https://solscan.io/account/${address}`
                            : `https://etherscan.io/address/${address}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-display tracking-wider text-[#AB47BC] hover:text-[#7B1FA2] transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t.nav.viewExplorer}
                        </a>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]" />
                        <span className="text-[9px] font-display tracking-wider text-[#1a1a2e]/40">
                          {network === "solana" ? "Solana Mainnet" : "Ethereum Mainnet"}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => navigate("/")} className="w-full text-start text-sm font-display text-[#1a1a2e] hover:text-[#FF4D9D] tracking-wide py-1">🏠 {t.nav.backToHome}</button>
                    <button onClick={async () => { await disconnect(); showSuccess("DISCONNECTED"); navigate("/"); }} className="w-full text-start text-sm font-display text-red-500 tracking-wide py-1">🔌 {t.nav.disconnect}</button>
                  </div>
                )}
              </div>
              <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-9 w-9">
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden border-t-3 border-[#1a1a2e]" style={{ background: "#FFFDE7" }}>
            <div className="px-4 pt-2 pb-4 space-y-2 flex flex-col">
              <button onClick={() => navigate("/")} className="flex items-center gap-2 text-start py-2 font-display text-lg text-[#1a1a2e] tracking-wide">
                <span>🏠</span> <span>{t.nav.home}</span>
              </button>
              {tabs.map(tb => (
                <button key={tb.id} onClick={() => { setActiveTab(tb.id); setIsMenuOpen(false); }} className={`flex items-center gap-2 text-start py-2 font-display text-lg tracking-wide ${activeTab === tb.id ? "text-[#FF4D9D]" : "text-[#1a1a2e]"}`}>
                  <span>{tb.icon}</span> <span>{tb.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="pt-20 sm:pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="sticker bg-[#4CAF50] text-white mb-4 text-sm inline-block" style={{ transform: "rotate(-1deg)" }}>{t.dashboard.connected}</div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-2">{t.dashboard.title}</h1>
            <p className="text-lg text-[#1a1a2e]/60 font-bold">{t.dashboard.subtitle}</p>
          </div>

          <div className="flex gap-6">
            <div className="hidden lg:block w-56 shrink-0">
              <div className="meme-card bg-white rounded-2xl p-3 sticky top-24 space-y-1">
                {tabs.map(tb => (
                  <button key={tb.id} onClick={() => setActiveTab(tb.id)} className={`flex items-center gap-2 w-full text-start px-3 py-2.5 rounded-xl font-display text-base tracking-wide transition-all ${activeTab === tb.id ? "bg-[#4CAF50]/10 text-[#4CAF50] border-2 border-[#4CAF50] shadow-[2px_2px_0px_#2E7D32]" : "text-[#1a1a2e] hover:bg-[#FFFDE7] border-2 border-transparent"}`}>
                    <span>{tb.icon}</span> <span>{tb.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="lg:hidden mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {tabs.map(tb => (
                    <button key={tb.id} onClick={() => setActiveTab(tb.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-display text-sm tracking-wide whitespace-nowrap border-2 transition-all shrink-0 ${activeTab === tb.id ? "bg-[#4CAF50] text-white border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e]" : "bg-white text-[#1a1a2e] border-[#1a1a2e]/20 hover:border-[#1a1a2e]"}`}>
                      <span>{tb.icon}</span> <span>{tb.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: t.dashboard.tokensPurchased, value: "0", sub: "PWIFE", color: "#4CAF50", shadow: "#2E7D32", bg: "bg-[#E8F5E9]" },
                      { label: t.dashboard.claimableTokens, value: "0", sub: "PWIFE", color: "#FF4D9D", shadow: "#C2185B", bg: "bg-[#FCE4EC]" },
                      { label: t.dashboard.referralRewards, value: "0", sub: "PWIFE", color: "#AB47BC", shadow: "#7B1FA2", bg: "bg-[#F3E5F5]" },
                      { label: t.dashboard.currentStage, value: "—", sub: t.dashboard.notStarted, color: "#42A5F5", shadow: "#1565C0", bg: "bg-[#E3F2FD]" },
                      { label: t.dashboard.totalInvested, value: "$0.00", sub: "0 SOL", color: "#b8860b", shadow: "#8B6914", bg: "bg-[#FFFDE7]" },
                      { label: t.dashboard.bonusEarned, value: "0%", sub: "—", color: "#4CAF50", shadow: "#2E7D32", bg: "bg-[#E8F5E9]" },
                    ].map(card => (
                      <div key={card.label} className={`meme-card ${card.bg} rounded-2xl p-4 sm:p-5`} style={{ borderColor: card.color, boxShadow: `${isRTL ? "-4px" : "4px"} 4px 0px ${card.shadow}` }}>
                        <div className="text-xs font-display tracking-wider mb-1" style={{ color: card.color }}>{card.label}</div>
                        <div className="text-2xl sm:text-3xl font-display text-[#1a1a2e] tracking-wider">{card.value}</div>
                        <div className="text-xs text-[#1a1a2e]/40 font-bold">{card.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="meme-card bg-white rounded-3xl overflow-hidden">
                      <div className="zigzag-border" />
                      <div className="p-5 sm:p-6 space-y-5">
                        <div className="text-center">
                          <div className="sticker bg-[#FFD54F] text-[#1a1a2e] text-sm inline-block mb-2" style={{ transform: "rotate(-1deg)" }}>{t.dashboard.presaleComingSoon}</div>
                          <h3 className="text-2xl sm:text-3xl font-display text-[#1a1a2e] tracking-wider comic-shadow">{t.dashboard.buyPwife}</h3>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-[#4CAF50] font-display tracking-wide">🐸 {t.presale.sold}</span>
                            <span className="text-[#1a1a2e]/60 font-display tracking-wide">{presaleFilled}% — Stage {currentStage + 1}/4</span>
                          </div>
                          <div className="flex gap-1 h-5 rounded-full overflow-hidden border-2 border-[#1a1a2e]">
                            {STAGE_DATA.map((s, i) => {
                              const pct = Math.min(100, Math.round((s.sold / s.tokens) * 100));
                              return (
                                <div key={i} className="relative flex-1 bg-gray-100">
                                  <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: s.color, opacity: i === currentStage ? 1 : 0.4 }} />
                                  {i < 3 && <div className="absolute right-0 top-0 h-full w-px bg-[#1a1a2e]/30" />}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex gap-1">
                            {STAGE_DATA.map((s, i) => (
                              <div key={i} className={`flex-1 text-center rounded-lg py-1 border ${i === currentStage ? "border-[#1a1a2e] bg-[#FFFDE7]" : "border-transparent"}`}>
                                <div className="text-[9px] font-display tracking-wide text-[#1a1a2e]/50">S{s.stage}</div>
                                <P v={s.price} className="text-[9px] font-display font-bold" style={{ color: s.color }} />
                              </div>
                            ))}
                          </div>
                          <div className="text-center text-[10px] font-display text-[#1a1a2e]/40 tracking-wider">
                            {fmt(totalSold)} / {fmt(totalTokens)} PWIFE
                          </div>
                        </div>

                        {/* Stage prices */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { l: t.presale.now,  v: STAGE_DATA[0].price, sub: "Stage 1", bg: "bg-[#4CAF50]/10", bc: "border-[#4CAF50]", tc: "text-[#4CAF50]" },
                            { l: t.presale.next, v: STAGE_DATA[1].price, sub: "Stage 2", bg: "bg-[#FF4D9D]/10", bc: "border-[#FF4D9D]", tc: "text-[#FF4D9D]" },
                            { l: t.presale.list, v: LISTING_PRICE,        sub: "CEX",    bg: "bg-[#FFD54F]/20", bc: "border-[#FFD54F]", tc: "text-[#b8860b]" },
                          ].map(p => (
                            <div key={p.l} className={`${p.bg} border-2 ${p.bc} rounded-xl p-2.5 text-center`}>
                              <div className="text-[10px] font-display tracking-wider text-[#1a1a2e]/50">{p.l}</div>
                              <P v={p.v} className={`text-[11px] font-display ${p.tc} tracking-wider font-bold`} />
                              <div className="text-[9px] font-display text-[#1a1a2e]/40 tracking-wide">{p.sub}</div>
                            </div>
                          ))}
                        </div>

                        {/* Live price ticker */}
                        <div className="bg-[#1a1a2e]/4 border border-[#1a1a2e]/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <SiSolana size={12} className="text-[#14F195]" />
                              <span className="font-display text-[11px] text-[#1a1a2e] tracking-wide">
                                ${solPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <SiEthereum size={12} className="text-[#627EEA]" />
                              <span className="font-display text-[11px] text-[#1a1a2e] tracking-wide">
                                ${ethPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <SiTether size={11} className="text-[#26A17B]" />
                              <span className="font-display text-[11px] text-[#26A17B] tracking-wide">$1.00</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {pricesLoading
                              ? <span className="text-[9px] text-[#1a1a2e]/30 font-bold">⏳</span>
                              : <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4CAF50] opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-[#4CAF50]"></span></span>
                            }
                            <span className="text-[9px] text-[#1a1a2e]/30 font-bold">
                              {pricesUpdatedAt
                                ? pricesUpdatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "..."}
                            </span>
                          </div>
                        </div>

                        {/* Currency selector */}
                        <div>
                          <p className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-2">{t.presale.payWith}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => { setCurrency("SOL"); setBuyAmount(""); }}
                              className={`flex flex-col items-center justify-center rounded-xl h-11 font-display tracking-wide border-2 transition-all ${currency === "SOL" ? "bg-[#14F195]/15 border-[#14F195] text-[#0a9060] shadow-[3px_3px_0px_#0a9060]" : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                              <div className="flex items-center gap-1 text-sm"><SiSolana size={13} /> SOL</div>
                              <div className="text-[8px] font-bold opacity-60">Solana</div>
                            </button>
                            <button onClick={() => { setCurrency("USDT_SPL"); setBuyAmount(""); }}
                              className={`flex flex-col items-center justify-center rounded-xl h-11 font-display tracking-wide border-2 transition-all ${currency === "USDT_SPL" ? "bg-[#26A17B]/15 border-[#26A17B] text-[#1a7a5e] shadow-[3px_3px_0px_#1a7a5e]" : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                              <div className="flex items-center gap-1 text-sm"><SiTether size={13} /> USDT</div>
                              <div className="text-[8px] font-bold opacity-60">SPL · SOL</div>
                            </button>
                            <button onClick={() => { setCurrency("USDT_ETH"); setBuyAmount(""); setShowEthModal(true); }}
                              className={`flex flex-col items-center justify-center rounded-xl h-11 font-display tracking-wide border-2 transition-all ${currency === "USDT_ETH" ? "bg-[#627EEA]/15 border-[#627EEA] text-[#3d56c9] shadow-[3px_3px_0px_#3d56c9]" : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                              <div className="flex items-center gap-1 text-sm"><SiTether size={13} /> USDT</div>
                              <div className="text-[8px] font-bold opacity-60">ERC20 · ETH</div>
                            </button>
                          </div>

                          {currency !== "USDT_ETH" && (
                            <div className="flex items-start gap-2 bg-amber-50 border-2 border-amber-400 rounded-xl px-3 py-2 mt-2">
                              <span className="text-base mt-0.5">⚠️</span>
                              <div>
                                <p className="text-[11px] font-bold text-amber-800 leading-tight">{t.presale.warnTitle}</p>
                                <p className="text-[10px] text-amber-700 leading-tight mt-0.5">
                                  {currency === "SOL" ? t.presale.warnSol : t.presale.warnSpl}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Amount input & token calculator */}
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={buyAmount}
                              onChange={handleAmountChange}
                              placeholder={`${t.presale.inputMin} ${lim.min} ${currSym}`}
                              className={`w-full h-12 ps-4 pe-28 text-base rounded-xl border-2 font-bold bg-white outline-none transition-colors ${amountError ? "border-red-400 focus:border-red-500" : buyAmount && !amountError ? "border-[#4CAF50] focus:border-[#4CAF50]" : "border-[#1a1a2e] focus:border-[#FF4D9D]"}`}
                              style={{ direction: "ltr" }}
                            />
                            <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {buyAmount && (
                                <button
                                  onClick={() => setBuyAmount("")}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                                  title={t.presale.clearAmount}
                                >
                                  <X size={13} />
                                </button>
                              )}
                              <div className="flex items-center gap-1 bg-[#FFFDE7] px-2.5 py-1 rounded-lg font-display text-sm text-[#1a1a2e] border border-[#FFD54F]">
                                {currency === "SOL"
                                  ? <SiSolana size={14} className="text-[#14F195]" />
                                  : currency === "USDT_ETH"
                                    ? <SiEthereum size={14} className="text-[#627EEA]" />
                                    : <SiTether size={14} className="text-[#26A17B]" />}
                                {currSym}
                              </div>
                            </div>
                          </div>

                          {amountError ? (
                            <p className="text-[11px] text-red-500 font-bold px-1">🚫 {amountError}</p>
                          ) : (
                            <p className="text-[10px] text-[#1a1a2e]/40 font-bold px-1">
                              {t.presale.inputMin}: <span className="text-[#0a9060]">{lim.min} {currSym}</span>
                              {"  ·  "}
                              {t.presale.inputMax}: <span className="text-[#c0392b]">{lim.max.toLocaleString()} {currSym}</span>
                            </p>
                          )}

                          <div className={`border-2 rounded-xl px-3 py-2.5 transition-colors ${tokensOut > 0 ? "bg-[#E8F5E9] border-[#4CAF50]/50" : "bg-gray-50 border-gray-200"}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-[#1a1a2e]/50 font-bold">{t.presale.youGet}</span>
                              <span className={`font-display text-lg tracking-wider ${tokensOut > 0 ? "text-[#4CAF50]" : "text-gray-300"}`}>
                                ~ {tokensOut > 0 ? fmt(tokensOut) : "0"} PWIFE
                              </span>
                            </div>
                            {tokensOut > 0 && currency === "SOL" && (
                              <p className="text-[10px] text-[#1a1a2e]/30 font-bold mt-0.5 text-end">
                                1 SOL ≈ ${solPrice.toLocaleString()} · Stage {currentStage + 1} · {STAGE_DATA[currentStage].price}/PWIFE
                              </p>
                            )}
                            {tokensOut > 0 && currency === "USDT_ETH" && (
                              <p className="text-[10px] text-[#1a1a2e]/30 font-bold mt-0.5 text-end">
                                1 ETH ≈ ${ethPrice.toLocaleString()} · Stage {currentStage + 1} · {STAGE_DATA[currentStage].price}/PWIFE
                              </p>
                            )}
                            {tokensOut > 0 && currency === "USDT_SPL" && (
                              <p className="text-[10px] text-[#1a1a2e]/30 font-bold mt-0.5 text-end">
                                Stage {currentStage + 1} · {STAGE_DATA[currentStage].price}/PWIFE
                              </p>
                            )}
                          </div>

                          {dashTxSig && (
                            <div className="bg-[#E8F5E9] border-2 border-[#4CAF50] rounded-xl p-3 flex items-start gap-2">
                              <Check className="h-4 w-4 text-[#4CAF50] shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-xs font-display text-[#1a4a1e] tracking-wide font-bold">Purchase confirmed! 🎉</p>
                                <a href={`https://explorer.solana.com/tx/${dashTxSig}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-[10px] text-[#4CAF50] underline break-all flex items-center gap-1 mt-0.5">
                                  {dashTxSig.slice(0, 16)}…<ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (currency === "USDT_ETH") { setShowEthModal(true); return; }
                              if (!buyAmount || !!amountError) return;
                              setShowBuyModal(true);
                            }}
                            disabled={currency !== "USDT_ETH" && (!!amountError || buyAmount === "")}
                            className="btn-meme w-full h-14 text-2xl rounded-xl font-display tracking-wider text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                            style={{ background: "linear-gradient(135deg, #4CAF50 0%, #FF4D9D 100%)" }}
                          >
                            {t.presale.apeIn}
                          </button>
                        </div>
                        <p className="text-center text-xs text-[#1a1a2e]/40 font-bold">{t.presale.disclaimer}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="meme-card bg-white rounded-2xl p-5">
                        <h3 className="font-display text-xl text-[#1a1a2e] tracking-wider mb-4">{t.dashboard.presaleStages}</h3>
                        <div className="space-y-3">
                          {presaleStages.map((s) => (
                            <div key={s.stage} className={`rounded-2xl p-4 border-3 transition-all ${s.status === "active" ? "" : s.status === "sold-out" ? "border-[#1a1a2e]/15 bg-[#E8F5E9]/50" : "border-[#1a1a2e]/10 bg-[#FFFDE7]/30"}`} style={s.status === "active" ? { borderColor: s.color, boxShadow: `${isRTL ? "-4px" : "4px"} 4px 0px ${s.shadow}` } : {}}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{s.emoji}</span>
                                  <div>
                                    <div className="font-display text-sm tracking-wider" style={{ color: s.color }}>{t.dashboard.stage} {s.stage} — {s.name.toUpperCase()}</div>
                                    <div className="text-xs text-[#1a1a2e]/40 font-bold">{s.tokens} PWIFE • {s.total} {t.dashboard.raised}</div>
                                  </div>
                                </div>
                                <div className="text-end">
                                  <div className="font-display text-lg tracking-wider" style={{ color: s.color }}>{s.price}</div>
                                  <span className={`inline-block text-[10px] font-display tracking-wider px-2 py-0.5 rounded-full border ${s.status === "active" ? "bg-[#FF4D9D]/10 border-[#FF4D9D] text-[#FF4D9D]" : s.status === "sold-out" ? "bg-[#4CAF50]/10 border-[#4CAF50] text-[#4CAF50]" : "bg-[#1a1a2e]/5 border-[#1a1a2e]/20 text-[#1a1a2e]/40"}`}>
                                    {s.status === "active" ? t.dashboard.live : s.status === "sold-out" ? t.dashboard.soldOut : t.dashboard.locked}
                                  </span>
                                </div>
                              </div>
                              <div className="h-2.5 rounded-full bg-[#1a1a2e]/10 overflow-hidden border border-[#1a1a2e]/15">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.sold}%`, backgroundColor: s.color }} />
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-[10px] font-display tracking-wider" style={{ color: s.color }}>{s.sold}% {t.dashboard.soldPercent}</span>
                                <span className="text-[10px] text-[#1a1a2e]/30 font-bold">{s.tokens} PWIFE</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="meme-card bg-[#FFFDE7] rounded-2xl p-4 border-[#FFD54F] shadow-[3px_3px_0px_#F9A825]">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">📊</div>
                          <div className="flex-1">
                            <div className="font-display text-sm text-[#b8860b] tracking-wider">{t.dashboard.totalPresaleProgress}</div>
                            <div className="h-3 rounded-full bg-[#1a1a2e]/10 overflow-hidden mt-1 border border-[#1a1a2e]/15">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#4CAF50] via-[#FF4D9D] to-[#42A5F5]" style={{ width: "0%" }} />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-[10px] font-display text-[#b8860b] tracking-wider">0 / 0 PWIFE</span>
                              <span className="text-[10px] font-display text-[#b8860b] tracking-wider">0%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="meme-card bg-white rounded-2xl p-5">
                    <h3 className="font-display text-xl text-[#1a1a2e] tracking-wider mb-4">{t.dashboard.rewardTier}</h3>
                    <div className="space-y-4">
                      {[
                        { tier: t.dashboard.bronze, min: "$0", max: "$0", bonus: "0%", active: false, progress: 0 },
                        { tier: t.dashboard.silver, min: "$0", max: "$0", bonus: "0%", active: false, progress: 0 },
                        { tier: t.dashboard.gold, min: "$0", max: "$0", bonus: "0%", active: false, progress: 0 },
                        { tier: t.dashboard.diamond, min: "$0", max: "", bonus: "0%", active: false, progress: 0 },
                      ].map(ti => (
                        <div key={ti.tier} className={`flex items-center gap-3 p-3 rounded-xl border-2 ${ti.active ? "border-[#4CAF50] bg-[#E8F5E9] shadow-[3px_3px_0px_#2E7D32]" : "border-[#1a1a2e]/10 bg-[#FFFDE7]/50"}`}>
                          <span className="text-lg font-display tracking-wider shrink-0">{ti.tier}</span>
                          <div className="flex-1">
                            <div className="h-2 rounded-full bg-[#1a1a2e]/10 overflow-hidden">
                              <div className="h-full rounded-full bg-[#4CAF50] transition-all" style={{ width: `${ti.progress}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-display text-[#1a1a2e]/40 tracking-wide shrink-0">{ti.min}{ti.max && ` - ${ti.max}`}</span>
                          <span className={`sticker text-xs ${ti.active ? "bg-[#4CAF50] text-white" : "bg-[#1a1a2e]/10 text-[#1a1a2e]/40"}`} style={{ transform: "none" }}>+{ti.bonus}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "purchases" && (
                <div className="space-y-6">
                  <div className="meme-card bg-white rounded-2xl overflow-hidden">
                    <div className="zigzag-border" />
                    <div className="p-5">
                      <h3 className="font-display text-xl text-[#1a1a2e] tracking-wider mb-5">🛒 {t.dashboard.myPurchases}</h3>
                      <div className="text-center py-10">
                        <div className="text-5xl mb-3">🛒</div>
                        <p className="font-display text-lg text-[#1a1a2e]/40 tracking-wider">{t.dashboard.noPurchases}</p>
                        <p className="text-sm text-[#1a1a2e]/30 font-bold">{t.dashboard.noPurchasesDesc}</p>
                      </div>
                    </div>
                  </div>

                  <div className="meme-card bg-[#E8F5E9] rounded-2xl p-5 border-[#4CAF50] shadow-[4px_4px_0px_#2E7D32]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-display text-sm text-[#4CAF50] tracking-wider mb-1">{t.dashboard.totalPurchased}</div>
                        <div className="text-3xl font-display text-[#1a1a2e] tracking-wider">0 <span className="text-base text-[#1a1a2e]/40">PWIFE</span></div>
                        <div className="text-sm text-[#1a1a2e]/40 font-bold">0 SOL ($0.00)</div>
                      </div>
                      <div className="text-5xl">🐸</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "claim" && (
                <div className="space-y-6">
                  <div className="meme-card bg-white rounded-2xl overflow-hidden">
                    <div className="zigzag-border" />
                    <div className="p-6 sm:p-8 text-center">
                      <div className="text-6xl mb-5">🔒</div>
                      <h3 className="text-3xl sm:text-4xl font-display text-[#1a1a2e] tracking-wider mb-3">{t.dashboard.claimingLocked}</h3>
                      <p className="text-[#1a1a2e]/50 font-bold mb-6 max-w-md mx-auto">
                        {t.dashboard.claimingDesc}
                      </p>
                      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6">
                        <div className="meme-card bg-[#E8F5E9] rounded-2xl p-4 border-[#4CAF50] shadow-[3px_3px_0px_#2E7D32]">
                          <div className="text-xs font-display text-[#4CAF50] tracking-wider mb-1">{t.dashboard.yourTokens}</div>
                          <div className="text-xl font-display text-[#1a1a2e] tracking-wider">0</div>
                          <div className="text-xs text-[#1a1a2e]/40 font-bold">PWIFE</div>
                        </div>
                        <div className="meme-card bg-[#FCE4EC] rounded-2xl p-4 border-[#FF4D9D] shadow-[3px_3px_0px_#C2185B]">
                          <div className="text-xs font-display text-[#FF4D9D] tracking-wider mb-1">{t.dashboard.claimable}</div>
                          <div className="text-xl font-display text-[#1a1a2e] tracking-wider">0</div>
                          <div className="text-xs text-[#1a1a2e]/40 font-bold">PWIFE</div>
                        </div>
                      </div>
                      <div className="meme-card bg-[#FFFDE7] rounded-2xl p-4 max-w-sm mx-auto mb-6 border-[#FFD54F] shadow-[3px_3px_0px_#F9A825]">
                        <div className="flex items-center gap-2 justify-center">
                          <Shield className="h-4 w-4 text-[#b8860b]" />
                          <span className="text-sm font-display text-[#b8860b] tracking-wider">{t.dashboard.claimStatus}</span>
                        </div>
                        <div className="font-display text-lg text-[#1a1a2e] tracking-wider mt-1">{t.dashboard.pendingTge}</div>
                      </div>
                      <button disabled className="btn-meme h-12 px-8 rounded-xl bg-gray-200 text-gray-400 font-display text-lg tracking-wider cursor-not-allowed">
                        {t.dashboard.claimBtn}
                      </button>
                      <p className="text-xs text-[#1a1a2e]/30 font-bold mt-4">{t.dashboard.claimDisclaimer}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "referrals" && (
                <div className="space-y-6">
                  <div className="meme-card bg-white rounded-2xl overflow-hidden">
                    <div className="zigzag-border" />
                    <div className="p-5 space-y-5">
                      <div>
                        <div className="sticker bg-[#FF4D9D] text-white mb-3 text-sm inline-block" style={{ transform: "rotate(2deg)" }}>{t.presale.referralBanner}</div>
                        <h3 className="text-3xl font-display text-[#1a1a2e] tracking-wider comic-shadow mb-1">{t.presale.shillEarn}</h3>
                        <p className="text-[#1a1a2e]/60 font-bold">{t.presale.shillDesc}</p>
                      </div>

                      <div>
                        <p className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-2">{t.presale.yourLink}</p>
                        <div className="flex gap-2">
                          <Input readOnly value="https://pepewife.io/ref/7xKp4mNr" className="h-11 rounded-xl border-2 border-[#1a1a2e] bg-[#FFFDE7] font-mono text-xs" />
                          <button onClick={handleCopy} className={`btn-meme h-11 px-4 rounded-xl shrink-0 ${copied ? "bg-[#4CAF50]" : "bg-[#FFD54F]"} text-[#1a1a2e]`}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        {copied && <p className="text-xs text-[#4CAF50] font-display tracking-wide mt-1">{t.presale.copied}</p>}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { l: t.dashboard.friendsShilled, v: "0", c: "text-[#4CAF50]", bg: "bg-[#E8F5E9]", bc: "border-[#4CAF50]" },
                          { l: t.dashboard.pendingRewards, v: "0", c: "text-[#FF4D9D]", bg: "bg-[#FCE4EC]", bc: "border-[#FF4D9D]" },
                          { l: t.dashboard.earnedTotal, v: "0", c: "text-[#AB47BC]", bg: "bg-[#F3E5F5]", bc: "border-[#AB47BC]" },
                          { l: t.dashboard.rewardRate, v: "0%", c: "text-[#b8860b]", bg: "bg-[#FFFDE7]", bc: "border-[#FFD54F]" },
                        ].map(s => (
                          <div key={s.l} className={`${s.bg} rounded-xl p-3 text-center border-2 ${s.bc}`}>
                            <div className={`text-xl font-display ${s.c} tracking-wider`}>{s.v}</div>
                            <div className="text-[10px] font-display text-[#1a1a2e]/40 tracking-wider mt-0.5">{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="meme-card bg-white rounded-2xl p-5">
                    <h4 className="font-display text-lg text-[#1a1a2e] mb-4 tracking-wider">{t.dashboard.referralProgress}</h4>
                    <div className="space-y-3">
                      {[
                        { label: t.dashboard.referrals, current: 0, target: 0, reward: t.dashboard.bronzeShiller, color: "#4CAF50" },
                        { label: t.dashboard.referrals, current: 0, target: 0, reward: t.dashboard.silverShiller, color: "#FF4D9D" },
                        { label: t.dashboard.referrals, current: 0, target: 0, reward: t.dashboard.goldShiller, color: "#FFD54F" },
                      ].map(p => (
                        <div key={p.reward} className="bg-[#FFFDE7] rounded-xl p-3 border-2 border-[#FFD54F]/30">
                          <div className="flex justify-between text-xs font-display tracking-wider mb-1.5">
                            <span className="text-[#1a1a2e]">{p.reward}</span>
                            <span className="text-[#1a1a2e]/40">{p.current}/{p.target} {t.dashboard.referralsLabel}</span>
                          </div>
                          <div className="h-3 rounded-full bg-[#1a1a2e]/10 overflow-hidden border border-[#1a1a2e]/20">
                            <div className="h-full rounded-full transition-all" style={{ width: `${p.target > 0 ? (p.current / p.target) * 100 : 0}%`, backgroundColor: p.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="meme-card bg-white rounded-2xl p-5">
                    <h4 className="font-display text-lg text-[#1a1a2e] mb-3 tracking-wider">{t.presale.topShillers}</h4>
                    <div className="space-y-2">
                      {[
                        { r: "🥇", a: "---", p: "0" },
                        { r: "🥈", a: "---", p: "0" },
                        { r: "🥉", a: "---", p: "0" },
                      ].map((x, i) => (
                        <div key={`shiller-${i}`} className="flex items-center gap-2 rounded-xl px-3 py-2 border-2 bg-[#FFFDE7] border-[#FFD54F]/50">
                          <span className="text-lg">{x.r}</span>
                          <span className="font-mono text-xs text-[#1a1a2e]/50 flex-1">{x.a}</span>
                          <span className="text-xs font-display text-[#4CAF50] tracking-wide">{x.p} PWIFE</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "transactions" && (
                <div className="space-y-6">
                  <div className="meme-card bg-white rounded-2xl overflow-hidden">
                    <div className="zigzag-border" />
                    <div className="p-5">
                      <h3 className="font-display text-xl text-[#1a1a2e] tracking-wider mb-5">{t.dashboard.transactionHistory}</h3>
                      <div className="text-center py-10">
                        <div className="text-5xl mb-3">📜</div>
                        <p className="font-display text-lg text-[#1a1a2e]/40 tracking-wider">{t.dashboard.noTransactions}</p>
                        <p className="text-sm text-[#1a1a2e]/30 font-bold">{t.dashboard.noTransactionsDesc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="zigzag-border" />

      <footer className="py-10 px-4 border-t-4 border-[#1a1a2e]" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #311B92 100%)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-start">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="PEPEWIFE" className="w-12 h-12 rounded-full border-3 border-white/30" />
              <span className="font-display text-3xl text-white tracking-wider" style={{ textShadow: isRTL ? "-2px 2px 0px #FF4D9D" : "2px 2px 0px #FF4D9D" }}>PEPEWIFE</span>
            </div>
            <p className="text-white/40 text-sm font-bold">{t.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => navigate("/whitepaper")} className="text-white/50 hover:text-[#FFD54F] font-display text-lg tracking-wide transition-colors">{t.footer.whitepaper}</button>
            <button onClick={() => navigate("/risk-disclaimer")} className="text-white/50 hover:text-[#FFD54F] font-display text-lg tracking-wide transition-colors">{t.footer.riskDisclaimer}</button>
            <button onClick={() => navigate("/terms")} className="text-white/50 hover:text-[#FFD54F] font-display text-lg tracking-wide transition-colors">{t.footer.terms}</button>
          </div>
          <div className="flex gap-3">
            <button className="btn-meme w-10 h-10 rounded-full bg-white/10 text-white/60 hover:text-[#1DA1F2] hover:bg-white/20 flex items-center justify-center border-white/20"><Twitter className="h-4 w-4" /></button>
            <button className="btn-meme w-10 h-10 rounded-full bg-white/10 text-white/60 hover:text-[#0088cc] hover:bg-white/20 flex items-center justify-center border-white/20"><Send className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-white/10 text-center text-sm text-white/30 font-display tracking-wide">
          {t.footer.copyright}
        </div>
      </footer>

      {/* ── ETH Manual Payment Modal ─────────────────────────────────── */}
      {showEthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white rounded-2xl border-4 border-[#627EEA] shadow-[8px_8px_0px_#3d56c9] w-full max-w-sm" style={{ direction: dir }}>
            <div className="bg-[#627EEA] rounded-t-xl px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SiEthereum size={20} className="text-white" />
                <span className="font-display text-white text-lg tracking-wide">{t.presale.ethModalTitle}</span>
              </div>
              <button onClick={() => setShowEthModal(false)} className="text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-red-50 border-2 border-red-400 rounded-xl p-3 flex items-start gap-2">
                <span className="text-xl">🚨</span>
                <div>
                  <p className="font-display text-red-700 text-sm font-bold leading-tight">{t.presale.ethWarnTitle}</p>
                  <p className="text-red-600 text-[11px] leading-snug mt-1">{t.presale.ethWarnDesc}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-[#1a1a2e]/50 font-bold mb-1.5">{t.presale.ethWalletLabel}</p>
                <div className="bg-[#f0f4ff] border-2 border-[#627EEA] rounded-xl p-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-[#3d56c9] break-all leading-snug">{ETH_WALLET}</span>
                  <button onClick={copyEthAddress} className="shrink-0 bg-[#627EEA] text-white rounded-lg p-2 hover:bg-[#3d56c9] transition-colors">
                    {copiedEth ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                {copiedEth && <p className="text-[10px] text-[#4CAF50] font-bold mt-1 text-center">{t.presale.ethCopied}</p>}
              </div>

              <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3 space-y-1.5">
                <p className="font-display text-amber-800 text-[11px] font-bold">{t.presale.ethCheckTitle}</p>
                <ul className="text-amber-700 text-[10px] space-y-1 list-none">
                  <li>✔️ {t.presale.ethCheck1}</li>
                  <li>✔️ {t.presale.ethCheck2}</li>
                  <li>✔️ {t.presale.ethCheck3}</li>
                  <li>✔️ {t.presale.ethCheck4}</li>
                </ul>
              </div>

              <div className="bg-[#1a1a2e]/5 rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-[#1a1a2e]/50 font-bold">{t.presale.ethTelegramNote}</p>
              </div>

              <button onClick={() => setShowEthModal(false)} className="w-full h-11 rounded-xl font-display text-base text-white tracking-wide" style={{ background: "linear-gradient(135deg, #627EEA 0%, #3d56c9 100%)" }}>
                {t.presale.ethClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Wallet Buy Modal ─────────────────────────────────────────── */}
      {showBuyModal && currency !== "USDT_ETH" && (
        <WalletBuyModal
          amount={parseFloat(buyAmount)}
          currency={currency as "SOL" | "USDT_SPL"}
          presaleData={presaleData}
          onClose={() => setShowBuyModal(false)}
          onSuccess={(sig) => {
            setDashTxSig(sig);
            setBuyAmount("");
            fetchPresaleState().then(d => { if (d) setPresaleData(d); }).catch(() => {});
            setShowBuyModal(false);
          }}
        />
      )}
    </div>
  );
}
