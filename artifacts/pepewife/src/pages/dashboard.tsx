import { useState } from "react";
import { Menu, X, Twitter, Send, Wallet, Copy, Check, ChevronDown, ChevronRight, Award, TrendingUp, Gift, Zap, Clock, ExternalLink, Shield, Star, Users, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { SiSolana, SiTether } from "react-icons/si";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currency, setCurrency] = useState<"SOL" | "USDT">("SOL");
  const [buyAmount, setBuyAmount] = useState("");

  const walletAddress = "7xKp...4mNr";
  const fullWallet = "7xKp4mNrQ9vB...kL2xNw";
  const [, navigate] = useLocation();

  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const presaleStages = [
    { stage: 1, name: "Early Bird", price: "$0.0000", tokens: "0", sold: 0, total: "$0", status: "upcoming" as const, color: "#4CAF50", shadow: "#2E7D32", emoji: "🔒" },
    { stage: 2, name: "Community", price: "$0.0000", tokens: "0", sold: 0, total: "$0", status: "upcoming" as const, color: "#FF4D9D", shadow: "#C2185B", emoji: "🔒" },
    { stage: 3, name: "Growth", price: "$0.0000", tokens: "0", sold: 0, total: "$0", status: "upcoming" as const, color: "#42A5F5", shadow: "#1565C0", emoji: "🔒" },
    { stage: 4, name: "Final", price: "$0.0000", tokens: "0", sold: 0, total: "$0", status: "upcoming" as const, color: "#AB47BC", shadow: "#7B1FA2", emoji: "🔒" },
  ];

  const activeStage = presaleStages.find(s => s.status === "active");
  const currentPrice = activeStage?.price || "$0.0000";
  const solPrice = 0;
  const tokenPrice = 0;
  const calculatedTokens = 0;

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "purchases", label: "My Purchases", icon: "🛒" },
    { id: "claim", label: "Claim", icon: "🎁" },
    { id: "referrals", label: "Referrals", icon: "🤝" },
    { id: "transactions", label: "Transactions", icon: "📜" },
  ];

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: "linear-gradient(180deg, #FFFDE7 0%, #E8F5E9 30%, #FFF9C4 60%, #F3E5F5 100%)", backgroundAttachment: "fixed" }}>

      <nav className="fixed top-0 w-full z-50 border-b-4 border-[#1a1a2e]" style={{ background: "linear-gradient(90deg, #FFFDE7, #E8F5E9)" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-4 lg:gap-8">
              <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer wiggle-hover shrink-0" onClick={() => navigate("/")}>
                <img src="/logo.png" alt="PEPEWIFE" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#1a1a2e] shrink-0" />
                <span className="font-display text-xl sm:text-2xl text-[#1a1a2e] tracking-wide whitespace-nowrap" style={{ textShadow: "2px 2px 0px #FFD54F" }}>PEPEWIFE</span>
                <span className="hidden sm:inline-block bg-[#FF4D9D] text-white text-[10px] font-display px-2 py-0.5 rounded-full border-2 border-[#1a1a2e] whitespace-nowrap" style={{ transform: "rotate(3deg)" }}>$PWIFE</span>
              </div>
              <div className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-5">
                <button onClick={() => navigate("/")} className="flex items-center gap-1 font-display text-base text-[#1a1a2e] hover:text-[#FF4D9D] transition-colors tracking-wide wiggle-hover whitespace-nowrap">
                  <span>🏠</span> <span>Home</span>
                </button>
                <span className="font-display text-base text-[#FF4D9D] tracking-wide whitespace-nowrap border-b-2 border-[#FF4D9D]">
                  📊 Dashboard
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-1.5 bg-[#4CAF50]/10 border-2 border-[#4CAF50] text-[#4CAF50] rounded-xl px-3 h-9 font-display text-sm tracking-wide whitespace-nowrap shadow-[2px_2px_0px_#2E7D32]">
                  <Wallet className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{walletAddress}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 meme-card bg-white rounded-xl p-3 space-y-2 z-50">
                    <div className="text-xs font-display text-[#1a1a2e]/40 tracking-wider">WALLET</div>
                    <div className="font-mono text-xs text-[#1a1a2e] bg-[#FFFDE7] rounded-lg px-2 py-1.5 border border-[#FFD54F]">{fullWallet}</div>
                    <button onClick={() => navigate("/")} className="w-full text-left text-sm font-display text-[#1a1a2e] hover:text-[#FF4D9D] tracking-wide py-1">🏠 Back to Home</button>
                    <button className="w-full text-left text-sm font-display text-red-500 tracking-wide py-1">🔌 Disconnect</button>
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
              <button onClick={() => navigate("/")} className="flex items-center gap-2 text-left py-2 font-display text-lg text-[#1a1a2e] tracking-wide">
                <span>🏠</span> <span>Home</span>
              </button>
              {tabs.map(t => (
                <button key={t.id} onClick={() => { setActiveTab(t.id); setIsMenuOpen(false); }} className={`flex items-center gap-2 text-left py-2 font-display text-lg tracking-wide ${activeTab === t.id ? "text-[#FF4D9D]" : "text-[#1a1a2e]"}`}>
                  <span>{t.icon}</span> <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="pt-20 sm:pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="sticker bg-[#4CAF50] text-white mb-4 text-sm inline-block" style={{ transform: "rotate(-1deg)" }}>🟢 CONNECTED</div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-2">My Dashboard 🎮</h1>
            <p className="text-lg text-[#1a1a2e]/60 font-bold">Track your presale activity, rewards, and referral progress. WAGMI! 💎</p>
          </div>

          <div className="flex gap-6">
            <div className="hidden lg:block w-56 shrink-0">
              <div className="meme-card bg-white rounded-2xl p-3 sticky top-24 space-y-1">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl font-display text-base tracking-wide transition-all ${activeTab === t.id ? "bg-[#4CAF50]/10 text-[#4CAF50] border-2 border-[#4CAF50] shadow-[2px_2px_0px_#2E7D32]" : "text-[#1a1a2e] hover:bg-[#FFFDE7] border-2 border-transparent"}`}>
                    <span>{t.icon}</span> <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="lg:hidden mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-display text-sm tracking-wide whitespace-nowrap border-2 transition-all shrink-0 ${activeTab === t.id ? "bg-[#4CAF50] text-white border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e]" : "bg-white text-[#1a1a2e] border-[#1a1a2e]/20 hover:border-[#1a1a2e]"}`}>
                      <span>{t.icon}</span> <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: "💰 Tokens Purchased", value: "0", sub: "PWIFE", color: "#4CAF50", shadow: "#2E7D32", bg: "bg-[#E8F5E9]" },
                      { label: "🎁 Claimable Tokens", value: "0", sub: "PWIFE", color: "#FF4D9D", shadow: "#C2185B", bg: "bg-[#FCE4EC]" },
                      { label: "🤝 Referral Rewards", value: "0", sub: "PWIFE", color: "#AB47BC", shadow: "#7B1FA2", bg: "bg-[#F3E5F5]" },
                      { label: "📊 Current Stage", value: "—", sub: "Not started", color: "#42A5F5", shadow: "#1565C0", bg: "bg-[#E3F2FD]" },
                      { label: "💸 Total Invested", value: "$0.00", sub: "0 SOL", color: "#b8860b", shadow: "#8B6914", bg: "bg-[#FFFDE7]" },
                      { label: "⭐ Bonus Earned", value: "0%", sub: "—", color: "#4CAF50", shadow: "#2E7D32", bg: "bg-[#E8F5E9]" },
                    ].map(card => (
                      <div key={card.label} className={`meme-card ${card.bg} rounded-2xl p-4 sm:p-5`} style={{ borderColor: card.color, boxShadow: `4px 4px 0px ${card.shadow}` }}>
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
                          <div className="sticker bg-[#FFD54F] text-[#1a1a2e] text-sm inline-block mb-2" style={{ transform: "rotate(-1deg)" }}>⏳ PRESALE COMING SOON</div>
                          <h3 className="text-2xl sm:text-3xl font-display text-[#1a1a2e] tracking-wider comic-shadow">Buy $PWIFE 🛒</h3>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-[#1a1a2e]/40 font-display tracking-wide">🐸 0 Sold</span>
                            <span className="text-[#1a1a2e]/40 font-display tracking-wide">Goal: 0</span>
                          </div>
                          <div className="relative">
                            <Progress value={0} className="h-4 rounded-full border-2 border-[#1a1a2e]" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-display text-[#1a1a2e]/40 drop-shadow tracking-wide">0%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { l: "🟢 NOW", v: "$0.0000", bg: "bg-[#4CAF50]/10", bc: "border-[#4CAF50]", tc: "text-[#4CAF50]" },
                            { l: "⬆️ NEXT", v: "$0.0000", bg: "bg-[#FF4D9D]/10", bc: "border-[#FF4D9D]", tc: "text-[#FF4D9D]" },
                            { l: "🚀 LIST", v: "$0.0000", bg: "bg-[#FFD54F]/20", bc: "border-[#FFD54F]", tc: "text-[#b8860b]" },
                          ].map(p => (
                            <div key={p.l} className={`${p.bg} border-2 ${p.bc} rounded-xl p-2 text-center`}>
                              <div className="text-[10px] font-display tracking-wider text-[#1a1a2e]/50">{p.l}</div>
                              <div className={`text-lg font-display ${p.tc} tracking-wider`}>{p.v}</div>
                            </div>
                          ))}
                        </div>

                        <div>
                          <p className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-2">💸 PAY WITH</p>
                          <div className="grid grid-cols-2 gap-2">
                            {(["SOL", "USDT"] as const).map(c => (
                              <button key={c} onClick={() => setCurrency(c)}
                                className={`flex items-center justify-center gap-2 rounded-xl h-10 font-display text-lg tracking-wide border-2 transition-all ${currency === c ? (c === "SOL" ? "bg-[#14F195]/15 border-[#14F195] text-[#0a9060] shadow-[3px_3px_0px_#0a9060]" : "bg-[#26A17B]/15 border-[#26A17B] text-[#1a7a5e] shadow-[3px_3px_0px_#1a7a5e]") : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                                {c === "SOL" ? <SiSolana size={14} /> : <SiTether size={14} />} {c}
                                {currency === c && <span className="text-xs">✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="relative">
                            <Input type="number" placeholder={`Amount in ${currency}`} value={buyAmount} onChange={e => setBuyAmount(e.target.value)} className="h-12 pl-4 pr-20 text-base rounded-xl border-2 border-[#1a1a2e] font-bold" />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#FFFDE7] px-2.5 py-1 rounded-lg font-display text-sm text-[#1a1a2e] border border-[#FFD54F]">
                              {currency === "SOL" ? <SiSolana size={14} className="text-[#14F195]" /> : <SiTether size={14} className="text-[#26A17B]" />} {currency}
                            </div>
                          </div>
                          <div className="bg-[#E8F5E9] border-2 border-[#4CAF50]/30 rounded-xl px-3 py-2.5 flex justify-between items-center">
                            <span className="text-xs text-[#1a1a2e]/50 font-bold">You get 🤑</span>
                            <span className="font-display text-[#4CAF50] text-lg tracking-wider">~ {calculatedTokens.toLocaleString()} PWIFE</span>
                          </div>
                          <button className="btn-meme w-full h-13 text-xl rounded-xl font-display tracking-wider text-white" style={{ background: "linear-gradient(135deg, #4CAF50 0%, #FF4D9D 100%)", animation: "pulse-glow 2s infinite" }}>
                            🚀 BUY $PWIFE NOW
                          </button>
                        </div>
                        <p className="text-center text-xs text-[#1a1a2e]/40 font-bold">Tokens distributed at TGE. NFA. DYOR. WAGMI. 🐸</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="meme-card bg-white rounded-2xl p-5">
                        <h3 className="font-display text-xl text-[#1a1a2e] tracking-wider mb-4">🗺️ Presale Stages</h3>
                        <div className="space-y-3">
                          {presaleStages.map((s, i) => (
                            <div key={s.stage} className={`rounded-2xl p-4 border-3 transition-all ${s.status === "active" ? "border-[" + s.color + "] bg-white shadow-[4px_4px_0px_" + s.shadow + "]" : s.status === "sold-out" ? "border-[#1a1a2e]/15 bg-[#E8F5E9]/50" : "border-[#1a1a2e]/10 bg-[#FFFDE7]/30"}`} style={s.status === "active" ? { borderColor: s.color, boxShadow: `4px 4px 0px ${s.shadow}` } : {}}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{s.emoji}</span>
                                  <div>
                                    <div className="font-display text-sm tracking-wider" style={{ color: s.color }}>STAGE {s.stage} — {s.name.toUpperCase()}</div>
                                    <div className="text-xs text-[#1a1a2e]/40 font-bold">{s.tokens} PWIFE • {s.total} raised</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-display text-lg tracking-wider" style={{ color: s.color }}>{s.price}</div>
                                  <span className={`inline-block text-[10px] font-display tracking-wider px-2 py-0.5 rounded-full border ${s.status === "active" ? "bg-[#FF4D9D]/10 border-[#FF4D9D] text-[#FF4D9D]" : s.status === "sold-out" ? "bg-[#4CAF50]/10 border-[#4CAF50] text-[#4CAF50]" : "bg-[#1a1a2e]/5 border-[#1a1a2e]/20 text-[#1a1a2e]/40"}`}>
                                    {s.status === "active" ? "🔴 LIVE" : s.status === "sold-out" ? "✅ SOLD OUT" : "🔒 LOCKED"}
                                  </span>
                                </div>
                              </div>
                              <div className="h-2.5 rounded-full bg-[#1a1a2e]/10 overflow-hidden border border-[#1a1a2e]/15">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.sold}%`, backgroundColor: s.color }} />
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-[10px] font-display tracking-wider" style={{ color: s.color }}>{s.sold}% sold</span>
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
                            <div className="font-display text-sm text-[#b8860b] tracking-wider">TOTAL PRESALE PROGRESS</div>
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
                    <h3 className="font-display text-xl text-[#1a1a2e] tracking-wider mb-4">🏆 Reward Tier</h3>
                    <div className="space-y-4">
                      {[
                        { tier: "🥉 Bronze", min: "$0", max: "$0", bonus: "0%", active: false, progress: 0 },
                        { tier: "🥈 Silver", min: "$0", max: "$0", bonus: "0%", active: false, progress: 0 },
                        { tier: "🥇 Gold", min: "$0", max: "$0", bonus: "0%", active: false, progress: 0 },
                        { tier: "💎 Diamond", min: "$0", max: "", bonus: "0%", active: false, progress: 0 },
                      ].map(t => (
                        <div key={t.tier} className={`flex items-center gap-3 p-3 rounded-xl border-2 ${t.active ? "border-[#4CAF50] bg-[#E8F5E9] shadow-[3px_3px_0px_#2E7D32]" : "border-[#1a1a2e]/10 bg-[#FFFDE7]/50"}`}>
                          <span className="text-lg font-display tracking-wider shrink-0">{t.tier}</span>
                          <div className="flex-1">
                            <div className="h-2 rounded-full bg-[#1a1a2e]/10 overflow-hidden">
                              <div className="h-full rounded-full bg-[#4CAF50] transition-all" style={{ width: `${t.progress}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-display text-[#1a1a2e]/40 tracking-wide shrink-0">{t.min}{t.max && ` - ${t.max}`}</span>
                          <span className={`sticker text-xs ${t.active ? "bg-[#4CAF50] text-white" : "bg-[#1a1a2e]/10 text-[#1a1a2e]/40"}`} style={{ transform: "none" }}>+{t.bonus}</span>
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
                      <h3 className="font-display text-xl text-[#1a1a2e] tracking-wider mb-5">🛒 My Purchases</h3>
                      <div className="text-center py-10">
                        <div className="text-5xl mb-3">🛒</div>
                        <p className="font-display text-lg text-[#1a1a2e]/40 tracking-wider">No purchases yet</p>
                        <p className="text-sm text-[#1a1a2e]/30 font-bold">Your purchase history will appear here once the presale begins.</p>
                      </div>
                    </div>
                  </div>

                  <div className="meme-card bg-[#E8F5E9] rounded-2xl p-5 border-[#4CAF50] shadow-[4px_4px_0px_#2E7D32]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-display text-sm text-[#4CAF50] tracking-wider mb-1">💰 TOTAL PURCHASED</div>
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
                      <h3 className="text-3xl sm:text-4xl font-display text-[#1a1a2e] tracking-wider mb-3">Claiming Locked Ser</h3>
                      <p className="text-[#1a1a2e]/50 font-bold mb-6 max-w-md mx-auto">
                        Patience young degen. Your PWIFE tokens will be claimable after the presale ends and TGE occurs. WAGMI 🤝
                      </p>
                      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6">
                        <div className="meme-card bg-[#E8F5E9] rounded-2xl p-4 border-[#4CAF50] shadow-[3px_3px_0px_#2E7D32]">
                          <div className="text-xs font-display text-[#4CAF50] tracking-wider mb-1">💰 YOUR TOKENS</div>
                          <div className="text-xl font-display text-[#1a1a2e] tracking-wider">0</div>
                          <div className="text-xs text-[#1a1a2e]/40 font-bold">PWIFE</div>
                        </div>
                        <div className="meme-card bg-[#FCE4EC] rounded-2xl p-4 border-[#FF4D9D] shadow-[3px_3px_0px_#C2185B]">
                          <div className="text-xs font-display text-[#FF4D9D] tracking-wider mb-1">🎁 CLAIMABLE</div>
                          <div className="text-xl font-display text-[#1a1a2e] tracking-wider">0</div>
                          <div className="text-xs text-[#1a1a2e]/40 font-bold">PWIFE</div>
                        </div>
                      </div>
                      <div className="meme-card bg-[#FFFDE7] rounded-2xl p-4 max-w-sm mx-auto mb-6 border-[#FFD54F] shadow-[3px_3px_0px_#F9A825]">
                        <div className="flex items-center gap-2 justify-center">
                          <Shield className="h-4 w-4 text-[#b8860b]" />
                          <span className="text-sm font-display text-[#b8860b] tracking-wider">CLAIM STATUS</span>
                        </div>
                        <div className="font-display text-lg text-[#1a1a2e] tracking-wider mt-1">Pending TGE</div>
                      </div>
                      <button disabled className="btn-meme h-12 px-8 rounded-xl bg-gray-200 text-gray-400 font-display text-lg tracking-wider cursor-not-allowed">
                        🔒 Claim Tokens (soon™)
                      </button>
                      <p className="text-xs text-[#1a1a2e]/30 font-bold mt-4">Tokens will be distributed automatically to your connected wallet at TGE. NFA. DYOR.</p>
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
                        <div className="sticker bg-[#FF4D9D] text-white mb-3 text-sm inline-block" style={{ transform: "rotate(2deg)" }}>🎁 FREE MONEY GLITCH</div>
                        <h3 className="text-3xl font-display text-[#1a1a2e] tracking-wider comic-shadow mb-1">Shill & Earn 💰</h3>
                        <p className="text-[#1a1a2e]/60 font-bold">Share your link, earn rewards when your frens buy. Details coming soon 🤝</p>
                      </div>

                      <div>
                        <p className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-2">📎 YOUR SHILL LINK</p>
                        <div className="flex gap-2">
                          <Input readOnly value="https://pepewife.io/ref/7xKp4mNr" className="h-11 rounded-xl border-2 border-[#1a1a2e] bg-[#FFFDE7] font-mono text-xs" />
                          <button onClick={handleCopy} className={`btn-meme h-11 px-4 rounded-xl shrink-0 ${copied ? "bg-[#4CAF50]" : "bg-[#FFD54F]"} text-[#1a1a2e]`}>
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        {copied && <p className="text-xs text-[#4CAF50] font-display tracking-wide mt-1">✅ COPIED! NOW GO SHILL SER</p>}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { l: "Friends Shilled", v: "0", c: "text-[#4CAF50]", bg: "bg-[#E8F5E9]", bc: "border-[#4CAF50]" },
                          { l: "Pending Rewards", v: "0", c: "text-[#FF4D9D]", bg: "bg-[#FCE4EC]", bc: "border-[#FF4D9D]" },
                          { l: "Earned Total", v: "0", c: "text-[#AB47BC]", bg: "bg-[#F3E5F5]", bc: "border-[#AB47BC]" },
                          { l: "Reward Rate", v: "0%", c: "text-[#b8860b]", bg: "bg-[#FFFDE7]", bc: "border-[#FFD54F]" },
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
                    <h4 className="font-display text-lg text-[#1a1a2e] mb-4 tracking-wider">📊 Referral Progress</h4>
                    <div className="space-y-3">
                      {[
                        { label: "Referrals", current: 0, target: 0, reward: "Bronze Shiller", color: "#4CAF50" },
                        { label: "Next Tier", current: 0, target: 0, reward: "Silver Shiller", color: "#FF4D9D" },
                        { label: "Legend Status", current: 0, target: 0, reward: "Gold Shiller", color: "#FFD54F" },
                      ].map(p => (
                        <div key={p.label} className="bg-[#FFFDE7] rounded-xl p-3 border-2 border-[#FFD54F]/30">
                          <div className="flex justify-between text-xs font-display tracking-wider mb-1.5">
                            <span className="text-[#1a1a2e]">{p.reward}</span>
                            <span className="text-[#1a1a2e]/40">{p.current}/{p.target} referrals</span>
                          </div>
                          <div className="h-3 rounded-full bg-[#1a1a2e]/10 overflow-hidden border border-[#1a1a2e]/20">
                            <div className="h-full rounded-full transition-all" style={{ width: `${p.target > 0 ? (p.current / p.target) * 100 : 0}%`, backgroundColor: p.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="meme-card bg-white rounded-2xl p-5">
                    <h4 className="font-display text-lg text-[#1a1a2e] mb-3 tracking-wider">🏆 TOP SHILLERS (legends)</h4>
                    <div className="space-y-2">
                      {[
                        { r: "🥇", a: "---", p: "0", t: "—" },
                        { r: "🥈", a: "---", p: "0", t: "—" },
                        { r: "🥉", a: "---", p: "0", t: "—" },
                      ].map((x, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 border-2 bg-[#FFFDE7] border-[#FFD54F]/50">
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
                      <h3 className="font-display text-xl text-[#1a1a2e] tracking-wider mb-5">📜 Transaction History</h3>
                      <div className="text-center py-10">
                        <div className="text-5xl mb-3">📜</div>
                        <p className="font-display text-lg text-[#1a1a2e]/40 tracking-wider">No transactions yet</p>
                        <p className="text-sm text-[#1a1a2e]/30 font-bold">Your transaction history will appear here once the presale begins.</p>
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
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="PEPEWIFE" className="w-12 h-12 rounded-full border-3 border-white/30" />
              <span className="font-display text-3xl text-white tracking-wider" style={{ textShadow: "2px 2px 0px #FF4D9D" }}>PEPEWIFE</span>
            </div>
            <p className="text-white/40 text-sm font-bold">The Lady Of Memes — Solana — WAGMI 💎</p>
          </div>
          <div className="flex gap-5">
            {["📄 Whitepaper", "🗺️ Roadmap", "❓ FAQ"].map(link => (
              <button key={link} onClick={() => link.includes("Roadmap") ? navigate("/") : undefined} className="text-white/50 hover:text-[#FFD54F] font-display text-lg tracking-wide transition-colors">{link}</button>
            ))}
          </div>
          <div className="flex gap-3">
            <button className="btn-meme w-10 h-10 rounded-full bg-white/10 text-white/60 hover:text-[#1DA1F2] hover:bg-white/20 flex items-center justify-center border-white/20"><Twitter className="h-4 w-4" /></button>
            <button className="btn-meme w-10 h-10 rounded-full bg-white/10 text-white/60 hover:text-[#0088cc] hover:bg-white/20 flex items-center justify-center border-white/20"><Send className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-white/10 text-center text-sm text-white/30 font-display tracking-wide">
          © 2025 PEPEWIFE. All rights reserved. NFA. DYOR. WAGMI. 🐸
        </div>
      </footer>
    </div>
  );
}
