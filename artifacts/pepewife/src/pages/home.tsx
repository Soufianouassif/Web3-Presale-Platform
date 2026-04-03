import React, { useState, useEffect } from "react";
import { Menu, X, Twitter, Send, Wallet, ArrowRight, Copy, Check, ChevronRight, ShieldCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { SiCoinmarketcap, SiBinance, SiSolana, SiTether, SiEthereum } from "react-icons/si";
import { useLocation } from "wouter";
import { useLanguage } from "@/i18n/context";
import { useWallet } from "@/contexts/wallet-context";
import LanguageSwitcher from "@/components/language-switcher";
import TwitterFeed from "@/components/twitter-feed";
import SEOHead from "@/components/seo-head";
import WalletBuyModal from "@/components/wallet-buy-modal";
import {
  fetchPresaleState,
  type PresaleState,
} from "@/lib/presale-contract";
import {
  captureReferralFromUrl,
  getStoredReferralCode,
  clearStoredReferralCode,
  fetchOrCreateReferralCode,
  fetchReferralStats,
  fetchLeaderboard,
  buildReferralUrl,
  formatTokens,
  type ReferralStats,
  type LeaderboardEntry,
} from "@/lib/referral";
import { tracker } from "@/lib/admin-api";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 14, minutes: 0, seconds: 0 });
  const [currency, setCurrency] = useState<"SOL" | "USDT_SPL" | "USDT_ETH">("SOL");
  const [amount, setAmount] = useState("");
  const [showEthModal, setShowEthModal] = useState(false);
  const [copiedEth, setCopiedEth] = useState(false);
  const [copied, setCopied] = useState(false);
  const [solPrice, setSolPrice] = useState<number>(150);
  const [ethPrice, setEthPrice] = useState<number>(3000);
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<Date | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);

  const [presaleData, setPresaleData] = useState<PresaleState | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);

  // ── Referral state ────────────────────────────────────────────────────────
  const [myRefCode, setMyRefCode] = useState<string | null>(null);
  const [refStats, setRefStats] = useState<ReferralStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [refBannerCode, setRefBannerCode] = useState<string | null>(null);

  const { t, dir } = useLanguage();
  const isRTL = dir === "rtl";
  const { status, shortAddress, address } = useWallet();

  useEffect(() => {
    fetchPresaleState().then(d => {
      if (d) setPresaleData(d);
    });
  }, []);

  useEffect(() => {
    const fetchPrices = () => {
      setPricesLoading(true);
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum&vs_currencies=usd")
        .then(r => r.json())
        .then(d => {
          if (d?.solana?.usd)  setSolPrice(d.solana.usd);
          if (d?.ethereum?.usd) setEthPrice(d.ethereum.usd);
          setPricesUpdatedAt(new Date());
        })
        .catch(() => {})
        .finally(() => setPricesLoading(false));
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Detect referral code in URL on first load ──────────────────────────────
  useEffect(() => {
    const code = captureReferralFromUrl();
    if (code) setRefBannerCode(code);
    // Always load leaderboard
    fetchLeaderboard().then(lb => setLeaderboard(lb));
  }, []);

  // ── Load referral code + stats when wallet connects ────────────────────────
  useEffect(() => {
    if (!address) {
      setMyRefCode(null);
      setRefStats(null);
      return;
    }
    fetchOrCreateReferralCode(address).then(code => {
      if (code) setMyRefCode(code);
    });
    fetchReferralStats(address).then(stats => {
      if (stats) setRefStats(stats);
    });
  }, [address]);

  const myRefUrl = myRefCode ? buildReferralUrl(myRefCode) : "";

  const LIMITS: Record<string, { min: number; max: number }> = {
    SOL:      { min: 1,    max: 50 },
    USDT_SPL: { min: 100,  max: 10000 },
    USDT_ETH: { min: 100,  max: 10000 },
  };

  const currSym = currency === "SOL" ? "SOL" : "USDT";
  const lim = LIMITS[currency];

  const errMsg = (tpl: string, val: number) =>
    tpl.replace("{0}", val.toString()).replace("{1}", currSym);

  const amountNum = parseFloat(amount);
  const amountError =
    amount !== "" && !/^\d+(\.\d*)?$/.test(amount)
      ? t.presale.errorInvalid
      : amount !== "" && !isNaN(amountNum) && amountNum < lim.min
      ? errMsg(t.presale.errorTooLow, lim.min)
      : amount !== "" && !isNaN(amountNum) && amountNum > lim.max
      ? errMsg(t.presale.errorTooHigh, lim.max)
      : "";

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/[^0-9.]/.test(val)) return;
    if ((val.match(/\./g) || []).length > 1) return;
    setAmount(val);
  };

  const ETH_WALLET = "0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97";

  const copyEthAddress = () => {
    navigator.clipboard.writeText(ETH_WALLET).then(() => {
      setCopiedEth(true);
      setTimeout(() => setCopiedEth(false), 2000);
    });
  };
  const isConnected = status === "connected";
  const walletAddress = shortAddress || "7xKp...4mNr";
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

  const totalRaisedUSD = presaleData
    ? (Number(presaleData.totalSolRaised) / 1e9) * solPrice + Number(presaleData.totalUsdtRaised) / 1e6
    : 0;

  const stagePrice = parseFloat(STAGE_DATA[currentStage].price.replace("$", ""));
  const amountUSD = !isNaN(amountNum) && amount !== ""
    ? currency === "SOL" ? amountNum * solPrice : amountNum
    : 0;
  const tokensOut = stagePrice > 0 && amountUSD > 0 ? Math.floor(amountUSD / stagePrice) : 0;

  const tokenomicsData = [
    { name: t.tokenomics.community, value: 40, color: "#4CAF50" },
    { name: t.tokenomics.presale, value: 20, color: "#FF4D9D" },
    { name: t.tokenomics.liquidity, value: 15, color: "#FFD54F" },
    { name: t.tokenomics.marketing, value: 10, color: "#42A5F5" },
    { name: t.tokenomics.ecosystem, value: 10, color: "#AB47BC" },
    { name: t.tokenomics.team, value: 5, color: "#FF9800" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [, navigate] = useLocation();
  const handleConnect = () => { navigate("/connect"); };
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setIsMenuOpen(false); };
  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // ── Modal buy success ─────────────────────────────────────────────
  const handleBuySuccess = (sig: string) => {
    setTxSignature(sig);
    setAmount("");
    fetchPresaleState().then(d => { if (d) setPresaleData(d); });

    // Track the purchase (fire-and-forget) with referral code if present
    const refCode = getStoredReferralCode();
    const amountNum = parseFloat(amount) || 0;
    const stage = presaleData?.currentStage ?? 1;
    const stagePrice = presaleData
      ? [0.00003, 0.00004, 0.00005, 0.00007][stage - 1] ?? 0.00003
      : 0.00003;
    const pricePerToken = stagePrice;
    const solUsd = currency === "SOL" ? amountNum * solPrice : 0;
    const usdAmt = currency === "SOL" ? solUsd : amountNum;
    const tokensEst = pricePerToken > 0 ? usdAmt / pricePerToken : 0;

    tracker.purchase({
      walletAddress: address ?? "",
      network: currency === "SOL" ? "solana" : currency === "USDT_SPL" ? "solana" : "ethereum",
      amountUsd: usdAmt,
      amountTokens: tokensEst,
      txHash: sig,
      stage,
      referralCode: refCode ?? undefined,
    });

    // After a confirmed referral is registered, clear it so it won't double-count
    if (refCode) clearStoredReferralCode();

    setTimeout(() => {
      setShowBuyModal(false);
      navigate("/dashboard");
    }, 2500);
  };

  // ── APE IN handler — open the wallet/buy modal ─────────────────────
  const handleApeIn = () => {
    if (currency === "USDT_ETH") { setShowEthModal(true); return; }
    if (!amount || !!amountError) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;
    setTxSignature(null);
    setShowBuyModal(true);
  };

  const navLinks = [
    { id: "presale", label: t.nav.presale, icon: "🛒" },
    { id: "why", label: t.nav.whyBuy, icon: "🤔" },
    { id: "tokenomics", label: t.nav.tokenomics, icon: "📊" },
    { id: "roadmap", label: t.nav.roadmap, icon: "🗺️" },
    { id: "about", label: t.nav.about, icon: "ℹ️", isPage: true },
  ];

  return (
    <div className="min-h-screen font-sans overflow-x-hidden">
      <SEOHead
        title="PEPEWIFE ($PWIFE) – The Lady of Memes | Solana Meme Coin Presale"
        description="Join the PEPEWIFE presale on Solana. Community-first meme token with staking, Tap-to-Earn, locked liquidity, and revoked mint authority. 100T total supply."
        path="/"
      />

      <nav className="fixed top-0 w-full z-50 border-b-4 border-[#1a1a2e]" style={{ background: "linear-gradient(90deg, #FFFDE7, #E8F5E9)" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-4 lg:gap-8">
              <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer wiggle-hover shrink-0" onClick={() => scrollTo('hero')}>
                <img src="/logo.png" alt="PEPEWIFE" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#1a1a2e] shrink-0" />
                <span className="font-display text-xl sm:text-2xl text-[#1a1a2e] tracking-wide whitespace-nowrap" style={{ textShadow: isRTL ? "-2px 2px 0px #FFD54F" : "2px 2px 0px #FFD54F" }}>PEPEWIFE</span>
                <span className="hidden sm:inline-block bg-[#FF4D9D] text-white text-[10px] font-display px-2 py-0.5 rounded-full border-2 border-[#1a1a2e] whitespace-nowrap" style={{ transform: "rotate(3deg)" }}>$PWIFE</span>
              </div>
              <div className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-5">
                {navLinks.map(s => (
                  <button key={s.id} onClick={() => s.isPage ? navigate("/whitepaper") : scrollTo(s.id)} className="flex items-center gap-1 font-display text-base text-[#1a1a2e] hover:text-[#FF4D9D] transition-colors tracking-wide wiggle-hover whitespace-nowrap">
                    <span>{s.icon}</span> <span>{s.label}</span>
                  </button>
                ))}
                <div className="relative group">
                  <button className="flex items-center gap-1.5 font-display text-base text-[#FF9800] tracking-wide wiggle-hover whitespace-nowrap border-2 border-[#FF9800] rounded-full px-3 py-1 bg-[#FF9800]/10 hover:bg-[#FF9800]/20 transition-colors">
                    <ShieldCheck className="h-4 w-4 animate-pulse" />
                    <span>{t.nav.audit}</span>
                  </button>
                  <div className="absolute top-full mt-2 start-1/2 -translate-x-1/2 bg-[#1a1a2e] text-white text-xs font-display px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none tracking-wide">
                    {t.nav.auditPending}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              {isConnected ? (
                <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 bg-[#4CAF50]/10 border-2 border-[#4CAF50] text-[#4CAF50] rounded-xl px-3 h-9 font-display text-sm tracking-wide whitespace-nowrap shadow-[2px_2px_0px_#2E7D32]">
                  <Wallet className="h-3.5 w-3.5 shrink-0" /> {walletAddress}
                </button>
              ) : (
                <button onClick={handleConnect} className="hidden sm:flex items-center gap-1.5 bg-[#4CAF50] text-white rounded-xl px-4 h-9 font-display text-base tracking-wide whitespace-nowrap border-2 border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e] hover:shadow-[4px_4px_0px_#1a1a2e] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
                  <span>🔌</span> <span>{t.nav.connectWallet}</span>
                </button>
              )}
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
              {navLinks.map(s => (
                <button key={s.id} onClick={() => s.isPage ? navigate("/whitepaper") : scrollTo(s.id)} className="flex items-center gap-2 text-start py-2 font-display text-lg text-[#1a1a2e] tracking-wide">
                  <span>{s.icon}</span> <span>{s.label}</span>
                </button>
              ))}
              <div className="flex items-center gap-2 py-2 text-[#FF9800]">
                <ShieldCheck className="h-5 w-5 animate-pulse" />
                <span className="font-display text-lg tracking-wide">{t.nav.audit}</span>
                <span className="text-xs font-display bg-[#FF9800]/15 border border-[#FF9800] text-[#FF9800] px-2 py-0.5 rounded-full">{t.nav.auditPending}</span>
              </div>
              <button onClick={handleConnect} className="sm:hidden flex items-center justify-center gap-2 w-full mt-2 bg-[#4CAF50] text-white rounded-xl py-3 font-display text-lg border-2 border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e]">
                <span>🔌</span> <span>{t.nav.connectWallet}</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <section id="hero" className="relative overflow-hidden" style={{ backgroundImage: "url('/pepewife-bg.png')", backgroundSize: "cover", backgroundPosition: isRTL ? "left center" : "right center", backgroundRepeat: "no-repeat" }}>
        <div className="pt-28 pb-24 px-4">
          <div className="max-w-7xl mx-auto" dir="ltr">
            <div className="sticker bg-[#FFD54F] text-[#1a1a2e] mb-6 animate-pulse text-base" style={{ transform: "rotate(-2deg)" }}>
              {"🔥 STAGE 1 — PRESALE COMING SOON — NGMI IF U MISS THIS!!"}
            </div>
            <h1 className="text-5xl lg:text-8xl font-display leading-tight mb-6 text-[#1a1a2e] comic-shadow tracking-wider max-w-3xl">
              {"Be Early..."}<br /><span className="text-[#FF4D9D]" style={{ textShadow: "3px 3px 0px #1a1a2e" }}>{"Or Cry Later 😭"}</span>
            </h1>
            <div className="speech-bubble inline-block p-4 mb-8 max-w-xl">
              <p className="text-lg lg:text-xl font-bold text-[#1a1a2e]">
                {"PEPE built the meme. SHE builds the future. 💅"}<br />
                <span className="text-[#FF4D9D]">{"Join the most BASED presale on Solana. LFG! 🚀"}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mb-8">
              <div className="bg-white rounded-2xl px-5 py-3 border-2 border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e]">
                <div className="text-xs font-display text-gray-500 tracking-wide">💰 Total Raised</div>
                <div className="text-2xl font-nums text-[#1a1a2e] tracking-wider">
                  {presaleData
                    ? `$${totalRaisedUSD >= 1000 ? (totalRaisedUSD / 1000).toFixed(1) + "K" : totalRaisedUSD.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                    : "$0"}
                </div>
                <div className="text-[10px] text-gray-400 font-display tracking-wide">USD</div>
              </div>
              <div className="bg-white rounded-2xl px-5 py-3 border-2 border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e]">
                <div className="text-xs font-display text-gray-500 tracking-wide">🐸 PWIFE Sold</div>
                <div className="text-2xl font-nums text-[#1a1a2e] tracking-wider">
                  {totalSold >= 1_000_000_000
                    ? (totalSold / 1_000_000_000).toFixed(1) + "B"
                    : totalSold >= 1_000_000
                      ? (totalSold / 1_000_000).toFixed(1) + "M"
                      : totalSold.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-400 font-display tracking-wide">tokens</div>
              </div>
              <div className="bg-white rounded-2xl px-5 py-3 border-2 border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e]">
                <div className="text-xs font-display text-gray-500 tracking-wide">💎 Stage {currentStage + 1} Price</div>
                <P v={STAGE_DATA[currentStage].price} className="text-xl font-nums text-[#1a1a2e] tracking-wider" />
                <div className="text-[10px] text-gray-400 font-display tracking-wide">per PWIFE</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => scrollTo('presale')} className="btn-meme bg-[#4CAF50] text-white rounded-2xl h-14 px-10 text-2xl font-display tracking-wider" style={{ animation: "pulse-glow 2s infinite" }}>
                {"🚀 APE IN NOW"}
              </button>
              <button className="btn-meme bg-white text-[#1a1a2e] rounded-2xl h-14 px-8 text-2xl font-display tracking-wider">
                {"🐸 Join The Fam"} <ArrowRight className="ml-2 h-5 w-5 inline" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section className="py-6 pattern-dots" style={{ background: "linear-gradient(90deg, #FFF9C4, #E8F5E9)" }}>
        <div className="max-w-7xl mx-auto px-4 text-center mb-3">
          <p className="font-display text-sm text-[#1a1a2e] tracking-wider">{t.partners.title}</p>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-content space-x-12 items-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex space-x-12 items-center shrink-0">
                <div className="flex items-center gap-2 font-display text-xl text-[#1a1a2e]/40 tracking-wide"><SiCoinmarketcap size={24} /> CoinMarketCap</div>
                <div className="flex items-center gap-2 font-display text-xl text-[#1a1a2e]/40 tracking-wide"><SiSolana size={24} /> Solana</div>
                <div className="flex items-center gap-2 font-display text-xl text-[#1a1a2e]/40 tracking-wide"><SiBinance size={24} /> Binance</div>
                <div className="flex items-center gap-2 font-display text-xl text-[#1a1a2e]/40 tracking-wide">Orcal</div>
                <div className="flex items-center gap-2 font-display text-xl text-[#1a1a2e]/40 tracking-wide">Raydium</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section id="presale" className="py-20 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #FFFDE7, #E8F5E9)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="sticker bg-[#FF4D9D] text-white mb-4 text-lg inline-block" style={{ transform: "rotate(-1deg)" }}>{t.presale.banner}</div>
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-2">{t.presale.title}</h2>
            <p className="font-bold text-[#1a1a2e]/60 text-lg">{t.presale.subtitle}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="meme-card bg-white rounded-3xl overflow-hidden">
              <div className="zigzag-border" />
              <div className="p-7 space-y-6">
                <div>
                  <p className="font-display text-center text-[#1a1a2e]/50 tracking-wider mb-3">{t.presale.tickTock}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[{ val: timeLeft.days, label: t.presale.days }, { val: timeLeft.hours.toString().padStart(2, "0"), label: t.presale.hrs }, { val: timeLeft.minutes.toString().padStart(2, "0"), label: t.presale.min }, { val: timeLeft.seconds.toString().padStart(2, "0"), label: t.presale.sec }].map(ti => (
                      <div key={ti.label} className="bg-[#FFFDE7] border-2 border-[#FFD54F] rounded-xl py-2.5 text-center">
                        <div className="text-3xl font-nums text-[#1a1a2e] tracking-wider">{ti.val}</div>
                        <div className="text-[10px] font-display text-[#1a1a2e]/40 tracking-wider">{ti.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-[#4CAF50] font-display tracking-wide">🐸 {t.presale.sold}</span>
                    <span className="text-[#1a1a2e]/60 font-nums tracking-wide">{presaleFilled}% — Stage {currentStage + 1}/4</span>
                  </div>
                  {/* شريط المراحل الأربع */}
                  <div className="flex gap-1 h-5 rounded-full overflow-hidden border-2 border-[#1a1a2e]">
                    {STAGE_DATA.map((s, i) => {
                      const pct = Math.min(100, Math.round((s.sold / s.tokens) * 100));
                      return (
                        <div key={i} className="relative flex-1 bg-gray-100">
                          <div
                            className="h-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: s.color, opacity: i === currentStage ? 1 : 0.4 }}
                          />
                          {i < 3 && <div className="absolute right-0 top-0 h-full w-px bg-[#1a1a2e]/30" />}
                        </div>
                      );
                    })}
                  </div>
                  {/* تسميات المراحل */}
                  <div className="flex gap-1">
                    {STAGE_DATA.map((s, i) => (
                      <div key={i} className={`flex-1 text-center rounded-lg py-1 border ${i === currentStage ? "border-[#1a1a2e] bg-[#FFFDE7]" : "border-transparent"}`}>
                        <div className="text-[9px] font-nums tracking-wide text-[#1a1a2e]/50">S{s.stage}</div>
                        <P v={s.price} className="text-[9px] font-nums font-bold" style={{ color: s.color }} />
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-[10px] font-nums text-[#1a1a2e]/40 tracking-wider">
                    {fmt(totalSold)} / {fmt(totalTokens)} PWIFE
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: t.presale.now,  v: STAGE_DATA[0].price,  sub: "Stage 1", bg: "bg-[#4CAF50]/10", bc: "border-[#4CAF50]", tc: "text-[#4CAF50]" },
                    { l: t.presale.next, v: STAGE_DATA[1].price,  sub: "Stage 2", bg: "bg-[#FF4D9D]/10", bc: "border-[#FF4D9D]", tc: "text-[#FF4D9D]" },
                    { l: t.presale.list, v: LISTING_PRICE,         sub: "CEX",     bg: "bg-[#FFD54F]/20", bc: "border-[#FFD54F]", tc: "text-[#b8860b]" },
                  ].map(p => (
                    <div key={p.l} className={`${p.bg} border-2 ${p.bc} rounded-xl p-2.5 text-center`}>
                      <div className="text-[10px] font-display tracking-wider text-[#1a1a2e]/50">{p.l}</div>
                      <P v={p.v} className={`text-[11px] font-nums ${p.tc} tracking-wider font-bold`} />
                      <div className="text-[9px] font-display text-[#1a1a2e]/40 tracking-wide">{p.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#1a1a2e]/4 border border-[#1a1a2e]/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <SiSolana size={12} className="text-[#14F195]" />
                      <span className="font-nums text-[11px] text-[#1a1a2e] tracking-wide">
                        ${solPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <SiEthereum size={12} className="text-[#627EEA]" />
                      <span className="font-nums text-[11px] text-[#1a1a2e] tracking-wide">
                        ${ethPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <SiTether size={11} className="text-[#26A17B]" />
                      <span className="font-nums text-[11px] text-[#26A17B] tracking-wide">$1.00</span>
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
                        : "..."
                      }
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-2">{t.presale.payWith}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => { setCurrency("SOL"); setAmount(""); }}
                      className={`flex flex-col items-center justify-center rounded-xl h-11 font-display tracking-wide border-2 transition-all ${currency === "SOL" ? "bg-[#14F195]/25 border-[#14F195] text-[#0a9060] shadow-[3px_3px_0px_#0a9060]" : "bg-[#14F195]/10 border-[#14F195]/40 text-[#0a9060] hover:border-[#14F195]"}`}>
                      <div className="flex items-center gap-1 text-sm"><SiSolana size={13} /> SOL</div>
                      <div className="text-[8px] font-bold opacity-60">Solana</div>
                    </button>
                    <button onClick={() => { setCurrency("USDT_SPL"); setAmount(""); }}
                      className={`flex flex-col items-center justify-center rounded-xl h-11 font-display tracking-wide border-2 transition-all ${currency === "USDT_SPL" ? "bg-[#26A17B]/25 border-[#26A17B] text-[#1a7a5e] shadow-[3px_3px_0px_#1a7a5e]" : "bg-[#26A17B]/10 border-[#26A17B]/40 text-[#1a7a5e] hover:border-[#26A17B]"}`}>
                      <div className="flex items-center gap-1 text-sm"><SiTether size={13} /> USDT</div>
                      <div className="text-[8px] font-bold opacity-60">SPL · SOL</div>
                    </button>
                    {/* USDT ETH disabled — re-enable when BSC contract is ready
                    <button onClick={() => { setCurrency("USDT_ETH"); setAmount(""); setShowEthModal(true); }}
                      className={`flex flex-col items-center justify-center rounded-xl h-11 font-display tracking-wide border-2 transition-all ${currency === "USDT_ETH" ? "bg-[#627EEA]/15 border-[#627EEA] text-[#3d56c9] shadow-[3px_3px_0px_#3d56c9]" : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                      <div className="flex items-center gap-1 text-sm"><SiTether size={13} /> USDT</div>
                      <div className="text-[8px] font-bold opacity-60">ERC20 · ETH</div>
                    </button>
                    */}
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

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder={`${t.presale.inputMin} ${lim.min} ${currSym}`}
                      className={`w-full h-12 ps-4 pe-28 text-base rounded-xl border-2 font-bold bg-white outline-none transition-colors ${amountError ? "border-red-400 focus:border-red-500" : amount && !amountError ? "border-[#4CAF50] focus:border-[#4CAF50]" : "border-[#1a1a2e] focus:border-[#FF4D9D]"}`}
                      style={{ direction: "ltr" }}
                    />
                    <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {amount && (
                        <button
                          onClick={() => setAmount("")}
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
                      <span className={`font-nums text-lg tracking-wider ${tokensOut > 0 ? "text-[#4CAF50]" : "text-gray-300"}`}>
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
                  <button
                    onClick={handleApeIn}
                    disabled={!!amountError || amount === ""}
                    className="btn-meme w-full h-14 text-2xl rounded-xl font-display tracking-wider text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                    style={{ background: "linear-gradient(135deg, #4CAF50 0%, #FF4D9D 100%)" }}
                  >
                    {t.presale.apeIn}
                  </button>

                  {txSignature && (
                    <div className="bg-[#E8F5E9] border-2 border-[#4CAF50] rounded-xl p-3 flex items-start gap-2">
                      <Check className="h-4 w-4 text-[#4CAF50] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-display text-[#1a4a1e] tracking-wide font-bold">Transaction confirmed! 🎉</p>
                        <a
                          href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                          target="_blank" rel="noreferrer"
                          className="text-[10px] text-[#4CAF50] underline break-all flex items-center gap-1 mt-0.5"
                        >
                          {txSignature.slice(0, 20)}…{txSignature.slice(-8)}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-center text-xs text-[#1a1a2e]/40 font-bold">{t.presale.disclaimer}</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <div className="sticker bg-[#FF4D9D] text-white mb-3 text-sm inline-block" style={{ transform: "rotate(2deg)" }}>{t.presale.referralBanner}</div>
                <h3 className="text-4xl font-display text-[#1a1a2e] tracking-wider comic-shadow mb-1">{t.presale.shillEarn}</h3>
                <p className="text-[#1a1a2e]/60 font-bold">{t.presale.shillDesc}</p>
              </div>

              <div className="meme-card bg-white rounded-2xl overflow-hidden">
                <div className="zigzag-border" />
                <div className="p-5 space-y-5">
                  {/* Referral link — connect wallet to reveal */}
                  <div>
                    <p className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-2">{t.presale.yourLink}</p>
                    {address && myRefUrl ? (
                      <div className="flex gap-2">
                        <Input readOnly value={myRefUrl} className="h-10 rounded-xl border-2 border-[#1a1a2e] bg-[#FFFDE7] font-mono text-xs" />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(myRefUrl);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className={`btn-meme h-10 px-3 rounded-xl shrink-0 ${copied ? "bg-[#4CAF50]" : "bg-[#FFD54F]"} text-[#1a1a2e]`}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : (
                      <div className="h-10 rounded-xl border-2 border-dashed border-[#1a1a2e]/20 bg-[#FFFDE7] flex items-center px-3">
                        <span className="font-display text-xs text-[#1a1a2e]/40 tracking-wider">
                          {status === "connecting" ? "⏳ جاري الاتصال…" : "🔌 وصّل محفظتك لعرض رابطك"}
                        </span>
                      </div>
                    )}
                    {copied && <p className="text-xs text-[#4CAF50] font-display tracking-wide mt-1">{t.presale.copied}</p>}
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        l: t.presale.shilled,
                        v: refStats ? String(refStats.totalReferrals) : (address ? "…" : "0"),
                        c: "text-[#4CAF50]",
                        bg: "bg-[#E8F5E9]",
                        bc: "border-[#4CAF50]",
                      },
                      {
                        l: t.presale.pending,
                        v: refStats ? `${formatTokens(refStats.pendingTokens)} PWIFE` : (address ? "…" : "0 PWIFE"),
                        c: "text-[#FF4D9D]",
                        bg: "bg-[#FCE4EC]",
                        bc: "border-[#FF4D9D]",
                      },
                      {
                        l: t.presale.rate,
                        v: "5%",
                        c: "text-[#b8860b]",
                        bg: "bg-[#FFFDE7]",
                        bc: "border-[#FFD54F]",
                      },
                    ].map(s => (
                      <div key={s.l} className={`${s.bg} rounded-xl p-2.5 text-center border-2 ${s.bc}`}>
                        <div className={`text-xl font-display ${s.c} tracking-wider`}>{s.v}</div>
                        <div className="text-[10px] font-display text-[#1a1a2e]/40 tracking-wider mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="meme-card bg-white rounded-2xl p-5">
                <h4 className="font-display text-lg text-[#1a1a2e] mb-3 tracking-wider">{t.presale.topShillers}</h4>
                <div className="space-y-2">
                  {leaderboard.length === 0
                    ? [{ r: "🥇" }, { r: "🥈" }, { r: "🥉" }].map((x, i) => (
                        <div key={`shiller-ph-${i}`} className="flex items-center gap-2 bg-[#FFFDE7] rounded-xl px-3 py-2 border-2 border-[#FFD54F]/50">
                          <span className="text-lg">{x.r}</span>
                          <span className="font-mono text-xs text-[#1a1a2e]/50 flex-1">---</span>
                          <span className="text-xs font-display text-[#4CAF50] tracking-wide">0 PWIFE</span>
                        </div>
                      ))
                    : leaderboard.slice(0, 3).map((entry, i) => (
                        <div key={`shiller-${i}`} className="flex items-center gap-2 bg-[#FFFDE7] rounded-xl px-3 py-2 border-2 border-[#FFD54F]/50">
                          <span className="text-lg">{["🥇", "🥈", "🥉"][i]}</span>
                          <span className="font-mono text-xs text-[#1a1a2e]/50 flex-1">{entry.walletAddress}</span>
                          <span className="text-xs font-display text-[#4CAF50] tracking-wide">{formatTokens(entry.totalRewardTokens)} PWIFE</span>
                        </div>
                      ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section id="why" className="py-24 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #F3E5F5, #FFFDE7)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="sticker bg-[#FFD54F] text-[#1a1a2e] mb-4 text-lg inline-block" style={{ transform: "rotate(1deg)" }}>{t.whyBuy.banner}</div>
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-4">{t.whyBuy.title}</h2>
            <p className="text-lg text-[#1a1a2e]/60 max-w-2xl mx-auto font-bold">{t.whyBuy.subtitle}</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { emoji: "📈", c: "#4CAF50", title: t.whyBuy.card1Title, desc: t.whyBuy.card1Desc },
                { emoji: "🫂", c: "#FF4D9D", title: t.whyBuy.card2Title, desc: t.whyBuy.card2Desc },
                { emoji: "⚡", c: "#FFD54F", title: t.whyBuy.card3Title, desc: t.whyBuy.card3Desc },
                { emoji: "🧠", c: "#AB47BC", title: t.whyBuy.card4Title, desc: t.whyBuy.card4Desc },
              ].map(card => (
                <div key={card.title} className="meme-card bg-white rounded-2xl p-6 cursor-pointer">
                  <div className="text-4xl mb-3">{card.emoji}</div>
                  <h3 className="font-display text-xl mb-2 text-[#1a1a2e] tracking-wider" style={{ color: card.c }}>{card.title}</h3>
                  <p className="text-[#1a1a2e]/60 text-sm font-bold leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="meme-card bg-gradient-to-br from-[#1a1a2e] to-[#311B92] rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#4CAF50]/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#FF4D9D]/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="h-8 w-8 text-[#4CAF50]" />
                  <h3 className="font-display text-2xl tracking-wider">{t.security.title}</h3>
                </div>
                <p className="text-white/50 text-sm font-bold mb-6">{t.security.subtitle}</p>

                <div className="space-y-4 mb-6">
                  {[
                    { icon: "🔒", title: t.security.liquidityLock, desc: t.security.liquidityLockDesc, color: "#4CAF50", duration: "12M" },
                    { icon: "⏳", title: t.security.teamVesting, desc: t.security.teamVestingDesc, color: "#FF9800", duration: "12M" },
                    { icon: "🚫", title: t.security.freezeDisabled, desc: t.security.freezeDisabledDesc, color: "#FF4D9D", duration: "∞" },
                    { icon: "🛡️", title: t.security.mintRevoked, desc: t.security.mintRevokedDesc, color: "#42A5F5", duration: "∞" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-white/5 rounded-2xl p-3 backdrop-blur-sm border border-white/10">
                      <div className="text-2xl shrink-0">{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-sm tracking-wider" style={{ color: item.color }}>{item.title}</span>
                          <span className="text-[10px] font-display bg-white/10 px-2 py-0.5 rounded-full text-white/60">{item.duration}</span>
                        </div>
                        <p className="text-white/40 text-xs font-bold leading-relaxed mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                    <div className="text-[10px] text-white/40 font-bold uppercase">{t.security.network}</div>
                    <div className="font-display text-[#AB47BC] tracking-wider text-sm">Solana (SPL)</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                    <div className="text-[10px] text-white/40 font-bold uppercase">{t.security.symbol}</div>
                    <div className="font-display text-[#FF4D9D] tracking-wider text-sm">$PWIFE</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                    <div className="text-[10px] text-white/40 font-bold uppercase">{t.security.tokenName}</div>
                    <div className="font-display text-[#FFD54F] tracking-wider text-sm">PEPEWIFE</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                    <div className="text-[10px] text-white/40 font-bold uppercase">{t.security.totalSupply}</div>
                    <div className="font-display text-[#4CAF50] tracking-wider text-sm">100T</div>
                  </div>
                </div>

                <div className="mt-4 bg-white/5 rounded-2xl p-4 border border-white/10">
                  <div className="text-[10px] text-white/40 font-bold uppercase mb-2">{t.security.contractAddress}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 font-mono text-sm text-white/30 tracking-wide overflow-hidden text-ellipsis whitespace-nowrap">
                      {t.security.comingSoon}
                    </div>
                    <button
                      disabled
                      className="shrink-0 bg-white/10 hover:bg-white/20 rounded-xl p-2.5 border border-white/10 text-white/30 cursor-not-allowed transition-colors"
                      title={t.security.comingSoon}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <span className="inline-flex items-center gap-2 bg-[#4CAF50]/20 text-[#4CAF50] font-display text-xs px-4 py-1.5 rounded-full border border-[#4CAF50]/30 tracking-wider">
                    <ShieldCheck className="h-3.5 w-3.5" /> {t.security.contractBadge}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section id="how" className="py-24 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #E8F5E9, #E3F2FD)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="sticker bg-[#4CAF50] text-white mb-4 text-lg inline-block" style={{ transform: "rotate(-1deg)" }}>{t.howTo.banner}</div>
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-4">{t.howTo.title}</h2>
            <p className="text-lg text-[#1a1a2e]/60 font-bold">{t.howTo.subtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { s: t.howTo.step01, e: "👛", title: t.howTo.step01Title, d: t.howTo.step01Desc },
              { s: t.howTo.step02, e: "💱", title: t.howTo.step02Title, d: t.howTo.step02Desc },
              { s: t.howTo.step03, e: "✏️", title: t.howTo.step03Title, d: t.howTo.step03Desc },
              { s: t.howTo.step04, e: "🚀", title: t.howTo.step04Title, d: t.howTo.step04Desc },
              { s: t.howTo.step05, e: "🎉", title: t.howTo.step05Title, d: t.howTo.step05Desc },
            ].map(step => (
              <div key={step.s} className="meme-card bg-white rounded-2xl p-5 text-center">
                <div className="text-4xl mb-2">{step.e}</div>
                <div className="sticker bg-[#4CAF50] text-white text-xs mb-2 inline-block">{step.s}</div>
                <h3 className="font-display text-lg mb-1 text-[#1a1a2e] tracking-wider">{step.title}</h3>
                <p className="text-[#1a1a2e]/50 text-xs font-bold leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => scrollTo('presale')} className="btn-meme bg-[#4CAF50] text-white rounded-2xl h-14 px-10 text-2xl font-display tracking-wider">
              {t.howTo.ready}
            </button>
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section id="tokenomics" className="py-24 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #FFFDE7, #FCE4EC)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className={`flex justify-center ${isRTL ? "md:order-last" : ""}`}>
              <img src="/tokenomics-girl.png" alt="PEPEWIFE tokenomics distribution chart showing 100 trillion PWIFE total supply" loading="lazy" className={`w-full max-w-lg object-contain drop-shadow-2xl ${isRTL ? "scale-x-[-1]" : ""}`} />
            </div>
            <div className={`space-y-6 ${isRTL ? "md:order-first text-start" : ""}`}>
              <div>
                <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-3">{t.tokenomics.title}</h2>
                <p className="text-lg text-[#1a1a2e]/60 font-bold">{t.tokenomics.totalSupply} <span className="font-display text-2xl text-[#4CAF50]">100,000,000,000,000 PWIFE (100T)</span> 🐸</p>
              </div>
              <div className="space-y-2">
                {tokenomicsData.map((item, idx) => (
                  <div key={idx} className="meme-card flex items-center gap-3 p-3 rounded-2xl bg-white cursor-pointer">
                    <div className="w-5 h-5 rounded-full shrink-0 border-2 border-[#1a1a2e]" style={{ backgroundColor: item.color }} />
                    <div className="flex-1">
                      <div className="font-display text-[#1a1a2e] text-sm tracking-wider">{item.name}</div>
                      <div className="text-xs text-[#1a1a2e]/40 font-bold">{item.value}T PWIFE</div>
                    </div>
                    <div className="font-display text-2xl text-[#1a1a2e] tracking-wider">{item.value}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section id="roadmap" className="py-24 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #E3F2FD, #E8F5E9)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider">{t.roadmap.title}</h2>
            <p className="text-lg text-[#1a1a2e]/50 font-bold mt-2">{t.roadmap.subtitle}</p>
          </div>
          <div className="space-y-6">
            {[
              { phase: t.roadmap.phase1, title: t.roadmap.phase1Title, desc: t.roadmap.phase1Desc, active: true, img: "/roadmap-phase1.png", color: "#4CAF50", meme: t.roadmap.phase1Meme },
              { phase: t.roadmap.phase2, title: t.roadmap.phase2Title, desc: t.roadmap.phase2Desc, active: false, img: "/roadmap-phase2.png", color: "#FF4D9D", meme: t.roadmap.phase2Meme },
              { phase: t.roadmap.phase3, title: t.roadmap.phase3Title, desc: t.roadmap.phase3Desc, active: false, img: "/roadmap-phase3.png", color: "#42A5F5", meme: t.roadmap.phase3Meme },
              { phase: t.roadmap.phase4, title: t.roadmap.phase4Title, desc: t.roadmap.phase4Desc, active: false, img: "/roadmap-phase4.png", color: "#AB47BC", meme: t.roadmap.phase4Meme },
              { phase: t.roadmap.phase5, title: t.roadmap.phase5Title, desc: t.roadmap.phase5Desc, active: false, img: "/roadmap-phase4.png", color: "#FF9800", meme: t.roadmap.phase5Meme },
            ].map((step, i) => (
              <div key={i} className={`meme-card flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl bg-white ${step.active ? `border-[#4CAF50] ${isRTL ? "shadow-[-6px_6px_0px_#2E7D32]" : "shadow-[6px_6px_0px_#2E7D32]"}` : ""}`}>
                <img src={step.img} alt={`PEPEWIFE roadmap ${step.title}`} loading="lazy" className={`w-28 h-28 object-contain shrink-0 drop-shadow-lg ${isRTL ? "md:order-last" : ""}`} />
                <div className="flex-1 text-center md:text-start">
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                    <span className="sticker text-white text-xs" style={{ backgroundColor: step.color, transform: "rotate(-1deg)" }}>{step.phase}</span>
                    {step.active && <span className="sticker bg-[#FFD54F] text-[#1a1a2e] text-xs" style={{ transform: "rotate(2deg)" }}>{step.meme}</span>}
                  </div>
                  <h3 className="text-2xl font-display text-[#1a1a2e] tracking-wider mb-1">{step.title}</h3>
                  <p className="text-[#1a1a2e]/60 text-sm font-bold">{step.desc}</p>
                  {!step.active && <span className="text-xs font-display text-[#1a1a2e]/30 tracking-wider">{step.meme}</span>}
                </div>
                {step.active && <ChevronRight className="h-8 w-8 text-[#4CAF50] hidden md:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section className="py-24 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #FFF9C4, #F3E5F5)" }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-display text-center mb-4 text-[#1a1a2e] comic-shadow tracking-wider">{t.social.title}</h2>
          <div className="flex items-center justify-center gap-2 mb-10">
            <Twitter className="h-5 w-5 text-[#1DA1F2]" />
            <a
              href="https://twitter.com/ThePepeWife"
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-[#1DA1F2] text-lg tracking-wide hover:underline"
            >
              @ThePepeWife
            </a>
          </div>
          <TwitterFeed username="ThePepeWife" />
        </div>
      </section>

      <div className="zigzag-border" />

      <section className="py-8 px-4" style={{ background: "#FFF9C4" }}>
        <div className="max-w-4xl mx-auto">
          <div className="meme-card bg-white rounded-2xl p-5 border-[#FFD54F] shadow-[4px_4px_0px_#F9A825]">
            <h3 className="font-display text-lg text-[#b8860b] mb-1 tracking-wider">{t.risk.title}</h3>
            <p className="text-[#1a1a2e]/60 text-sm font-bold leading-relaxed">
              {t.risk.text}
            </p>
          </div>
        </div>
      </section>

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
          amount={parseFloat(amount)}
          currency={currency as "SOL" | "USDT_SPL"}
          presaleData={presaleData}
          onClose={() => setShowBuyModal(false)}
          onSuccess={handleBuySuccess}
        />
      )}
    </div>
  );
}
