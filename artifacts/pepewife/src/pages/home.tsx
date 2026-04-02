import { useState, useEffect } from "react";
import { Menu, X, Twitter, Send, Wallet, ArrowRight, Activity, Copy, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { SiCoinmarketcap, SiBinance, SiSolana, SiTether } from "react-icons/si";
import { useLocation } from "wouter";
import { useLanguage } from "@/i18n/context";
import LanguageSwitcher from "@/components/language-switcher";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 14, minutes: 0, seconds: 0 });
  const [currency, setCurrency] = useState<"SOL" | "USDT">("SOL");
  const [copied, setCopied] = useState(false);
  const { t, dir } = useLanguage();
  const isRTL = dir === "rtl";

  const walletAddress = "7xKp...4mNr";
  const presaleFilled = 0;

  const tokenomicsData = [
    { name: t.tokenomics.presale, value: 40, color: "#4CAF50" },
    { name: t.tokenomics.liquidity, value: 20, color: "#FF4D9D" },
    { name: t.tokenomics.teamAdvisors, value: 15, color: "#FFD54F" },
    { name: t.tokenomics.marketing, value: 15, color: "#42A5F5" },
    { name: t.tokenomics.reserve, value: 10, color: "#AB47BC" },
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

  const navLinks = [
    { id: "presale", label: t.nav.presale, icon: "🛒" },
    { id: "why", label: t.nav.whyBuy, icon: "🤔" },
    { id: "tokenomics", label: t.nav.tokenomics, icon: "📊" },
    { id: "roadmap", label: t.nav.roadmap, icon: "🗺️" },
    { id: "about", label: t.nav.about, icon: "ℹ️", isPage: true },
  ];

  return (
    <div className="min-h-screen font-sans overflow-x-hidden">

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
              {[{ l: "💰 Total Raised", v: "$0" }, { l: "👥 Diamond Hands", v: "0" }, { l: "💎 Stage Price", v: "$0.0000" }].map(s => (
                <div key={s.l} className="meme-card bg-white rounded-2xl px-5 py-3">
                  <div className="text-xs font-display text-gray-500 tracking-wide">{s.l}</div>
                  <div className="text-xl font-display text-[#1a1a2e] tracking-wider">{s.v}</div>
                </div>
              ))}
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
                        <div className="text-3xl font-display text-[#1a1a2e] tracking-wider">{ti.val}</div>
                        <div className="text-[10px] font-display text-[#1a1a2e]/40 tracking-wider">{ti.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-[#4CAF50] font-display tracking-wide">🐸 {t.presale.sold}</span>
                    <span className="text-[#1a1a2e]/40 font-display tracking-wide">{t.presale.goal}</span>
                  </div>
                  <div className="relative">
                    <Progress value={presaleFilled} className="h-4 rounded-full border-2 border-[#1a1a2e]" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-display text-white drop-shadow tracking-wide">{presaleFilled}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[{ l: t.presale.now, v: "$0.0000", bg: "bg-[#4CAF50]/10", bc: "border-[#4CAF50]", tc: "text-[#4CAF50]" }, { l: t.presale.next, v: "$0.0000", bg: "bg-[#FF4D9D]/10", bc: "border-[#FF4D9D]", tc: "text-[#FF4D9D]" }, { l: t.presale.list, v: "$0.0000", bg: "bg-[#FFD54F]/20", bc: "border-[#FFD54F]", tc: "text-[#b8860b]" }].map(p => (
                    <div key={p.l} className={`${p.bg} border-2 ${p.bc} rounded-xl p-2.5 text-center`}>
                      <div className="text-[10px] font-display tracking-wider text-[#1a1a2e]/50">{p.l}</div>
                      <div className={`text-lg font-display ${p.tc} tracking-wider`}>{p.v}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-2">{t.presale.payWith}</p>
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
                    <Input type="number" placeholder={`${t.presale.amountIn} ${currency}`} className="h-12 ps-4 pe-20 text-base rounded-xl border-2 border-[#1a1a2e] font-bold" />
                    <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#FFFDE7] px-2.5 py-1 rounded-lg font-display text-sm text-[#1a1a2e] border border-[#FFD54F]">
                      {currency === "SOL" ? <SiSolana size={14} className="text-[#14F195]" /> : <SiTether size={14} className="text-[#26A17B]" />} {currency}
                    </div>
                  </div>
                  <div className="bg-[#E8F5E9] border-2 border-[#4CAF50]/30 rounded-xl px-3 py-2.5 flex justify-between items-center">
                    <span className="text-xs text-[#1a1a2e]/50 font-bold">{t.presale.youGet}</span>
                    <span className="font-display text-[#4CAF50] text-lg tracking-wider">~ 0 PWIFE</span>
                  </div>
                  <button onClick={handleConnect} className="btn-meme w-full h-14 text-2xl rounded-xl font-display tracking-wider text-white" style={{ background: "linear-gradient(135deg, #4CAF50 0%, #FF4D9D 100%)" }}>
                    {t.presale.apeIn}
                  </button>
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
                  <div>
                    <p className="text-xs font-display text-[#1a1a2e]/40 tracking-wider mb-2">{t.presale.yourLink}</p>
                    <div className="flex gap-2">
                      <Input readOnly value="https://pepewife.io/ref/7xKp4mNr" className="h-10 rounded-xl border-2 border-[#1a1a2e] bg-[#FFFDE7] font-mono text-xs" />
                      <button onClick={handleCopy} className={`btn-meme h-10 px-3 rounded-xl shrink-0 ${copied ? "bg-[#4CAF50]" : "bg-[#FFD54F]"} text-[#1a1a2e]`}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    {copied && <p className="text-xs text-[#4CAF50] font-display tracking-wide mt-1">{t.presale.copied}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ l: t.presale.shilled, v: "0", c: "text-[#4CAF50]", bg: "bg-[#E8F5E9]", bc: "border-[#4CAF50]" }, { l: t.presale.pending, v: "0 PWIFE", c: "text-[#FF4D9D]", bg: "bg-[#FCE4EC]", bc: "border-[#FF4D9D]" }, { l: t.presale.rate, v: "0%", c: "text-[#b8860b]", bg: "bg-[#FFFDE7]", bc: "border-[#FFD54F]" }].map(s => (
                        <div key={s.l} className={`${s.bg} rounded-xl p-2.5 text-center border-2 ${s.bc}`}>
                          <div className={`text-xl font-display ${s.c} tracking-wider`}>{s.v}</div>
                          <div className="text-[10px] font-display text-[#1a1a2e]/40 tracking-wider mt-0.5">{s.l}</div>
                        </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="meme-card bg-white rounded-2xl p-5">
                <h4 className="font-display text-lg text-[#1a1a2e] mb-3 tracking-wider">{t.presale.topShillers}</h4>
                <div className="space-y-2">
                  {[{ r: "🥇", a: "---", p: "0" }, { r: "🥈", a: "---", p: "0" }, { r: "🥉", a: "---", p: "0" }].map((x, i) => (
                    <div key={`shiller-${i}`} className="flex items-center gap-2 bg-[#FFFDE7] rounded-xl px-3 py-2 border-2 border-[#FFD54F]/50">
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
            <div className="sticker bg-[#FFD54F] text-[#1a1a2e] mb-4 text-lg inline-block" style={{ transform: "rotate(1deg)" }}>{t.whyBuy.banner}</div>
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-4">{t.whyBuy.title}</h2>
            <p className="text-lg text-[#1a1a2e]/60 max-w-2xl mx-auto font-bold">{t.whyBuy.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
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
              <img src="/tokenomics-girl.png" alt="PEPEWIFE Tokenomics" className={`w-full max-w-lg object-contain drop-shadow-2xl ${isRTL ? "scale-x-[-1]" : ""}`} />
            </div>
            <div className={`space-y-6 ${isRTL ? "md:order-first text-start" : ""}`}>
              <div>
                <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-3">{t.tokenomics.title}</h2>
                <p className="text-lg text-[#1a1a2e]/60 font-bold">{t.tokenomics.totalSupply} <span className="font-display text-2xl text-[#4CAF50]">1,000,000,000 PWIFE</span> 🐸</p>
              </div>
              <div className="space-y-2">
                {tokenomicsData.map((item, idx) => (
                  <div key={idx} className="meme-card flex items-center gap-3 p-3 rounded-2xl bg-white cursor-pointer">
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
            <h2 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider">{t.roadmap.title}</h2>
            <p className="text-lg text-[#1a1a2e]/50 font-bold mt-2">{t.roadmap.subtitle}</p>
          </div>
          <div className="space-y-6">
            {[
              { phase: t.roadmap.phase1, title: t.roadmap.phase1Title, desc: t.roadmap.phase1Desc, active: true, img: "/roadmap-phase1.png", color: "#4CAF50", meme: t.roadmap.phase1Meme },
              { phase: t.roadmap.phase2, title: t.roadmap.phase2Title, desc: t.roadmap.phase2Desc, active: false, img: "/roadmap-phase2.png", color: "#FF4D9D", meme: t.roadmap.phase2Meme },
              { phase: t.roadmap.phase3, title: t.roadmap.phase3Title, desc: t.roadmap.phase3Desc, active: false, img: "/roadmap-phase3.png", color: "#42A5F5", meme: t.roadmap.phase3Meme },
              { phase: t.roadmap.phase4, title: t.roadmap.phase4Title, desc: t.roadmap.phase4Desc, active: false, img: "/roadmap-phase4.png", color: "#AB47BC", meme: t.roadmap.phase4Meme },
            ].map((step, i) => (
              <div key={i} className={`meme-card flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl bg-white ${step.active ? `border-[#4CAF50] ${isRTL ? "shadow-[-6px_6px_0px_#2E7D32]" : "shadow-[6px_6px_0px_#2E7D32]"}` : ""}`}>
                <img src={step.img} alt={step.title} className={`w-28 h-28 object-contain shrink-0 drop-shadow-lg ${isRTL ? "md:order-last" : ""}`} />
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
          <h2 className="text-5xl font-display text-center mb-12 text-[#1a1a2e] comic-shadow tracking-wider">{t.social.title}</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { text: t.social.post1, time: t.social.post1Time, likes: t.social.post1Likes },
              { text: t.social.post2, time: t.social.post2Time, likes: t.social.post2Likes },
              { text: t.social.post3, time: t.social.post3Time, likes: t.social.post3Likes },
            ].map((post, i) => (
              <div key={i} className="meme-card bg-white rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <img src="/logo.png" alt="PW" className="w-10 h-10 rounded-full border-2 border-[#1a1a2e]" />
                  <div>
                    <div className="font-display text-[#1a1a2e] text-sm tracking-wider">PEPEWIFE 🐸</div>
                    <div className="text-xs text-[#1a1a2e]/40 font-bold">@PepeWifeCoin</div>
                  </div>
                  <Twitter className="ms-auto text-[#1DA1F2] h-5 w-5" />
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

    </div>
  );
}
