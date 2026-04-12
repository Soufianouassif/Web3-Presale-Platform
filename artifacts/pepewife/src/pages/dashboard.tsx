import React, { useState, useEffect, useCallback } from "react";
import { Menu, X, Twitter, Send, Wallet, Copy, Check, ChevronDown, Shield, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiSolana, SiTether } from "react-icons/si";
import { useLocation } from "wouter";
import { useLanguage } from "@/i18n/context";
import LanguageSwitcher from "@/components/language-switcher";
import SEOHead from "@/components/seo-head";
import { useWallet } from "@/contexts/wallet-context";
import { useToast } from "@/components/wallet-toast";
import { tracker, fetchPublicPresaleConfig, fetchPublicActivity, fetchMyPurchases, type PublicPresaleConfig, type PublicActivity, type ActivityResponse, type MyPurchase } from "@/lib/admin-api";
import WalletBuyModal from "@/components/wallet-buy-modal";
import {
  fetchPresaleState,
  fetchBuyerState,
  fetchBuyerTransactions,
  stageTokenPriceUsd,
  IS_DEVNET,
  type PresaleState,
  type BuyerState,
  type BuyerTx,
  buildExplorerUrl,
} from "@/lib/presale-contract";
import {
  fetchOrCreateReferralCode,
  fetchReferralStats,
  fetchLeaderboard,
  buildReferralUrl,
  captureReferralFromUrl,
  formatTokens,
  getStoredReferralCode,
  clearStoredReferralCode,
  type ReferralStats,
  type LeaderboardEntry,
} from "@/lib/referral";

export default function Dashboard() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currency, setCurrency] = useState<"SOL" | "USDT_SPL">("SOL");
  const [buyAmount, setBuyAmount] = useState("");
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [dashTxSig, setDashTxSig] = useState<string | null>(null);
  const [presaleData, setPresaleData] = useState<PresaleState | null>(null);
  const [siteConfig, setSiteConfig] = useState<PublicPresaleConfig>({ isActive: true, claimEnabled: false, stakingEnabled: false, currentStage: 1 });
  const [solPrice, setSolPrice] = useState<number>(0);
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState<Date | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [buyerState, setBuyerState] = useState<BuyerState | null>(null);
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [buyerTxs, setBuyerTxs] = useState<BuyerTx[]>([]);
  const [buyerTxsLoading, setBuyerTxsLoading] = useState(false);
  const [activityFeed, setActivityFeed] = useState<PublicActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityHasMore, setActivityHasMore] = useState(false);
  const [activityOffset, setActivityOffset] = useState(0);
  const [myDbPurchases, setMyDbPurchases] = useState<MyPurchase[]>([]);
  const [myDbLoading, setMyDbLoading] = useState(false);
  const [txView, setTxView] = useState<"mine" | "all">("all");
  const [calcAmount, setCalcAmount] = useState("");
  const { t, dir } = useLanguage();
  const isRTL = dir === "rtl";
  const { status, shortAddress, address, network, disconnect } = useWallet();
  const { showSuccess } = useToast();
  const [walletCopied, setWalletCopied] = useState(false);

  const walletAddress = shortAddress || "7xKp...4mNr";
  const fullWallet = address || "7xKp4mNrQ9vB...kL2xNw";
  const [, navigate] = useLocation();

  // ── Referral state ────────────────────────────────────────────────────────
  const [myRefCode, setMyRefCode] = useState<string | null>(null);
  const [refStats, setRefStats] = useState<ReferralStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [refCopied, setRefCopied] = useState(false);
  const [refLoading, setRefLoading] = useState(false);
  const [refLastUpdated, setRefLastUpdated] = useState<Date | null>(null);

  const myRefUrl = myRefCode ? buildReferralUrl(myRefCode) : "";

  useEffect(() => {
    if (status === "disconnected" || status === "error") {
      navigate("/connect");
    }
  }, [status, navigate]);

  // ── Page visit tracking ──────────────────────────────────────────────────
  useEffect(() => {
    tracker.visit("/dashboard");
    // التقط كود الإحالة من URL عند دخول الصفحة (حالة ?ref=CODE في رابط مباشر)
    captureReferralFromUrl();
  }, []);

  // ── Referral data refresh ────────────────────────────────────────────────
  const refreshReferralData = useCallback(async () => {
    setRefLoading(true);
    try {
      const [lb, statsResult, codeResult] = await Promise.all([
        fetchLeaderboard(),
        address ? fetchReferralStats(address) : Promise.resolve(null),
        address ? fetchOrCreateReferralCode(address) : Promise.resolve(null),
      ]);
      setLeaderboard(lb);
      if (statsResult) {
        setRefStats(statsResult);
        if (statsResult.code) setMyRefCode(statsResult.code);
      }
      if (codeResult) setMyRefCode(codeResult);
      setRefLastUpdated(new Date());
    } finally {
      setRefLoading(false);
    }
  }, [address]);

  // ── Load referral data when address is available ──────────────────────────
  useEffect(() => {
    refreshReferralData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // ── تحديث فوري + تلقائي كل 30 ثانية عند فتح تاب الإحالة ────────────────
  useEffect(() => {
    if (activeTab !== "referrals") return;
    refreshReferralData();
    const iv = setInterval(() => refreshReferralData(), 30_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, address]);

  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // ── Price feed — via API to avoid CORS ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPricesLoading(true);
      try {
        const r = await fetch("/api/sol-price");
        if (!r.ok) throw new Error();
        const d = await r.json() as { price?: number };
        if (!cancelled) {
          if (d?.price && d.price > 0) setSolPrice(d.price);
          setPricesUpdatedAt(new Date());
        }
      } catch { /* keep fallback */ } finally { if (!cancelled) setPricesLoading(false); }
    };
    load();
    const iv = setInterval(load, 2 * 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // ── Presale state + site config (auto-refresh every 30s) ─────────────────────
  useEffect(() => {
    const refresh = () => {
      fetchPresaleState().then(s => { if (s) setPresaleData(s); }).catch(() => {});
    };
    refresh();
    fetchPublicPresaleConfig().then(cfg => setSiteConfig(cfg));
    const iv = setInterval(refresh, 30_000);
    return () => clearInterval(iv);
  }, []);

  // ── Global activity feed (auto-refresh every 30s, resets to first page) ──
  useEffect(() => {
    const load = () => {
      setActivityLoading(true);
      fetchPublicActivity(0)
        .then(res => { setActivityFeed(res.activity); setActivityHasMore(res.hasMore); setActivityOffset(res.activity.length); })
        .finally(() => setActivityLoading(false));
    };
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  // ── Buyer on-chain data — تحديث تلقائي كل 30 ثانية ──────────────────────────
  useEffect(() => {
    if (!address) { setBuyerState(null); setBuyerTxs([]); setMyDbPurchases([]); return; }
    const load = () => {
      setBuyerLoading(true);
      fetchBuyerState(address)
        .then(b => setBuyerState(b))
        .finally(() => setBuyerLoading(false));
      setBuyerTxsLoading(true);
      fetchBuyerTransactions(address)
        .then(txs => setBuyerTxs(txs))
        .finally(() => setBuyerTxsLoading(false));
      setMyDbLoading(true);
      fetchMyPurchases(address)
        .then(p => setMyDbPurchases(p))
        .finally(() => setMyDbLoading(false));
    };
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [address]);

  // ── Buy box constants & computations ────────────────────────────────────────
  const LIMITS = {
    SOL:      { min: 1,    max: 50 },
    USDT_SPL: { min: 100,  max: 10000 },
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

  const fmt = (n: number) => {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9)  return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6)  return (n / 1e6).toFixed(2) + "M";
    return n.toLocaleString();
  };

  const P = ({ v, className = "", style }: { v: string; className?: string; style?: React.CSSProperties }) => {
    const num = parseFloat(v.replace(/\$/g, ""));
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

  const STAGE_FALLBACK_PRICES = ["$0.00000001", "$0.00000002", "$0.00000004", "$0.00000006"];
  const STAGE_COLORS = ["#4CAF50", "#FF4D9D", "#FFD54F", "#4CAF50"];
  const STAGE_DATA = STAGE_FALLBACK_PRICES.map((fallbackPrice, i) => {
    const cs = presaleData?.stages[i];
    const tokens = cs ? Number(cs.maxTokens)  : 5_000_000_000_000;
    const sold   = cs ? Number(cs.tokensSold) : 0;
    const priceNum = cs ? stageTokenPriceUsd(cs.tokensPerRawUsdtScaled) : 0;
    const price  = cs
      ? `$${priceNum.toFixed(10).replace(/\.?0+$/, "")}`
      : fallbackPrice;
    const soldUsd = sold * priceNum;
    return { stage: i + 1, price, tokens, sold, soldUsd, color: STAGE_COLORS[i] };
  });
  const LISTING_PRICE = "$0.061327";
  const currentStage = presaleData ? presaleData.currentStage : 0;
  const totalSold = STAGE_DATA.reduce((a, s) => a + s.sold, 0);
  const totalTokens = STAGE_DATA.reduce((a, s) => a + s.tokens, 0);
  const presaleFilled = Math.round((totalSold / totalTokens) * 100);

  const stagePrice = parseFloat(STAGE_DATA[currentStage].price.replace(/\$/g, ""));
  const calcAmountNum = parseFloat(calcAmount);
  const calcTokensResult = stagePrice > 0 && !isNaN(calcAmountNum) && calcAmountNum > 0
    ? Math.floor(calcAmountNum / stagePrice)
    : 0;

  const amountUSD = !isNaN(amountNum) && buyAmount !== ""
    ? currency === "SOL" ? amountNum * solPrice
    : amountNum
    : 0;
  const tokensOut = stagePrice > 0 && amountUSD > 0 ? Math.floor(amountUSD / stagePrice) : 0;

  // ── Buyer derived values ─────────────────────────────────────────────────────
  const LAMPORTS = 1_000_000_000;
  const USDT_DECIMALS = 1_000_000;
  const userPwife     = buyerState ? Number(buyerState.totalTokens) : 0;
  const userSolPaid   = buyerState ? Number(buyerState.solPaid) / LAMPORTS : 0;
  const userUsdtPaid  = buyerState ? Number(buyerState.usdtPaid) / USDT_DECIMALS : 0;
  const userTotalUSD  = userSolPaid * solPrice + userUsdtPaid;
  const hasPurchased  = userPwife > 0;

  const refreshBuyerData = () => {
    if (!address) return;
    fetchBuyerState(address).then(b => setBuyerState(b)).catch(() => {});
    fetchBuyerTransactions(address).then(txs => setBuyerTxs(txs)).catch(() => {});
    fetchPresaleState().then(s => { if (s) setPresaleData(s); }).catch(() => {});
    refreshReferralData();
  };

  // ── نجاح الشراء: يُبلّغ الباك إند ويتحقق على Devnet ───────────────────────
  // يُعيد { verified, error? } للـ modal الذي ينتظر النتيجة قبل عرض success أو error.
  const handleDashBuySuccess = async (sig: string): Promise<{ verified: boolean; error?: string }> => {
    // احفظ القيم قبل أي تغيير في الـ state (React state is async)
    const capturedAmount    = buyAmount;
    const capturedCurrency  = currency;
    const capturedAmountNum = parseFloat(capturedAmount) || 0;
    const effectiveSolPrice = solPrice > 0 ? solPrice : 150;
    const capturedUsd = capturedCurrency === "SOL"
      ? capturedAmountNum * effectiveSolPrice
      : capturedAmountNum;
    const capturedStageIdx = presaleData?.currentStage ?? 0;
    const capturedPricePerToken = parseFloat(
      STAGE_DATA[capturedStageIdx]?.price?.replace(/\$/g, "") || "0.00000001",
    );
    const capturedTokens = capturedPricePerToken > 0 ? capturedUsd / capturedPricePerToken : 0;

    // اقرأ كود الإحالة من localStorage قبل إرسال الطلب
    const refCode = getStoredReferralCode();
    const networkField = IS_DEVNET ? "devnet" : "mainnet";

    console.log(
      "[DashBuySuccess] Sending to backend:",
      { txHash: sig.slice(0, 16), network: networkField, refCode, currency: capturedCurrency, usd: capturedUsd, tokens: capturedTokens },
    );

    // أرسل للـ backend وانتظر التحقق من Devnet
    const result = await tracker.purchase({
      walletAddress:  address ?? "",
      network:        networkField,  // "devnet" أو "mainnet" — ليس "solana"
      amountUsd:      capturedUsd,
      amountTokens:   capturedTokens,
      txHash:         sig,
      stage:          capturedStageIdx + 1,
      referralCode:   refCode ?? undefined,
    });

    if (result.success) {
      console.log("[DashBuySuccess] ✓ Backend verification passed, purchaseId=", result.purchaseId);
      // نظّف الـ state بعد نجاح التحقق
      setDashTxSig(sig);
      setBuyAmount("");
      if (refCode) {
        console.log("[DashBuySuccess] Clearing referral code from storage");
        clearStoredReferralCode();
      }
      // حدّث البيانات بعد 3 ثوانٍ
      setTimeout(() => refreshBuyerData(), 3000);
      return { verified: true };
    } else {
      console.warn("[DashBuySuccess] ✗ Backend verification failed:", result.error, result.reason);
      // لا نغلق الـ modal — سيُظهر رسالة الخطأ للمستخدم
      return {
        verified: false,
        error: result.reason
          ? `Transaction verification failed on Devnet: ${result.reason}`
          : (result.error ?? "Purchase could not be confirmed by the server."),
      };
    }
  };

  type StageStatus = "active" | "sold-out" | "upcoming";
  function fmtUsd(n: number): string {
    if (!presaleData || n === 0) return "—";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  }
  const presaleStages: Array<{ stage: number; name: string; price: string; tokens: string; soldRaw: number; pct: number; total: string; status: StageStatus; color: string; shadow: string; emoji: string }> = [
    { stage: 1, name: t.dashboard.earlyBird, price: STAGE_DATA[0].price, tokens: fmt(STAGE_DATA[0].tokens), soldRaw: STAGE_DATA[0].sold, pct: Math.min(100, Math.round((STAGE_DATA[0].sold / STAGE_DATA[0].tokens) * 100)), total: fmtUsd(STAGE_DATA[0].soldUsd), status: currentStage === 0 ? "active" : currentStage > 0 ? "sold-out" : "upcoming", color: "#4CAF50", shadow: "#2E7D32", emoji: currentStage > 0 ? "✅" : currentStage === 0 ? "🔥" : "🔒" },
    { stage: 2, name: t.dashboard.community, price: STAGE_DATA[1].price, tokens: fmt(STAGE_DATA[1].tokens), soldRaw: STAGE_DATA[1].sold, pct: Math.min(100, Math.round((STAGE_DATA[1].sold / STAGE_DATA[1].tokens) * 100)), total: fmtUsd(STAGE_DATA[1].soldUsd), status: currentStage === 1 ? "active" : currentStage > 1 ? "sold-out" : "upcoming", color: "#FF4D9D", shadow: "#C2185B", emoji: currentStage > 1 ? "✅" : currentStage === 1 ? "🔥" : "🔒" },
    { stage: 3, name: t.dashboard.growth, price: STAGE_DATA[2].price, tokens: fmt(STAGE_DATA[2].tokens), soldRaw: STAGE_DATA[2].sold, pct: Math.min(100, Math.round((STAGE_DATA[2].sold / STAGE_DATA[2].tokens) * 100)), total: fmtUsd(STAGE_DATA[2].soldUsd), status: currentStage === 2 ? "active" : currentStage > 2 ? "sold-out" : "upcoming", color: "#4CAF50", shadow: "#2E7D32", emoji: currentStage > 2 ? "✅" : currentStage === 2 ? "🔥" : "🔒" },
    { stage: 4, name: t.dashboard.final, price: STAGE_DATA[3].price, tokens: fmt(STAGE_DATA[3].tokens), soldRaw: STAGE_DATA[3].sold, pct: Math.min(100, Math.round((STAGE_DATA[3].sold / STAGE_DATA[3].tokens) * 100)), total: fmtUsd(STAGE_DATA[3].soldUsd), status: currentStage === 3 ? "active" : currentStage > 3 ? "sold-out" : "upcoming", color: "#FF4D9D", shadow: "#C2185B", emoji: currentStage > 3 ? "✅" : currentStage === 3 ? "🔥" : "🔒" },
  ];

  const tabs = [
    { id: "overview", label: t.dashboard.overview, icon: "📊" },
    { id: "purchases", label: t.dashboard.myPurchases, icon: "🛒" },
    { id: "claim", label: t.dashboard.claim, icon: "🎁" },
    { id: "calculator", label: t.calculator.title.replace(" 🧮", ""), icon: "🧮" },
    { id: "airdrop", label: t.dashboard.airdrop, icon: "🪂" },
    { id: "referrals", label: t.dashboard.referrals, icon: "🤝" },
    { id: "transactions", label: t.dashboard.transactions, icon: "📜" },
  ];

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: "linear-gradient(180deg, #FFFDE7 0%, #E8F5E9 30%, #FFF9C4 60%, #FCE4EC 100%)", backgroundAttachment: "fixed" }}>
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
                <img src="/logo.webp" alt="PEPEWIFE" width="36" height="36" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#1a1a2e] shrink-0" />
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
                          className="flex items-center gap-1 text-[10px] font-display tracking-wider text-[#4CAF50] hover:text-[#2E7D32] transition-colors"
                        >
                          {walletCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {walletCopied ? t.nav.copied : t.nav.copyAddress}
                        </button>
                        <span className="text-[#1a1a2e]/10">|</span>
                        <a
                          href={`https://solscan.io/account/${address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-display tracking-wider text-[#FF4D9D] hover:text-[#C2185B] transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t.nav.viewExplorer}
                        </a>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]" />
                        <span className="text-[9px] font-display tracking-wider text-[#1a1a2e]/40">
                          Solana Mainnet
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
                  {/* ── On-chain summary cards ── */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        label: t.dashboard.tokensPurchased,
                        value: buyerLoading ? "…" : fmt(userPwife),
                        sub: "$PWIFE",
                        color: "#4CAF50", shadow: "#2E7D32", bg: "bg-[#E8F5E9]",
                      },
                      {
                        label: t.dashboard.claimableTokens,
                        value: buyerLoading ? "…" : "0",
                        sub: "$PWIFE · " + t.dashboard.pendingTge,
                        color: "#FF4D9D", shadow: "#C2185B", bg: "bg-[#FCE4EC]",
                      },
                      {
                        label: t.dashboard.referralRewards,
                        value: "0",
                        sub: "$PWIFE",
                        color: "#FF4D9D", shadow: "#C2185B", bg: "bg-[#FCE4EC]",
                      },
                      {
                        label: t.dashboard.currentStage,
                        value: presaleData ? `Stage ${presaleData.currentStage + 1}` : "—",
                        sub: presaleData?.isActive ? "🟢 LIVE" : t.dashboard.notStarted,
                        color: "#4CAF50", shadow: "#2E7D32", bg: "bg-[#FFFDE7]",
                      },
                      {
                        label: t.dashboard.totalInvested,
                        value: buyerLoading ? "…" : `$${userTotalUSD.toFixed(2)}`,
                        sub: userSolPaid > 0 ? `${userSolPaid.toFixed(3)} SOL${userUsdtPaid > 0 ? ` + ${userUsdtPaid.toFixed(2)} USDT` : ""}` : "—",
                        color: "#b8860b", shadow: "#8B6914", bg: "bg-[#FFFDE7]",
                      },
                      {
                        label: t.dashboard.bonusEarned,
                        value: "0%",
                        sub: "—",
                        color: "#4CAF50", shadow: "#2E7D32", bg: "bg-[#E8F5E9]",
                      },
                    ].map(card => (
                      <div key={card.label} className={`meme-card ${card.bg} rounded-2xl p-4 sm:p-5`} style={{ borderColor: card.color, boxShadow: `${isRTL ? "-4px" : "4px"} 4px 0px ${card.shadow}` }}>
                        <div className="text-xs font-display tracking-wider mb-1" style={{ color: card.color }}>{card.label}</div>
                        <div className="text-2xl sm:text-3xl font-nums text-[#1a1a2e] tracking-wider">{card.value}</div>
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
                            <span className="text-[#4CAF50] font-display tracking-wide">
                              🐸 {presaleData
                                ? (totalSold >= 1_000_000_000
                                    ? (totalSold / 1_000_000_000).toFixed(2) + "B"
                                    : fmt(totalSold))
                                : "…"} {t.presale.sold}
                            </span>
                            <span className="text-[#1a1a2e]/60 font-nums tracking-wide">{presaleFilled}% — Stage {currentStage + 1}/4</span>
                          </div>
                          <div dir="ltr" className="flex gap-1 h-5 rounded-full overflow-hidden border-2 border-[#1a1a2e]">
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
                            {fmt(totalSold)} / {fmt(totalTokens)} $PWIFE
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
                          <div className="grid grid-cols-2 gap-2">
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
                          </div>

                          <div className="flex items-start gap-2 bg-amber-50 border-2 border-amber-400 rounded-xl px-3 py-2 mt-2">
                            <span className="text-base mt-0.5">⚠️</span>
                            <div>
                              <p className="text-[11px] font-bold text-amber-800 leading-tight">{t.presale.warnTitle}</p>
                              <p className="text-[10px] text-amber-700 leading-tight mt-0.5">
                                {currency === "SOL" ? t.presale.warnSol : t.presale.warnSpl}
                              </p>
                            </div>
                          </div>
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
                              {t.presale.inputMax}: <span className="text-[#C2185B]">{lim.max.toLocaleString()} {currSym}</span>
                            </p>
                          )}

                          <div className={`border-2 rounded-xl px-3 py-2.5 transition-colors ${tokensOut > 0 ? "bg-[#E8F5E9] border-[#4CAF50]/50" : "bg-gray-50 border-gray-200"}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-[#1a1a2e]/50 font-bold">{t.presale.youGet}</span>
                              <span className={`font-display text-lg tracking-wider ${tokensOut > 0 ? "text-[#4CAF50]" : "text-gray-300"}`}>
                                ~ {tokensOut > 0 ? fmt(tokensOut) : "0"} $PWIFE
                              </span>
                            </div>
                            {tokensOut > 0 && currency === "SOL" && (
                              <>
                                <p className="text-[10px] text-[#1a1a2e]/30 font-bold mt-0.5 text-end">
                                  1 SOL ≈ ${solPrice.toLocaleString()} · Stage {currentStage + 1} · {STAGE_DATA[currentStage].price}/$PWIFE
                                </p>
                                <p className="text-[9px] text-[#FFD54F]/70 font-bold mt-0.5 text-end">
                                  ⚠ Estimate only — final token amount is calculated on-chain at execution time
                                </p>
                              </>
                            )}
                            {tokensOut > 0 && currency === "USDT_SPL" && (
                              <p className="text-[10px] text-[#1a1a2e]/30 font-bold mt-0.5 text-end">
                                Stage {currentStage + 1} · {STAGE_DATA[currentStage].price}/$PWIFE
                              </p>
                            )}
                          </div>

                          {dashTxSig && (
                            <div className="bg-[#E8F5E9] border-2 border-[#4CAF50] rounded-xl p-3 flex items-start gap-2">
                              <Check className="h-4 w-4 text-[#4CAF50] shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-xs font-display text-[#2E7D32] tracking-wide font-bold">Purchase confirmed! 🎉</p>
                                <a href={buildExplorerUrl(dashTxSig)} target="_blank" rel="noreferrer" className="text-[10px] text-[#4CAF50] underline break-all flex items-center gap-1 mt-0.5">
                                  {dashTxSig.slice(0, 16)}…<ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              if (!buyAmount || !!amountError) return;
                              setShowBuyModal(true);
                            }}
                            disabled={!!amountError || buyAmount === "" || !siteConfig.isActive}
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
                                    <div className="text-xs text-[#1a1a2e]/40 font-bold">{s.tokens} $PWIFE • {s.total} {t.dashboard.raised}</div>
                                  </div>
                                </div>
                                <div className="text-end">
                                  <div className="font-display text-lg tracking-wider" style={{ color: s.color }}>{s.price}</div>
                                  <span className={`inline-block text-[10px] font-display tracking-wider px-2 py-0.5 rounded-full border ${s.status === "active" ? "bg-[#FF4D9D]/10 border-[#FF4D9D] text-[#FF4D9D]" : s.status === "sold-out" ? "bg-[#4CAF50]/10 border-[#4CAF50] text-[#4CAF50]" : "bg-[#1a1a2e]/5 border-[#1a1a2e]/20 text-[#1a1a2e]/40"}`}>
                                    {s.status === "active" ? t.dashboard.live : s.status === "sold-out" ? t.dashboard.soldOut : t.dashboard.locked}
                                  </span>
                                </div>
                              </div>
                              <div dir="ltr" className="h-2.5 rounded-full bg-[#1a1a2e]/10 overflow-hidden border border-[#1a1a2e]/15">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-[10px] font-nums tracking-wider" style={{ color: s.color }}>{s.pct}% {t.dashboard.soldPercent}</span>
                                <span className="text-[10px] text-[#1a1a2e]/30 font-nums">{s.tokens} $PWIFE</span>
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
                            <div dir="ltr" className="h-3 rounded-full bg-[#1a1a2e]/10 overflow-hidden mt-1 border border-[#1a1a2e]/15">
                              <div className="h-full rounded-full bg-gradient-to-r from-[#4CAF50] via-[#FF4D9D] to-[#4CAF50] transition-all duration-700" style={{ width: `${presaleFilled}%` }} />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-[10px] font-display text-[#b8860b] tracking-wider">{fmt(totalSold)} / {fmt(totalTokens)} $PWIFE</span>
                              <span className="text-[10px] font-display text-[#b8860b] tracking-wider">{presaleFilled}%</span>
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
                            <div dir="ltr" className="h-2 rounded-full bg-[#1a1a2e]/10 overflow-hidden">
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
                <div className="space-y-5">
                  {/* ── Total summary card ── */}
                  <div className="meme-card bg-[#E8F5E9] rounded-2xl p-5 border-[#4CAF50]" style={{ boxShadow: `${isRTL ? "-4px" : "4px"} 4px 0px #2E7D32` }}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-display text-sm text-[#4CAF50] tracking-wider">{t.dashboard.totalPurchased}</div>
                        {buyerLoading ? (
                          <div className="text-2xl font-nums text-[#1a1a2e]/40 tracking-wider">…</div>
                        ) : (
                          <>
                            <div className="text-3xl font-nums text-[#1a1a2e] tracking-wider">
                              {fmt(userPwife)} <span className="text-base text-[#1a1a2e]/40">$PWIFE</span>
                            </div>
                            <div className="text-sm text-[#1a1a2e]/50 font-bold">
                              ≈ ${userTotalUSD.toFixed(2)} USD
                            </div>
                          </>
                        )}
                      </div>
                      <div className="text-5xl">🐸</div>
                    </div>
                  </div>

                  {/* ── Investment breakdown ── */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="meme-card bg-white rounded-2xl p-4 border-[#14F195]" style={{ boxShadow: `${isRTL ? "-3px" : "3px"} 3px 0px #0a9060` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <SiSolana size={16} className="text-[#14F195]" />
                        <span className="font-display text-sm text-[#0a9060] tracking-wide">SOL {t.dashboard.invested}</span>
                      </div>
                      <div className="text-2xl font-nums text-[#1a1a2e] tracking-wider">
                        {buyerLoading ? "…" : userSolPaid.toFixed(4)}
                      </div>
                      <div className="text-xs text-[#1a1a2e]/40 font-bold mt-0.5">
                        ≈ ${(userSolPaid * solPrice).toFixed(2)}
                      </div>
                    </div>
                    <div className="meme-card bg-white rounded-2xl p-4 border-[#26A17B]" style={{ boxShadow: `${isRTL ? "-3px" : "3px"} 3px 0px #1a7a5e` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <SiTether size={16} className="text-[#26A17B]" />
                        <span className="font-display text-sm text-[#1a7a5e] tracking-wide">USDT {t.dashboard.invested}</span>
                      </div>
                      <div className="text-2xl font-nums text-[#1a1a2e] tracking-wider">
                        {buyerLoading ? "…" : userUsdtPaid.toFixed(2)}
                      </div>
                      <div className="text-xs text-[#1a1a2e]/40 font-bold mt-0.5">≈ ${userUsdtPaid.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* ── Purchase detail card or empty state ── */}
                  <div className="meme-card bg-white rounded-2xl overflow-hidden">
                    <div className="zigzag-border" />
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display text-xl text-[#1a1a2e] tracking-wider">🛒 {t.dashboard.myPurchases}</h3>
                        <button onClick={refreshBuyerData} className="text-xs font-display text-[#1a1a2e]/40 hover:text-[#FF4D9D] transition-colors tracking-wide">
                          🔄 {t.dashboard.refresh ?? "Refresh"}
                        </button>
                      </div>

                      {buyerLoading ? (
                        <div className="text-center py-8">
                          <div className="text-3xl mb-2 animate-spin inline-block">⏳</div>
                          <p className="font-display text-[#1a1a2e]/40 tracking-wider text-sm">Loading on-chain data…</p>
                        </div>
                      ) : !hasPurchased ? (
                        <div className="text-center py-10">
                          <div className="text-5xl mb-3">🛒</div>
                          <p className="font-display text-lg text-[#1a1a2e]/40 tracking-wider">{t.dashboard.noPurchases}</p>
                          <p className="text-sm text-[#1a1a2e]/30 font-bold">{t.dashboard.noPurchasesDesc}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-[#E8F5E9] border-2 border-[#4CAF50]/40 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-display text-xs text-[#4CAF50] tracking-wide">$PWIFE {t.dashboard.tokensPurchased}</span>
                              <span className="font-display text-lg text-[#1a1a2e] tracking-wider">{fmt(userPwife)}</span>
                            </div>
                            <div className="text-[10px] text-[#1a1a2e]/40 font-bold">
                              Stage {currentStage + 1} · {STAGE_DATA[currentStage].price}/$PWIFE
                            </div>
                          </div>
                          {userSolPaid > 0 && (
                            <div className="bg-[#E8F5E9]/50 border border-[#14F195]/30 rounded-xl px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <SiSolana size={14} className="text-[#14F195]" />
                                <span className="text-sm font-bold text-[#1a1a2e]/70">SOL paid</span>
                              </div>
                              <span className="font-display text-[#0a9060] tracking-wide">{userSolPaid.toFixed(4)} SOL</span>
                            </div>
                          )}
                          {userUsdtPaid > 0 && (
                            <div className="bg-[#E8F5E9]/50 border border-[#26A17B]/30 rounded-xl px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <SiTether size={14} className="text-[#26A17B]" />
                                <span className="text-sm font-bold text-[#1a1a2e]/70">USDT paid</span>
                              </div>
                              <span className="font-display text-[#1a7a5e] tracking-wide">{userUsdtPaid.toFixed(2)} USDT</span>
                            </div>
                          )}
                          <div className="bg-[#FFFDE7] border border-[#FFD54F] rounded-xl px-4 py-3 flex items-center justify-between">
                            <span className="text-sm font-bold text-[#1a1a2e]/70">💰 {t.dashboard.totalInvested}</span>
                            <span className="font-display text-[#b8860b] tracking-wide">${userTotalUSD.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
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
                          <div className="text-xl font-display text-[#1a1a2e] tracking-wider">{buyerLoading ? "…" : fmt(userPwife)}</div>
                          <div className="text-xs text-[#1a1a2e]/40 font-bold">$PWIFE</div>
                        </div>
                        <div className="meme-card bg-[#FCE4EC] rounded-2xl p-4 border-[#FF4D9D] shadow-[3px_3px_0px_#C2185B]">
                          <div className="text-xs font-display text-[#FF4D9D] tracking-wider mb-1">{t.dashboard.claimable}</div>
                          <div className="text-xl font-display text-[#1a1a2e] tracking-wider">0</div>
                          <div className="text-xs text-[#1a1a2e]/40 font-bold">$PWIFE</div>
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

              {activeTab === "calculator" && (
                <div className="space-y-5">
                  {/* Header */}
                  <div className="text-center">
                    <div className="sticker bg-[#FF4D9D] text-white mb-3 text-base inline-block" style={{ transform: "rotate(-1deg)" }}>💰 {t.calculator.potentialReturns}</div>
                    <h3 className="text-3xl sm:text-4xl font-display text-[#1a1a2e] comic-shadow tracking-wider">{t.calculator.title}</h3>
                    <p className="text-[#1a1a2e]/50 font-bold text-sm mt-1">{t.calculator.subtitle}</p>
                  </div>

                  {/* Input Card */}
                  <div className="meme-card bg-white rounded-2xl overflow-hidden">
                    <div className="zigzag-border" />
                    <div className="p-5 space-y-4">
                      {/* Amount input */}
                      <div>
                        <label className="block text-xs font-display text-[#1a1a2e]/50 tracking-wider mb-2">{t.calculator.amountLabel}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display text-lg text-[#1a1a2e]/40">$</span>
                          <input
                            type="number"
                            min="0"
                            value={calcAmount}
                            onChange={e => setCalcAmount(e.target.value)}
                            placeholder={t.calculator.placeholder}
                            className="w-full h-14 pl-8 pr-4 rounded-xl border-2 border-[#1a1a2e] bg-[#FFFDE7] font-nums text-2xl text-[#1a1a2e] focus:outline-none focus:border-[#FF4D9D] transition-colors"
                          />
                        </div>
                      </div>
                      {/* Quick amounts */}
                      <div className="flex flex-wrap gap-2">
                        {["50", "100", "250", "500", "1000", "5000"].map(v => (
                          <button key={v} onClick={() => setCalcAmount(v)}
                            className={`btn-meme rounded-xl px-3 py-1.5 font-display text-sm tracking-wide border-2 transition-colors ${calcAmount === v ? "bg-[#FF4D9D] text-white border-[#1a1a2e]" : "bg-[#FFFDE7] text-[#1a1a2e] border-[#1a1a2e]/20 hover:border-[#FF4D9D]"}`}>
                            ${v}
                          </button>
                        ))}
                      </div>
                      {/* Price info row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#E8F5E9] border-2 border-[#4CAF50] rounded-2xl p-3">
                          <div className="text-[10px] font-display text-[#4CAF50] tracking-wider">{t.calculator.currentPrice}</div>
                          <div className="font-nums text-lg text-[#1a1a2e] tracking-wider" dir="ltr">{STAGE_DATA[currentStage].price}</div>
                          <div className="text-[10px] text-[#1a1a2e]/40 font-display">Stage {currentStage + 1} / $PWIFE</div>
                        </div>
                        <div className="bg-[#FCE4EC] border-2 border-[#FF4D9D] rounded-2xl p-3">
                          <div className="text-[10px] font-display text-[#FF4D9D] tracking-wider">{t.calculator.listingPrice}</div>
                          <div className="font-nums text-lg text-[#1a1a2e] tracking-wider" dir="ltr">{LISTING_PRICE}</div>
                          <div className="text-[10px] text-[#1a1a2e]/40 font-display">CEX / $PWIFE</div>
                        </div>
                      </div>
                      {/* Tokens you get */}
                      {calcTokensResult > 0 && (
                        <div className="bg-[#FFFDE7] border-2 border-[#FFD54F] rounded-2xl p-4 shadow-[3px_3px_0px_#F9A825]">
                          <div className="text-xs font-display text-[#b8860b] tracking-wider mb-1">{t.calculator.youGet}</div>
                          <div className="font-nums text-3xl text-[#1a1a2e] tracking-wider" dir="ltr">
                            {calcTokensResult >= 1e12 ? (calcTokensResult / 1e12).toFixed(2) + "T"
                              : calcTokensResult >= 1e9 ? (calcTokensResult / 1e9).toFixed(2) + "B"
                              : calcTokensResult >= 1e6 ? (calcTokensResult / 1e6).toFixed(2) + "M"
                              : calcTokensResult.toLocaleString()}
                          </div>
                          <div className="text-xs text-[#1a1a2e]/40 font-display tracking-wide">$PWIFE tokens</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ROI Table */}
                  <div className="meme-card bg-white rounded-2xl overflow-hidden">
                    <div className="zigzag-border" />
                    <div className="p-5">
                      <div className="text-xs font-display text-[#1a1a2e]/50 tracking-wider mb-3">{t.calculator.potentialReturns}</div>
                      {calcTokensResult === 0 ? (
                        <div className="text-center py-10 text-[#1a1a2e]/30 font-display text-sm tracking-wider">
                          👆 {t.calculator.enterAmount}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {[
                            { label: t.calculator.atListing, price: parseFloat(LISTING_PRICE.replace("$", "")),       color: "#4CAF50", bg: "#E8F5E9", border: "#4CAF50" },
                            { label: "5x",                   price: parseFloat(LISTING_PRICE.replace("$", "")) * 5,   color: "#4CAF50", bg: "#FFFDE7", border: "#4CAF50" },
                            { label: "10x",                  price: parseFloat(LISTING_PRICE.replace("$", "")) * 10,  color: "#FF4D9D", bg: "#FCE4EC", border: "#FF4D9D" },
                            { label: "50x",                  price: parseFloat(LISTING_PRICE.replace("$", "")) * 50,  color: "#FF4D9D", bg: "#FCE4EC", border: "#FF4D9D" },
                            { label: "100x",                 price: parseFloat(LISTING_PRICE.replace("$", "")) * 100, color: "#FFD54F", bg: "#FFFDE7", border: "#F9A825" },
                          ].map(row => {
                            const val = calcTokensResult * row.price;
                            const invested = parseFloat(calcAmount || "0");
                            const profit = val - invested;
                            const fmtVal = (n: number) =>
                              n >= 1e9 ? "$" + (n / 1e9).toFixed(2) + "B"
                              : n >= 1e6 ? "$" + (n / 1e6).toFixed(2) + "M"
                              : "$" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
                            return (
                              <div key={row.label} className="flex items-center justify-between rounded-xl border-2 px-4 py-3" style={{ background: row.bg, borderColor: row.border }}>
                                <div className="flex items-center gap-2">
                                  <span className="font-display text-sm tracking-wider" style={{ color: row.color }}>{row.label}</span>
                                  <span className="text-[10px] text-[#1a1a2e]/30 font-display" dir="ltr">@ ${row.price >= 1 ? row.price.toFixed(2) : row.price < 0.001 ? row.price.toFixed(8) : row.price.toFixed(4)}</span>
                                </div>
                                <div className="text-end" dir="ltr">
                                  <div className="font-nums text-base text-[#1a1a2e] tracking-wider font-bold">{fmtVal(val)}</div>
                                  <div className="text-[10px] font-display" style={{ color: row.color }}>+{fmtVal(profit)}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-center text-[10px] text-[#1a1a2e]/30 font-bold px-4">
                    * Projections are illustrative only and do not constitute financial advice. Crypto investments carry risk.
                  </p>
                </div>
              )}

              {activeTab === "airdrop" && (
                <div className="space-y-5">
                  {/* Header */}
                  <div className="meme-card bg-gradient-to-br from-[#1a1a2e] to-[#1a1a2e] rounded-2xl overflow-hidden">
                    <div className="p-6 sm:p-8 text-center relative">
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #FF4D9D 0%, transparent 50%), radial-gradient(circle at 70% 50%, #4CAF50 0%, transparent 50%)" }} />
                      <div className="relative z-10">
                        <div className="text-5xl mb-3">🪂</div>
                        <h3 className="text-3xl sm:text-4xl font-display text-white tracking-wider mb-2">{t.dashboard.airdropTitle}</h3>
                        <p className="text-white/60 font-bold text-sm max-w-md mx-auto">{t.dashboard.airdropDesc}</p>
                        <div className="grid grid-cols-2 gap-3 mt-5 max-w-xs mx-auto">
                          <div className="bg-white/10 border border-white/20 rounded-xl p-3 text-center">
                            <div className="text-[10px] font-display text-white/40 tracking-wider mb-1">{t.dashboard.airdropPool}</div>
                            <div className="font-display text-sm text-[#4CAF50] tracking-wide">15T $PWIFE</div>
                          </div>
                          <div className="bg-white/10 border border-white/20 rounded-xl p-3 text-center">
                            <div className="text-[10px] font-display text-white/40 tracking-wider mb-1">{t.dashboard.airdropStatus}</div>
                            <div className="font-display text-sm text-[#FFD54F] tracking-wide">{t.dashboard.airdropComingSoon}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="meme-card bg-white rounded-2xl overflow-hidden">
                    <div className="zigzag-border" />
                    <div className="p-5 space-y-3">
                      <h4 className="font-display text-xl text-[#1a1a2e] tracking-wider mb-4">✅ Qualification Tasks</h4>
                      {[
                        {
                          task: t.dashboard.airdropTask1,
                          icon: "🐦",
                          color: "#4CAF50",
                          bg: "#FFFDE7",
                          border: "#4CAF50",
                          done: false,
                          link: "https://x.com/pepewifecoin",
                          btnLabel: t.dashboard.airdropVerify,
                        },
                        {
                          task: t.dashboard.airdropTask2,
                          icon: "✈️",
                          color: "#4CAF50",
                          bg: "#FFFDE7",
                          border: "#4CAF50",
                          done: false,
                          link: "https://t.me/pepewifecoin",
                          btnLabel: t.dashboard.airdropVerify,
                        },
                        {
                          task: t.dashboard.airdropTask3,
                          icon: "🐸",
                          color: "#4CAF50",
                          bg: "#E8F5E9",
                          border: "#4CAF50",
                          done: address ? (buyerState ? Number(buyerState.tokensBought) > 0 : false) : false,
                          autoVerified: true,
                          btnLabel: t.dashboard.airdropAutoVerified,
                        },
                        {
                          task: t.dashboard.airdropTask4,
                          icon: "🔗",
                          color: "#FF4D9D",
                          bg: "#FCE4EC",
                          border: "#FF4D9D",
                          done: address ? (refStats ? refStats.totalReferrals > 0 : false) : false,
                          btnLabel: t.dashboard.airdropVerify,
                        },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-xl border-2 px-4 py-3" style={{ background: item.bg, borderColor: item.done ? item.color : "#1a1a2e20" }}>
                          <span className="text-2xl shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-display text-sm text-[#1a1a2e] tracking-wide">{item.task}</div>
                            {item.done && <div className="text-[10px] font-display mt-0.5" style={{ color: item.color }}>{t.dashboard.airdropVerified}</div>}
                          </div>
                          {item.done ? (
                            <span className="shrink-0 bg-white border-2 rounded-lg px-3 py-1 font-display text-xs tracking-wide" style={{ borderColor: item.color, color: item.color }}>✅</span>
                          ) : item.autoVerified ? (
                            <span className="shrink-0 text-[10px] font-display text-[#1a1a2e]/30 tracking-wider">{t.dashboard.airdropPending}</span>
                          ) : (
                            <a href={item.link} target="_blank" rel="noreferrer"
                              className="shrink-0 btn-meme rounded-lg px-3 py-1.5 font-display text-xs tracking-wide text-white whitespace-nowrap"
                              style={{ background: item.color }}>
                              {item.btnLabel}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Allocation estimate */}
                  <div className="meme-card bg-[#FFFDE7] rounded-2xl overflow-hidden border-[#FFD54F] shadow-[3px_3px_0px_#F9A825]">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-display text-lg text-[#1a1a2e] tracking-wider">{t.dashboard.airdropAllocation}</h4>
                        <span className="text-2xl">🎯</span>
                      </div>
                      {!address ? (
                        <p className="text-sm text-[#1a1a2e]/40 font-bold">{t.dashboard.airdropConnectWallet}</p>
                      ) : (
                        <div className="space-y-2">
                          {[
                            { label: t.dashboard.airdropTask3, done: buyerState ? Number(buyerState.tokensBought) > 0 : false, pts: "1x" },
                            { label: t.dashboard.airdropTask4, done: refStats ? refStats.totalReferrals > 0 : false, pts: "+0.5x" },
                          ].map((row, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-sm font-bold text-[#1a1a2e]/60">{row.label}</span>
                              <span className="font-display text-sm tracking-wide" style={{ color: row.done ? "#4CAF50" : "#1a1a2e30" }}>
                                {row.done ? `✅ ${row.pts}` : `⏳ ${row.pts}`}
                              </span>
                            </div>
                          ))}
                          <div className="border-t-2 border-[#FFD54F] pt-2 mt-2 flex items-center justify-between">
                            <span className="font-display text-sm text-[#1a1a2e] tracking-wider">{t.dashboard.airdropMultiplier}</span>
                            <span className="font-display text-lg text-[#FF4D9D] tracking-wider">
                              {buyerState && Number(buyerState.tokensBought) > 0 ? (refStats && refStats.totalReferrals > 0 ? "1.5x 🔥" : "1x") : "0x"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Note */}
                  <div className="text-center text-xs text-[#1a1a2e]/40 font-bold px-4">{t.dashboard.airdropNote}</div>
                </div>
              )}

              {activeTab === "referrals" && (
                <div className="space-y-6">
                  <div className="meme-card bg-white rounded-2xl overflow-hidden">
                    <div className="zigzag-border" />
                    <div className="p-5 space-y-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="sticker bg-[#FF4D9D] text-white mb-3 text-sm inline-block" style={{ transform: "rotate(2deg)" }}>{t.presale.referralBanner}</div>
                          <h3 className="text-3xl font-display text-[#1a1a2e] tracking-wider comic-shadow mb-1">{t.presale.shillEarn}</h3>
                          <p className="text-[#1a1a2e]/60 font-bold">{t.presale.shillDesc}</p>
                        </div>
                        <button
                          onClick={() => refreshReferralData()}
                          disabled={refLoading}
                          className="shrink-0 mt-1 flex items-center gap-1 text-xs font-display text-[#1a1a2e]/40 hover:text-[#FF4D9D] transition-colors tracking-wide disabled:opacity-50"
                        >
                          <span className={refLoading ? "animate-spin inline-block" : "inline-block"}>🔄</span>
                          {t.dashboard.refresh ?? "Refresh"}
                        </button>
                      </div>
                      {refLastUpdated && (
                        <p className="text-[10px] text-[#1a1a2e]/30 font-bold -mt-2">
                          Updated: {refLastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                      )}

                      {/* Referral link */}
                      <div>
                        <p className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-2">{t.presale.yourLink}</p>
                        {myRefUrl ? (
                          <div className="flex gap-2">
                            <Input readOnly value={myRefUrl} className="h-11 rounded-xl border-2 border-[#1a1a2e] bg-[#FFFDE7] font-mono text-xs" />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(myRefUrl);
                                setRefCopied(true);
                                setTimeout(() => setRefCopied(false), 2000);
                              }}
                              className={`btn-meme h-11 px-4 rounded-xl shrink-0 ${refCopied ? "bg-[#4CAF50]" : "bg-[#FFD54F]"} text-[#1a1a2e]`}
                            >
                              {refCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                        ) : (
                          <div className="h-11 rounded-xl border-2 border-dashed border-[#1a1a2e]/20 bg-[#FFFDE7] flex items-center px-3 animate-pulse">
                            <span className="font-display text-xs text-[#1a1a2e]/40 tracking-wider">{t.presale.generatingLink}</span>
                          </div>
                        )}
                        {refCopied && <p className="text-xs text-[#4CAF50] font-display tracking-wide mt-1">{t.presale.copied}</p>}
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          {
                            l: t.dashboard.friendsShilled,
                            v: refStats ? String(refStats.totalReferrals) : "…",
                            c: "text-[#4CAF50]",
                            bg: "bg-[#E8F5E9]",
                            bc: "border-[#4CAF50]",
                          },
                          {
                            l: t.dashboard.pendingRewards,
                            v: refStats ? formatTokens(refStats.pendingTokens) : "…",
                            c: "text-[#FF4D9D]",
                            bg: "bg-[#FCE4EC]",
                            bc: "border-[#FF4D9D]",
                          },
                          {
                            l: t.dashboard.earnedTotal,
                            v: refStats ? formatTokens(refStats.totalRewardTokens) : "…",
                            c: "text-[#FF4D9D]",
                            bg: "bg-[#FCE4EC]",
                            bc: "border-[#FF4D9D]",
                          },
                          {
                            l: t.dashboard.rewardRate,
                            v: "5%",
                            c: "text-[#b8860b]",
                            bg: "bg-[#FFFDE7]",
                            bc: "border-[#FFD54F]",
                          },
                        ].map(s => (
                          <div key={s.l} className={`${s.bg} rounded-xl p-3 text-center border-2 ${s.bc}`}>
                            <div className={`text-xl font-display ${s.c} tracking-wider`}>{s.v}</div>
                            <div className="text-[10px] font-display text-[#1a1a2e]/40 tracking-wider mt-0.5">{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tier progress */}
                  <div className="meme-card bg-white rounded-2xl p-5">
                    <h4 className="font-display text-lg text-[#1a1a2e] mb-4 tracking-wider">{t.dashboard.referralProgress}</h4>
                    <div className="space-y-3">
                      {[
                        { reward: t.dashboard.bronzeShiller, target: 5,  color: "#4CAF50" },
                        { reward: t.dashboard.silverShiller, target: 20, color: "#FF4D9D" },
                        { reward: t.dashboard.goldShiller,   target: 50, color: "#FFD54F" },
                      ].map(p => {
                        const current = refStats?.totalReferrals ?? 0;
                        const pct = Math.min((current / p.target) * 100, 100);
                        return (
                          <div key={p.reward} className="bg-[#FFFDE7] rounded-xl p-3 border-2 border-[#FFD54F]/30">
                            <div className="flex justify-between text-xs font-display tracking-wider mb-1.5">
                              <span className="text-[#1a1a2e]">{p.reward}</span>
                              <span className="text-[#1a1a2e]/40">{current}/{p.target} {t.dashboard.referralsLabel}</span>
                            </div>
                            <div dir="ltr" className="h-3 rounded-full bg-[#1a1a2e]/10 overflow-hidden border border-[#1a1a2e]/20">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent referrals */}
                  {refStats && refStats.recentReferrals.length > 0 && (
                    <div className="meme-card bg-white rounded-2xl p-5">
                      <h4 className="font-display text-lg text-[#1a1a2e] mb-3 tracking-wider">{t.presale.recentReferrals}</h4>
                      <div className="space-y-2">
                        {refStats.recentReferrals.map((r, i) => (
                          <div key={`recent-${i}`} className="flex items-center gap-2 rounded-xl px-3 py-2 border-2 bg-[#FFFDE7] border-[#FFD54F]/50">
                            <span className="font-mono text-xs text-[#1a1a2e]/50 flex-1">
                              {r.referredWallet.slice(0, 4)}…{r.referredWallet.slice(-4)}
                            </span>
                            <span className={`text-xs font-display tracking-wide ${r.status === "paid" ? "text-[#4CAF50]" : "text-[#FF4D9D]"}`}>
                              +{formatTokens(r.rewardTokens)} $PWIFE
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-display ${r.status === "paid" ? "bg-[#E8F5E9] text-[#4CAF50]" : "bg-[#FCE4EC] text-[#FF4D9D]"}`}>
                              {r.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Leaderboard */}
                  <div className="meme-card bg-white rounded-2xl p-5">
                    <h4 className="font-display text-lg text-[#1a1a2e] mb-3 tracking-wider">{t.presale.topShillers}</h4>
                    <div className="space-y-2">
                      {leaderboard.length === 0
                        ? [{ r: "🥇" }, { r: "🥈" }, { r: "🥉" }].map((x, i) => (
                            <div key={`ph-${i}`} className="flex items-center gap-2 rounded-xl px-3 py-2 border-2 bg-[#FFFDE7] border-[#FFD54F]/50">
                              <span className="text-lg">{x.r}</span>
                              <span className="font-mono text-xs text-[#1a1a2e]/50 flex-1">---</span>
                              <span className="text-xs font-display text-[#4CAF50] tracking-wide">0 $PWIFE</span>
                            </div>
                          ))
                        : leaderboard.slice(0, 5).map((entry, i) => (
                            <div key={`lb-${i}`} className="flex items-center gap-2 rounded-xl px-3 py-2 border-2 bg-[#FFFDE7] border-[#FFD54F]/50">
                              <span className="text-lg">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
                              <span className="font-mono text-xs text-[#1a1a2e]/50 flex-1">{entry.walletAddress}</span>
                              <span className="text-xs font-display text-[#4CAF50] tracking-wide">{formatTokens(entry.totalRewardTokens)} $PWIFE</span>
                            </div>
                          ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "transactions" && (
                <div className="space-y-4">
                  {/* ── Toggle ── */}
                  <div className="flex rounded-xl border-2 border-[#1a1a2e]/10 overflow-hidden">
                    <button
                      onClick={() => setTxView("all")}
                      className={`flex-1 py-2.5 font-display text-sm tracking-wider transition-colors ${txView === "all" ? "bg-[#FF4D9D] text-white" : "bg-white text-[#1a1a2e]/50 hover:bg-[#FFFDE7]"}`}
                    >
                      {t.dashboard.allTransactions}
                    </button>
                    <button
                      onClick={() => setTxView("mine")}
                      className={`flex-1 py-2.5 font-display text-sm tracking-wider transition-colors ${txView === "mine" ? "bg-[#4CAF50] text-white" : "bg-white text-[#1a1a2e]/50 hover:bg-[#FFFDE7]"}`}
                    >
                      {t.dashboard.myTransactions}
                    </button>
                  </div>

                  <div className="meme-card bg-white rounded-2xl overflow-hidden">
                    <div className="zigzag-border" />
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="font-display text-xl text-[#1a1a2e] tracking-wider">
                          {txView === "all" ? t.dashboard.globalActivityFeed : t.dashboard.transactionHistory}
                        </h3>
                        <button
                          onClick={() => {
                            if (txView === "all") {
                              setActivityLoading(true);
                              fetchPublicActivity(0).then(res => {
                                setActivityFeed(res.activity);
                                setActivityHasMore(res.hasMore);
                                setActivityOffset(res.activity.length);
                              }).finally(() => setActivityLoading(false));
                            } else {
                              refreshBuyerData();
                            }
                          }}
                          className="text-xs font-display text-[#1a1a2e]/40 hover:text-[#FF4D9D] transition-colors tracking-wide"
                        >
                          🔄 {t.dashboard.refresh ?? "Refresh"}
                        </button>
                      </div>

                      {txView === "all" ? (
                        activityLoading && activityFeed.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-3xl mb-2 animate-spin inline-block">⏳</div>
                            <p className="font-display text-[#1a1a2e]/40 tracking-wider text-sm">{t.dashboard.loadingDots}</p>
                          </div>
                        ) : activityFeed.length === 0 ? (
                          <div className="text-center py-10">
                            <div className="text-5xl mb-3">🛒</div>
                            <p className="font-display text-lg text-[#1a1a2e]/40 tracking-wider">{t.dashboard.noActivityYet}</p>
                            <p className="text-sm text-[#1a1a2e]/30 font-bold">{t.dashboard.beFirstToBuy}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {activityFeed.map((tx) => {
                              const usd = parseFloat(tx.amountUsd);
                              const tokens = parseFloat(tx.amountTokens);
                              const date = new Date(tx.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                              const fmtTokens = (n: number) => n >= 1e9 ? (n/1e9).toFixed(2)+"B" : n >= 1e6 ? (n/1e6).toFixed(2)+"M" : n.toLocaleString();
                              return (
                                <div key={tx.id} className="flex items-center gap-3 rounded-xl border-2 border-[#1a1a2e]/10 bg-[#FFFDE7]/50 px-4 py-3">
                                  <div className="w-8 h-8 rounded-full bg-[#FF4D9D]/10 border-2 border-[#FF4D9D]/30 flex items-center justify-center shrink-0 text-base">🐸</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-display text-xs text-[#1a1a2e] tracking-wide">{tx.wallet}</div>
                                    <div className="text-[10px] text-[#1a1a2e]/40 font-bold">{date} · Stage {tx.stage}</div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-end">
                                      <div className="font-display text-sm text-[#FF4D9D] tracking-wider">${usd.toFixed(2)}</div>
                                      <div className="text-[10px] text-[#4CAF50] font-nums font-bold">+{fmtTokens(tokens)} $PWIFE</div>
                                    </div>
                                    {tx.txHash && (
                                      <a
                                        href={buildExplorerUrl(tx.txHash)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bg-[#FF4D9D]/10 hover:bg-[#FF4D9D]/20 border border-[#FF4D9D]/30 text-[#FF4D9D] rounded-lg px-2 py-1 text-[10px] font-display tracking-wide flex items-center gap-1 transition-colors"
                                      >
                                        {t.dashboard.viewTx} <ExternalLink size={10} />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            <p className="text-center text-[10px] text-[#1a1a2e]/30 font-bold pt-2">{activityFeed.length} {t.dashboard.purchaseCount}</p>
                            {activityHasMore && (
                              <button
                                onClick={() => {
                                  setActivityLoading(true);
                                  fetchPublicActivity(activityOffset).then(res => {
                                    setActivityFeed(prev => [...prev, ...res.activity]);
                                    setActivityHasMore(res.hasMore);
                                    setActivityOffset(prev => prev + res.activity.length);
                                  }).finally(() => setActivityLoading(false));
                                }}
                                disabled={activityLoading}
                                className="w-full mt-2 py-3 rounded-xl border-2 border-dashed border-[#FF4D9D]/40 text-[#FF4D9D] font-display text-sm tracking-wider hover:bg-[#FF4D9D]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {activityLoading ? t.dashboard.loadingDots : t.dashboard.loadMore}
                              </button>
                            )}
                          </div>
                        )
                      ) : (
                        (myDbLoading || buyerTxsLoading) && myDbPurchases.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-3xl mb-2 animate-spin inline-block">⏳</div>
                            <p className="font-display text-[#1a1a2e]/40 tracking-wider text-sm">{t.dashboard.loadingDots}</p>
                          </div>
                        ) : myDbPurchases.length === 0 ? (
                          <div className="text-center py-10">
                            <div className="text-5xl mb-3">📜</div>
                            <p className="font-display text-lg text-[#1a1a2e]/40 tracking-wider">{t.dashboard.noTransactions}</p>
                            <p className="text-sm text-[#1a1a2e]/30 font-bold">{t.dashboard.noTransactionsDesc}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {myDbPurchases.map((p, i) => {
                              const usd = parseFloat(p.amountUsd);
                              const tokens = parseFloat(p.amountTokens);
                              const date = new Date(p.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                              const fmtTok = (n: number) => n >= 1e9 ? (n/1e9).toFixed(2)+"B" : n >= 1e6 ? (n/1e6).toFixed(2)+"M" : n.toLocaleString();
                              return (
                                <div key={p.id} className="flex items-center gap-3 rounded-xl border-2 border-[#1a1a2e]/10 bg-[#FFFDE7]/50 px-4 py-3 hover:bg-[#FFFDE7] transition-colors">
                                  <div className="w-6 h-6 rounded-full bg-[#4CAF50]/15 border border-[#4CAF50]/30 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-display text-[#4CAF50]">#{i + 1}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-display text-xs text-[#FF4D9D] tracking-wider">+{fmtTok(tokens)} $PWIFE</div>
                                    <div className="text-[10px] text-[#1a1a2e]/40 font-bold">${usd.toFixed(2)} · Stage {p.stage} · {date}</div>
                                    {p.txHash && (
                                      <div className="font-mono text-[9px] text-[#1a1a2e]/30 truncate mt-0.5">{p.txHash.slice(0, 16)}…{p.txHash.slice(-8)}</div>
                                    )}
                                  </div>
                                  {p.txHash && (
                                    <a
                                      href={buildExplorerUrl(p.txHash)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="shrink-0 bg-[#4CAF50]/10 hover:bg-[#4CAF50]/20 border border-[#4CAF50]/30 text-[#0a9060] rounded-lg px-2 py-1 text-[10px] font-display tracking-wide flex items-center gap-1 transition-colors"
                                    >
                                      {t.dashboard.viewTx} <ExternalLink size={10} />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                            <p className="text-center text-[10px] text-[#1a1a2e]/30 font-bold pt-2">
                              {myDbPurchases.length} {t.dashboard.purchaseCount}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="zigzag-border" />

      <footer className="py-10 px-4 border-t-4 border-[#1a1a2e]" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #1a1a2e 100%)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-start">
            <div className="flex items-center gap-3">
              <img src="/logo.webp" alt="PEPEWIFE" width="48" height="48" className="w-12 h-12 rounded-full border-3 border-white/30" />
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
            <button className="btn-meme w-10 h-10 rounded-full bg-white/10 text-white/60 hover:text-[#4CAF50] hover:bg-white/20 flex items-center justify-center border-white/20"><Twitter className="h-4 w-4" /></button>
            <button className="btn-meme w-10 h-10 rounded-full bg-white/10 text-white/60 hover:text-[#4CAF50] hover:bg-white/20 flex items-center justify-center border-white/20"><Send className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-white/10 text-center text-sm text-white/30 font-display tracking-wide">
          {t.footer.copyright}
        </div>
      </footer>

      {/* ── Wallet Buy Modal ─────────────────────────────────────────── */}
      {showBuyModal && (
        <WalletBuyModal
          amount={parseFloat(buyAmount)}
          currency={currency as "SOL" | "USDT_SPL"}
          presaleData={presaleData}
          tokensEstimate={tokensOut}
          disableWalletSwitch={true}
          onClose={() => setShowBuyModal(false)}
          onSuccess={handleDashBuySuccess}
        />
      )}
    </div>
  );
}
