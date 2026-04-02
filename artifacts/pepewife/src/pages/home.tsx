import { useState, useEffect } from "react";
import { Menu, X, Twitter, Send, Wallet, ArrowRight, Activity, Copy, Check, Zap, Users, Star, TrendingUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { SiCoinmarketcap, SiBinance, SiSolana, SiTether } from "react-icons/si";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 14, minutes: 0, seconds: 0 });
  const [currency, setCurrency] = useState<"SOL" | "USDT">("SOL");
  const [copied, setCopied] = useState(false);

  const walletAddress = "7xKp...4mNr";
  const presaleFilled = 85;

  const tokenomicsData = [
    { name: "Presale", value: 40, color: "#4CAF50" },
    { name: "Liquidity", value: 20, color: "#FF4D9D" },
    { name: "Team & Advisors", value: 15, color: "#FFD54F" },
    { name: "Marketing", value: 15, color: "#42A5F5" },
    { name: "Reserve", value: 10, color: "#AB47BC" },
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

  const handleConnect = () => { setIsConnected(true); setIsDashboardOpen(true); };
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setIsMenuOpen(false); };
  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="min-h-screen font-sans overflow-x-hidden">

      <nav className="fixed top-0 w-full z-50 border-b-4 border-[#1a1a2e]" style={{ background: "linear-gradient(90deg, #FFFDE7, #E8F5E9)" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer wiggle-hover shrink-0" onClick={() => scrollTo('hero')}>
              <img src="/logo.png" alt="PEPEWIFE" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#1a1a2e] shrink-0" />
              <span className="font-display text-xl sm:text-2xl text-[#1a1a2e] tracking-wide whitespace-nowrap" style={{ textShadow: "2px 2px 0px #FFD54F" }}>PEPEWIFE</span>
              <span className="hidden sm:inline-block bg-[#FF4D9D] text-white text-[10px] font-display px-2 py-0.5 rounded-full border-2 border-[#1a1a2e] whitespace-nowrap" style={{ transform: "rotate(3deg)" }}>$PWIFE</span>
            </div>
            <div className="hidden lg:flex items-center gap-4 xl:gap-6">
              {[{ id: "presale", label: "Presale", icon: "🛒" }, { id: "why", label: "Why Buy", icon: "🤔" }, { id: "tokenomics", label: "Tokenomics", icon: "📊" }, { id: "roadmap", label: "Roadmap", icon: "🗺️" }].map(s => (
                <button key={s.id} onClick={() => scrollTo(s.id)} className="flex items-center gap-1 font-display text-base text-[#1a1a2e] hover:text-[#FF4D9D] transition-colors tracking-wide wiggle-hover whitespace-nowrap">
                  <span>{s.icon}</span> <span>{s.label}</span>
                </button>
              ))}
              {isConnected ? (
                <button onClick={() => setIsDashboardOpen(true)} className="flex items-center gap-1.5 bg-[#4CAF50]/10 border-2 border-[#4CAF50] text-[#4CAF50] rounded-xl px-3 h-9 font-display text-sm tracking-wide whitespace-nowrap shadow-[2px_2px_0px_#2E7D32]">
                  <Wallet className="h-3.5 w-3.5 shrink-0" /> {walletAddress}
                </button>
              ) : (
                <button onClick={handleConnect} className="flex items-center gap-1.5 bg-[#4CAF50] text-white rounded-xl px-4 h-9 font-display text-base tracking-wide whitespace-nowrap border-2 border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e] hover:shadow-[4px_4px_0px_#1a1a2e] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
                  <span>🔌</span> <span>Connect Wallet</span>
                </button>
              )}
            </div>
            <div className="lg:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-9 w-9">
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <div className="lg:hidden border-t-3 border-[#1a1a2e]" style={{ background: "#FFFDE7" }}>
            <div className="px-4 pt-2 pb-4 space-y-2 flex flex-col">
              {[{ id: "presale", label: "Presale", icon: "🛒" }, { id: "why", label: "Why Buy", icon: "🤔" }, { id: "tokenomics", label: "Tokenomics", icon: "📊" }, { id: "roadmap", label: "Roadmap", icon: "🗺️" }].map(s => (
                <button key={s.id} onClick={() => scrollTo(s.id)} className="flex items-center gap-2 text-left py-2 font-display text-lg text-[#1a1a2e] tracking-wide">
                  <span>{s.icon}</span> <span>{s.label}</span>
                </button>
              ))}
              <button onClick={handleConnect} className="flex items-center justify-center gap-2 w-full mt-2 bg-[#4CAF50] text-white rounded-xl py-3 font-display text-lg border-2 border-[#1a1a2e] shadow-[3px_3px_0px_#1a1a2e]">
                <span>🔌</span> <span>Connect Wallet</span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <section id="hero" className="relative overflow-hidden" style={{ backgroundImage: "url('/pepewife-bg.png')", backgroundSize: "cover", backgroundPosition: "right center", backgroundRepeat: "no-repeat" }}>
        <div className="pt-28 pb-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="sticker bg-[#FFD54F] text-[#1a1a2e] mb-6 animate-pulse text-base" style={{ transform: "rotate(-2deg)" }}>
              🔥 STAGE 1 — 85% SOLD OUT — NGMI IF U MISS THIS!!
            </div>
            <h1 className="text-5xl lg:text-8xl font-display leading-tight mb-6 text-[#1a1a2e] comic-shadow tracking-wider">
              Be Early...<br />Or <span className="text-[#FF4D9D]" style={{ textShadow: "3px 3px 0px #1a1a2e" }}>Cry Later 😭</span>
            </h1>
            <div className="speech-bubble inline-block p-4 mb-8 max-w-xl">
              <p className="text-lg lg:text-xl font-bold text-[#1a1a2e]">
                PEPE built the meme. SHE builds the future. 💅<br />
                <span className="text-[#FF4D9D]">Join the most BASED presale on Solana. LFG! 🚀</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mb-8">
              {[{ l: "💰 Total Raised", v: "$1,247,500" }, { l: "👥 Diamond Hands", v: "8,420+" }, { l: "💎 Stage Price", v: "$0.0002" }].map(s => (
                <div key={s.l} className="meme-card bg-white rounded-2xl px-5 py-3">
                  <div className="text-xs font-display text-gray-500 tracking-wide">{s.l}</div>
                  <div className="text-xl font-display text-[#1a1a2e] tracking-wider">{s.v}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => scrollTo('presale')} className="btn-meme bg-[#4CAF50] text-white rounded-2xl h-14 px-10 text-2xl font-display tracking-wider" style={{ animation: "pulse-glow 2s infinite" }}>
                🚀 APE IN NOW
              </button>
              <button className="btn-meme bg-white text-[#1a1a2e] rounded-2xl h-14 px-8 text-2xl font-display tracking-wider">
                🐸 Join The Fam <ArrowRight className="ml-2 h-5 w-5 inline" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section className="py-6 pattern-dots" style={{ background: "linear-gradient(90deg, #FFF9C4, #E8F5E9)" }}>
        <div className="max-w-7xl mx-auto px-4 text-center mb-3">
          <p className="font-display text-sm text-[#1a1a2e] tracking-wider">🏆 AS SEEN IN (trust us bro) 🏆</p>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-content space-x-12 items-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex space-x-12 items-center shrink-0">
                <div className="flex items-center gap-2 font-display text-xl text-[#1a1a2e]/40 tracking-wide"><SiCoinmarketcap size={24} /> CoinMarketCap</div>
                <div className="flex items-center gap-2 font-display text-xl text-[#1a1a2e]/40 tracking-wide">🦎 CoinGecko</div>
                <div className="flex items-center gap-2 font-display text-xl text-[#1a1a2e]/40 tracking-wide"><SiSolana size={24} /> Solana</div>
                <div className="flex items-center gap-2 font-display text-xl text-[#1a1a2e]/40 tracking-wide"><Activity size={24} /> Raydium</div>
                <div className="flex items-center gap-2 font-display text-xl text-[#1a1a2e]/40 tracking-wide"><SiBinance size={24} /> Binance</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section id="presale" className="py-20 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #FFFDE7, #E8F5E9)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="sticker bg-[#FF4D9D] text-white mb-4 text-lg inline-block" style={{ transform: "rotate(-1deg)" }}>⚡ LIVE NOW — DON'T BE LATE SER</div>
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-2">Stage 1 Presale 🎯</h2>
            <p className="font-bold text-[#1a1a2e]/60 text-lg">Price goes UP after this stage. Your future self will thank you. 📈</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div className="meme-card bg-white rounded-3xl overflow-hidden">
              <div className="zigzag-border" />
              <div className="p-7 space-y-6">
                <div>
                  <p className="font-display text-center text-[#1a1a2e]/50 tracking-wider mb-3">⏳ TICK TOCK SER ⏳</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[{ val: timeLeft.days, label: "DAYS" }, { val: timeLeft.hours.toString().padStart(2, "0"), label: "HRS" }, { val: timeLeft.minutes.toString().padStart(2, "0"), label: "MIN" }, { val: timeLeft.seconds.toString().padStart(2, "0"), label: "SEC" }].map(t => (
                      <div key={t.label} className="bg-[#FFFDE7] border-2 border-[#FFD54F] rounded-xl py-2.5 text-center">
                        <div className="text-3xl font-display text-[#1a1a2e] tracking-wider">{t.val}</div>
                        <div className="text-[10px] font-display text-[#1a1a2e]/40 tracking-wider">{t.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-[#4CAF50] font-display tracking-wide">🐸 127.5M Sold</span>
                    <span className="text-[#1a1a2e]/40 font-display tracking-wide">Goal: 150M PWIFE</span>
                  </div>
                  <div className="relative">
                    <Progress value={presaleFilled} className="h-4 rounded-full border-2 border-[#1a1a2e]" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-display text-white drop-shadow tracking-wide">{presaleFilled}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[{ l: "🟢 NOW", v: "$0.0002", bg: "bg-[#4CAF50]/10", bc: "border-[#4CAF50]", tc: "text-[#4CAF50]" }, { l: "⬆️ NEXT", v: "$0.0004", bg: "bg-[#FF4D9D]/10", bc: "border-[#FF4D9D]", tc: "text-[#FF4D9D]" }, { l: "🚀 LIST", v: "$0.001", bg: "bg-[#FFD54F]/20", bc: "border-[#FFD54F]", tc: "text-[#b8860b]" }].map(p => (
                    <div key={p.l} className={`${p.bg} border-2 ${p.bc} rounded-xl p-2.5 text-center`}>
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
                        className={`flex items-center justify-center gap-2 rounded-xl h-11 font-display text-lg tracking-wide border-2 transition-all ${currency === c ? (c === "SOL" ? "bg-[#14F195]/15 border-[#14F195] text-[#0a9060] shadow-[3px_3px_0px_#0a9060]" : "bg-[#26A17B]/15 border-[#26A17B] text-[#1a7a5e] shadow-[3px_3px_0px_#1a7a5e]") : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                        {c === "SOL" ? <SiSolana size={16} /> : <SiTether size={16} />} {c}
                        {currency === c && <span className="text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="relative">
                    <Input type="number" placeholder={`Amount in ${currency}`} className="h-12 pl-4 pr-20 text-base rounded-xl border-2 border-[#1a1a2e] font-bold" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#FFFDE7] px-2.5 py-1 rounded-lg font-display text-sm text-[#1a1a2e] border border-[#FFD54F]">
                      {currency === "SOL" ? <SiSolana size={14} className="text-[#14F195]" /> : <SiTether size={14} className="text-[#26A17B]" />} {currency}
                    </div>
                  </div>
                  <div className="bg-[#E8F5E9] border-2 border-[#4CAF50]/30 rounded-xl px-3 py-2.5 flex justify-between items-center">
                    <span className="text-xs text-[#1a1a2e]/50 font-bold">You get 🤑</span>
                    <span className="font-display text-[#4CAF50] text-lg tracking-wider">~ 0 PWIFE</span>
                  </div>
                  <button onClick={handleConnect} className="btn-meme w-full h-14 text-2xl rounded-xl font-display tracking-wider text-white" style={{ background: "linear-gradient(135deg, #4CAF50 0%, #FF4D9D 100%)" }}>
                    🚀 APE IN NOW
                  </button>
                </div>
                <p className="text-center text-xs text-[#1a1a2e]/40 font-bold">Tokens distributed at TGE. NFA. DYOR. WAGMI. 🐸</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <div className="sticker bg-[#FF4D9D] text-white mb-3 text-sm inline-block" style={{ transform: "rotate(2deg)" }}>🎁 FREE MONEY GLITCH</div>
                <h3 className="text-4xl font-display text-[#1a1a2e] tracking-wider comic-shadow mb-1">Shill & Earn 💰</h3>
                <p className="text-[#1a1a2e]/60 font-bold">Share your link, get <span className="text-[#FF4D9D] font-display text-xl">5% rewards</span>. Literally free money fr fr 🤝</p>
              </div>

              <div className="meme-card bg-white rounded-2xl overflow-hidden">
                <div className="zigzag-border" />
                <div className="p-5 space-y-5">
                  <div>
                    <p className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-2">📎 YOUR SHILL LINK</p>
                    <div className="flex gap-2">
                      <Input readOnly value="https://pepewife.io/ref/7xKp4mNr" className="h-10 rounded-xl border-2 border-[#1a1a2e] bg-[#FFFDE7] font-mono text-xs" />
                      <button onClick={handleCopy} className={`btn-meme h-10 px-3 rounded-xl shrink-0 ${copied ? "bg-[#4CAF50]" : "bg-[#FFD54F]"} text-[#1a1a2e]`}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    {copied && <p className="text-xs text-[#4CAF50] font-display tracking-wide mt-1">✅ COPIED! NOW GO SHILL SER</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ l: "Shilled", v: "0", c: "text-[#4CAF50]", bg: "bg-[#E8F5E9]", bc: "border-[#4CAF50]" }, { l: "Pending", v: "0 PWIFE", c: "text-[#FF4D9D]", bg: "bg-[#FCE4EC]", bc: "border-[#FF4D9D]" }, { l: "Rate", v: "5%", c: "text-[#b8860b]", bg: "bg-[#FFFDE7]", bc: "border-[#FFD54F]" }].map(s => (
                      <div key={s.l} className={`${s.bg} rounded-xl p-2.5 text-center border-2 ${s.bc}`}>
                        <div className={`text-xl font-display ${s.c} tracking-wider`}>{s.v}</div>
                        <div className="text-[10px] font-display text-[#1a1a2e]/40 tracking-wider mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="meme-card bg-white rounded-2xl p-5">
                <h4 className="font-display text-lg text-[#1a1a2e] mb-3 tracking-wider">🏆 TOP SHILLERS (legends)</h4>
                <div className="space-y-2">
                  {[{ r: "🥇", a: "9mRk...2xNw", p: "71,000", t: "absolute chad" }, { r: "🥈", a: "4pQj...8vBc", p: "49,000", t: "based af" }, { r: "🥉", a: "7tLx...5kMp", p: "33,500", t: "gigabrain" }].map(x => (
                    <div key={x.a} className="flex items-center gap-2 bg-[#FFFDE7] rounded-xl px-3 py-2 border-2 border-[#FFD54F]/50">
                      <span className="text-lg">{x.r}</span>
                      <span className="font-mono text-xs text-[#1a1a2e]/50 flex-1">{x.a}</span>
                      <span className="text-xs font-display text-[#4CAF50] tracking-wide">{x.p} PWIFE</span>
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="sticker bg-[#FFD54F] text-[#1a1a2e] mb-4 text-lg inline-block" style={{ transform: "rotate(1deg)" }}>💡 ANON, LISTEN UP</div>
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-4">Why Buy PWIFE? 🤔</h2>
            <p className="text-lg text-[#1a1a2e]/60 max-w-2xl mx-auto font-bold">Because every meme needs a queen. 👑 And every queen needs DEGENS who believe.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { emoji: "📈", c: "#4CAF50", title: "EARLY = RICH", desc: "Stage 1 price is 5x lower than listing. Imagine NOT buying here lmao 🤡" },
              { emoji: "🫂", c: "#FF4D9D", title: "COMMUNITY VIBES", desc: "8,000+ diamond hands and growing. We don't sell. We HODL. 💎🙌" },
              { emoji: "⚡", c: "#FFD54F", title: "UTILITY INCOMING", desc: "Staking, governance, NFTs, and the PWIFE ecosystem. This ain't just a meme ser 🔥" },
              { emoji: "🧠", c: "#AB47BC", title: "MEME POWER", desc: "Strong branding + viral meme energy = unstoppable degen momentum 🚀" },
            ].map(card => (
              <div key={card.title} className="meme-card bg-white rounded-2xl p-6 cursor-pointer">
                <div className="text-4xl mb-3">{card.emoji}</div>
                <h3 className="font-display text-xl mb-2 text-[#1a1a2e] tracking-wider" style={{ color: card.c }}>{card.title}</h3>
                <p className="text-[#1a1a2e]/60 text-sm font-bold leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section id="how" className="py-24 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #E8F5E9, #E3F2FD)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="sticker bg-[#4CAF50] text-white mb-4 text-lg inline-block" style={{ transform: "rotate(-1deg)" }}>🛒 EVEN UR GRANDMA CAN DO IT</div>
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-4">How to Ape In 🐵</h2>
            <p className="text-lg text-[#1a1a2e]/60 font-bold">5 steps. That's it. If you can breathe, you can buy PWIFE.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { s: "01", e: "👛", t: "Get a Wallet", d: "Phantom, Solflare, whatever. Just get one ser." },
              { s: "02", e: "💱", t: "Pick Currency", d: "SOL or USDT. Both work." },
              { s: "03", e: "✏️", t: "Enter Amount", d: "Type how much you wanna ape." },
              { s: "04", e: "🚀", t: "SEND IT", d: "Click buy. Confirm. Done." },
              { s: "05", e: "🎉", t: "WAGMI", d: "Get PWIFE at TGE. Ez money." },
            ].map(step => (
              <div key={step.s} className="meme-card bg-white rounded-2xl p-5 text-center">
                <div className="text-4xl mb-2">{step.e}</div>
                <div className="sticker bg-[#4CAF50] text-white text-xs mb-2 inline-block">STEP {step.s}</div>
                <h3 className="font-display text-lg mb-1 text-[#1a1a2e] tracking-wider">{step.t}</h3>
                <p className="text-[#1a1a2e]/50 text-xs font-bold leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => scrollTo('presale')} className="btn-meme bg-[#4CAF50] text-white rounded-2xl h-14 px-10 text-2xl font-display tracking-wider">
              I'm Ready — LET'S GO 🐸
            </button>
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section id="tokenomics" className="py-24 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #FFFDE7, #FCE4EC)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-4">Tokenomics 📊</h2>
            <p className="text-lg text-[#1a1a2e]/60 font-bold">Total Supply: <span className="font-display text-2xl text-[#4CAF50]">1,000,000,000 PWIFE</span> 🐸</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <img src="/tokenomics-girl.png" alt="PEPEWIFE Tokenomics" className="w-full max-w-md object-contain drop-shadow-2xl float-animation" />
            </div>
            <div className="space-y-6">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tokenomicsData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" stroke="#1a1a2e" strokeWidth={2} label={({ value }) => `${value}%`}>
                      {tokenomicsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "3px solid #1a1a2e", background: "#fff", color: "#1a1a2e", boxShadow: "4px 4px 0px #1a1a2e", fontFamily: "Bangers, cursive", letterSpacing: "0.05em" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {tokenomicsData.map((item, idx) => (
                  <div key={idx} className="meme-card flex items-center gap-3 p-4 rounded-2xl bg-white cursor-pointer">
                    <div className="w-5 h-5 rounded-full shrink-0 border-2 border-[#1a1a2e]" style={{ backgroundColor: item.color }} />
                    <div className="flex-1">
                      <div className="font-display text-[#1a1a2e] text-sm tracking-wider">{item.name}</div>
                      <div className="text-xs text-[#1a1a2e]/40 font-bold">{item.value * 10}M PWIFE</div>
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
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider">The Road to the Moon 🌙</h2>
            <p className="text-lg text-[#1a1a2e]/50 font-bold mt-2">(we're not stopping until we pass it lol)</p>
          </div>
          <div className="space-y-6">
            {[
              { phase: "Phase 1", title: "Foundation 🏗️", desc: "Website launch, community building, presale kick-off, social media takeover. We're HERE rn. LFG!", active: true, img: "/roadmap-phase1.png", color: "#4CAF50", meme: "🟢 WE ARE HERE" },
              { phase: "Phase 2", title: "Growth 📈", desc: "CEX listings, influencer partnerships, 10K holders target. Global meme domination begins.", active: false, img: "/roadmap-phase2.png", color: "#FF4D9D", meme: "🔜 SOON™" },
              { phase: "Phase 3", title: "Launch 🚀", desc: "TGE, DEX listing on Raydium, CMC & CoinGecko listings. Bags are PUMPING.", active: false, img: "/roadmap-phase3.png", color: "#42A5F5", meme: "🔮 TRUST THE PLAN" },
              { phase: "Phase 4", title: "Expansion 👑", desc: "Tier-1 CEX, NFT collection, staking platform, PWIFE metaverse. Full degen mode.", active: false, img: "/roadmap-phase4.png", color: "#AB47BC", meme: "🌙 MOON MISSION" },
            ].map((step, i) => (
              <div key={i} className={`meme-card flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl bg-white ${step.active ? "border-[#4CAF50] shadow-[6px_6px_0px_#2E7D32]" : ""}`}>
                <img src={step.img} alt={step.title} className="w-28 h-28 object-contain shrink-0 drop-shadow-lg" />
                <div className="flex-1 text-center md:text-left">
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
          <h2 className="text-5xl font-display text-center mb-12 text-[#1a1a2e] comic-shadow tracking-wider">Latest Shitposts 📢</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { text: "PEPEWIFE presale is LIVE! 🎉 Stage 1 just launched. If you're reading this, you're still early. WAGMI! 🚀", time: "2h ago", likes: "🔥 892 degens liked this" },
              { text: "We just hit 50% sold in 48 hours! The Lady of Memes is TAKING OVER 👑 Bears are literally crying rn 😂", time: "1d ago", likes: "💚 1,247 based reactions" },
              { text: "Raydium listing CONFIRMED for TGE. Your bags are safe fren. 😏 WAGMI. Not financial advice btw (it kinda is tho) 😂", time: "2d ago", likes: "🚀 2,103 rocket emojis" },
            ].map((post, i) => (
              <div key={i} className="meme-card bg-white rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <img src="/logo.png" alt="PW" className="w-10 h-10 rounded-full border-2 border-[#1a1a2e]" />
                  <div>
                    <div className="font-display text-[#1a1a2e] text-sm tracking-wider">PEPEWIFE 🐸</div>
                    <div className="text-xs text-[#1a1a2e]/40 font-bold">@PepeWifeCoin</div>
                  </div>
                  <Twitter className="ml-auto text-[#1DA1F2] h-5 w-5" />
                </div>
                <p className="text-sm mb-4 leading-relaxed text-[#1a1a2e]/70 font-bold">{post.text}</p>
                <div className="flex items-center justify-between text-xs font-display text-[#1a1a2e]/40 tracking-wide">
                  <span>{post.time}</span>
                  <span>{post.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="zigzag-border" />

      <section className="py-8 px-4" style={{ background: "#FFF9C4" }}>
        <div className="max-w-4xl mx-auto">
          <div className="meme-card bg-white rounded-2xl p-5 border-[#FFD54F] shadow-[4px_4px_0px_#F9A825]">
            <h3 className="font-display text-lg text-[#b8860b] mb-1 tracking-wider">⚠️ RISK WARNING (boring but important)</h3>
            <p className="text-[#1a1a2e]/60 text-sm font-bold leading-relaxed">
              Crypto is volatile af. This is NOT financial advice. DYOR. Only invest what you can afford to lose. If you sell your house for PWIFE, that's on you ser. 🫡
            </p>
          </div>
        </div>
      </section>

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
              <button key={link} onClick={() => link.includes("Roadmap") ? scrollTo("roadmap") : undefined} className="text-white/50 hover:text-[#FFD54F] font-display text-lg tracking-wide transition-colors">{link}</button>
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

      <Dialog open={isDashboardOpen} onOpenChange={setIsDashboardOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden meme-card">
          <div className="zigzag-border" />
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl font-display text-[#1a1a2e] tracking-wider">🎮 Investor Dashboard</DialogTitle>
              <DialogDescription>
                Connected: <span className="font-mono bg-[#FF4D9D]/10 text-[#FF4D9D] px-2 py-1 rounded font-bold border border-[#FF4D9D]">{walletAddress}</span> 🟢
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#FFFDE7] p-1 rounded-xl border-2 border-[#FFD54F]">
                {["overview", "transactions", "claim"].map(t => (
                  <TabsTrigger key={t} value={t} className="rounded-lg font-display text-lg capitalize tracking-wide">{t}</TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="meme-card bg-[#E8F5E9] rounded-2xl p-5 border-[#4CAF50] shadow-[4px_4px_0px_#2E7D32]">
                    <div className="text-xs font-display text-[#4CAF50] mb-1 tracking-wider">💰 BALANCE</div>
                    <div className="text-2xl font-display text-[#1a1a2e] tracking-wider">250,000 <span className="text-sm text-[#1a1a2e]/40">PWIFE</span></div>
                  </div>
                  <div className="meme-card bg-[#FCE4EC] rounded-2xl p-5 border-[#FF4D9D] shadow-[4px_4px_0px_#C2185B]">
                    <div className="text-xs font-display text-[#FF4D9D] mb-1 tracking-wider">🎁 CLAIMABLE</div>
                    <div className="text-2xl font-display text-[#1a1a2e] tracking-wider">0 <span className="text-sm text-[#1a1a2e]/40">PWIFE</span></div>
                  </div>
                </div>
                <div className="meme-card bg-[#FFFDE7] rounded-2xl p-5 flex justify-between border-[#FFD54F] shadow-[4px_4px_0px_#F9A825]">
                  <div><div className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-0.5">📊 STATUS</div><div className="text-xl font-display text-[#1a1a2e] tracking-wider">Stage 1</div></div>
                  <div className="text-right"><div className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-0.5">💰 RAISED</div><div className="text-xl font-display text-[#4CAF50] tracking-wider">$1,247,500</div></div>
                </div>
              </TabsContent>
              <TabsContent value="transactions">
                <div className="meme-card bg-white rounded-2xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#FFFDE7] border-b-2 border-[#1a1a2e]"><tr>{["Date","Amount","PWIFE","Status"].map(h => <th key={h} className="px-5 py-3 font-display text-[#1a1a2e]/50 text-xs tracking-wider">{h}</th>)}</tr></thead>
                    <tbody className="divide-y-2 divide-[#1a1a2e]/10">
                      {[{ d: "Today, 14:30", a: "2.5 SOL", p: "125,000" }, { d: "Yesterday", a: "2.5 SOL", p: "125,000" }].map(tx => (
                        <tr key={tx.d}><td className="px-5 py-3 text-[#1a1a2e]/70 font-bold">{tx.d}</td><td className="px-5 py-3 text-[#1a1a2e]/70 font-bold">{tx.a}</td><td className="px-5 py-3 font-display text-[#4CAF50] tracking-wider">{tx.p}</td><td className="px-5 py-3"><span className="sticker bg-[#4CAF50] text-white text-[10px]">✅ Success</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="claim">
                <div className="meme-card bg-[#FFFDE7] rounded-2xl text-center py-10 px-6 border-[#FFD54F] shadow-[4px_4px_0px_#F9A825]">
                  <div className="text-5xl mb-5">🔒</div>
                  <h3 className="text-3xl font-display mb-2 text-[#1a1a2e] tracking-wider">Claiming Locked Ser</h3>
                  <p className="text-[#1a1a2e]/50 text-sm font-bold mb-6 max-w-md mx-auto">Patience young degen. Claim your PWIFE after presale ends and TGE occurs. WAGMI 🤝</p>
                  <button disabled className="btn-meme h-10 px-6 rounded-xl bg-gray-200 text-gray-400 font-display tracking-wider cursor-not-allowed">🔒 Claim Tokens (soon™)</button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
