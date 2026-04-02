import { useState, useEffect } from "react";
import { Menu, X, Twitter, Send, Wallet, ArrowRight, Activity, Copy, Check, Zap, Users, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { SiCoinmarketcap, SiBinance, SiSolana, SiTether } from "react-icons/si";

const SectionBg = ({ src, children, id, className = "", pos = "center" }: { src: string; children: React.ReactNode; id?: string; className?: string; pos?: string }) => (
  <section id={id} className={`relative overflow-hidden ${className}`} style={{ backgroundImage: `url('${src}')`, backgroundSize: "cover", backgroundPosition: pos, backgroundRepeat: "no-repeat" }}>
    <div className="relative z-10">{children}</div>
  </section>
);

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

  const glass = "bg-black/30 backdrop-blur-xl border border-white/15 shadow-2xl";
  const glassDark = "bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl";

  return (
    <div className="min-h-screen font-sans">

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo('hero')}>
              <span className="font-display font-bold text-2xl text-white tracking-tight">PEPEWIFE</span>
              <span className="bg-[#FF4D9D]/30 text-[#FF4D9D] px-2 py-0.5 rounded-full text-xs font-bold border border-[#FF4D9D]/30">$PWIFE</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              {["presale","why","tokenomics","roadmap"].map(s => (
                <button key={s} onClick={() => scrollTo(s)} className="text-white/80 hover:text-white font-medium transition-colors capitalize text-sm">{s === "why" ? "Why Buy" : s}</button>
              ))}
              {isConnected ? (
                <Button variant="outline" onClick={() => setIsDashboardOpen(true)} className="border-white/20 text-white bg-white/10 hover:bg-white/20 text-sm h-9">
                  <Wallet className="mr-1.5 h-3.5 w-3.5" /> {walletAddress}
                </Button>
              ) : (
                <Button onClick={handleConnect} className="bg-gradient-to-r from-[#4CAF50] to-[#FF4D9D] text-white rounded-full px-5 h-9 text-sm font-bold border-0 hover:opacity-90">
                  Connect Wallet
                </Button>
              )}
            </div>
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white">
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden bg-black/80 backdrop-blur-xl border-t border-white/10">
            <div className="px-4 pt-2 pb-4 space-y-3 flex flex-col">
              {["presale","why","tokenomics","roadmap"].map(s => (
                <button key={s} onClick={() => scrollTo(s)} className="text-left py-1.5 font-medium text-white/80 capitalize">{s === "why" ? "Why Buy" : s}</button>
              ))}
              <Button onClick={handleConnect} className="w-full mt-2 bg-gradient-to-r from-[#4CAF50] to-[#FF4D9D] text-white rounded-full font-bold border-0">Connect Wallet</Button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <SectionBg src="/pepewife-bg.png" id="hero" className="flex items-center" pos="right center">
        <div className="pt-24 pb-20 px-4 w-full">
          <div className="max-w-7xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#FF4D9D]/20 backdrop-blur-sm text-white border border-[#FF4D9D]/30 rounded-full px-4 py-1.5 font-bold text-sm mb-6 animate-pulse">
              🔥 Stage 1 — 85% Sold Out — Hurry!
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-extrabold leading-tight mb-6 text-white" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
              Be Early...<br />Or <span className="text-[#FF4D9D]">Cry Later 😭</span>
            </h1>
            <p className="text-xl lg:text-2xl mb-8 max-w-2xl font-medium text-white/90" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}>
              PEPE built the meme. SHE builds the future.<br className="hidden sm:block" />
              Join the most fashionable presale on Solana.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {[{ l: "Total Raised", v: "$1,247,500" }, { l: "Holders", v: "8,420+" }, { l: "Stage Price", v: "$0.0002" }].map(s => (
                <div key={s.l} className={`${glass} rounded-2xl px-5 py-3`}>
                  <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{s.l}</div>
                  <div className="text-lg font-display font-extrabold text-white">{s.v}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => scrollTo('presale')} className="sm:w-auto bg-gradient-to-r from-[#4CAF50] to-[#2E7D32] text-white rounded-full h-14 px-10 text-lg font-bold shadow-[0_4px_20px_rgba(76,175,80,0.5)] hover:shadow-[0_6px_30px_rgba(76,175,80,0.6)] hover:-translate-y-0.5 transition-all border-0">
                🚀 Buy PWIFE Now
              </Button>
              <Button size="lg" variant="outline" className="sm:w-auto rounded-full h-14 px-8 text-lg border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 font-semibold">
                Join Community <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </SectionBg>

      {/* PARTNERS */}
      <section className="py-8 bg-black/90 border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center mb-4">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">As Featured In & Partners</p>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-content space-x-16 items-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex space-x-16 items-center shrink-0">
                <div className="flex items-center gap-2 font-display font-bold text-lg text-white/30"><SiCoinmarketcap size={24} /> CoinMarketCap</div>
                <div className="flex items-center gap-2 font-display font-bold text-lg text-white/30">🦎 CoinGecko</div>
                <div className="flex items-center gap-2 font-display font-bold text-lg text-white/30"><SiSolana size={24} /> Solana</div>
                <div className="flex items-center gap-2 font-display font-bold text-lg text-white/30"><Activity size={24} /> Raydium</div>
                <div className="flex items-center gap-2 font-display font-bold text-lg text-white/30"><SiBinance size={24} /> Binance</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRESALE + REFERRAL */}
      <SectionBg src="/bg-presale.png" id="presale" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#FF4D9D]/20 text-[#FF4D9D] border border-[#FF4D9D]/30 rounded-full px-4 py-1 text-sm font-bold mb-4 backdrop-blur-sm">⚡ Live Now</span>
            <h2 className="text-4xl font-display font-extrabold mb-2 text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>Stage 1 Presale</h2>
            <p className="text-white/70">Price rises after stage ends — don't miss out!</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Presale Card */}
            <div className={`${glass} rounded-3xl overflow-hidden`}>
              <div className="h-1 bg-gradient-to-r from-[#4CAF50] via-[#FF4D9D] to-[#FFD54F]" />
              <div className="p-7 space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-center text-white/50 uppercase tracking-[0.2em] mb-3">⏳ Stage Ends In</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[{ val: timeLeft.days, label: "Days" }, { val: timeLeft.hours.toString().padStart(2, "0"), label: "Hrs" }, { val: timeLeft.minutes.toString().padStart(2, "0"), label: "Min" }, { val: timeLeft.seconds.toString().padStart(2, "0"), label: "Sec" }].map(t => (
                      <div key={t.label} className="bg-white/10 border border-white/10 rounded-xl py-2.5 text-center">
                        <div className="text-2xl font-display font-extrabold text-white">{t.val}</div>
                        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#4CAF50]">127.5M Sold</span>
                    <span className="text-white/50">Goal: 150M PWIFE</span>
                  </div>
                  <div className="relative">
                    <Progress value={presaleFilled} className="h-3 rounded-full" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-white drop-shadow">{presaleFilled}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[{ l: "Stage", v: "$0.0002", c: "text-[#4CAF50]" }, { l: "Next", v: "$0.0004", c: "text-[#FF4D9D]" }, { l: "Listing", v: "$0.001", c: "text-[#FFD54F]" }].map(p => (
                    <div key={p.l} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                      <div className="text-[10px] font-bold text-white/40 uppercase">{p.l}</div>
                      <div className={`text-base font-display font-extrabold ${p.c}`}>{p.v}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mb-2">Pay With</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["SOL", "USDT"] as const).map(c => (
                      <button key={c} onClick={() => setCurrency(c)}
                        className={`flex items-center justify-center gap-2 rounded-xl h-11 font-bold text-sm border transition-all ${currency === c ? (c === "SOL" ? "bg-[#14F195]/20 border-[#14F195]/50 text-[#14F195]" : "bg-[#26A17B]/20 border-[#26A17B]/50 text-[#26A17B]") : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"}`}>
                        {c === "SOL" ? <SiSolana size={16} /> : <SiTether size={16} />} {c}
                        {currency === c && <span className="text-[10px] ml-0.5">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="relative">
                    <Input type="number" placeholder={`Amount in ${currency}`} className="h-12 pl-4 pr-20 text-base rounded-xl bg-white/10 border-white/15 text-white placeholder:text-white/30 font-semibold" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg font-bold text-xs text-white/70">
                      {currency === "SOL" ? <SiSolana size={14} className="text-[#14F195]" /> : <SiTether size={14} className="text-[#26A17B]" />} {currency}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 flex justify-between items-center">
                    <span className="text-xs text-white/40 font-medium">You receive</span>
                    <span className="font-display font-extrabold text-[#4CAF50] text-base">~ 0 PWIFE</span>
                  </div>
                  <Button onClick={handleConnect} className="w-full h-12 text-base rounded-xl font-extrabold border-0 shadow-[0_4px_20px_rgba(76,175,80,0.4)]" style={{ background: "linear-gradient(135deg, #4CAF50 0%, #FF4D9D 100%)" }}>
                    🚀 Buy PWIFE Now
                  </Button>
                </div>
                <p className="text-center text-[10px] text-white/30">Tokens distributed at TGE.</p>
              </div>
            </div>

            {/* Referral */}
            <div className="flex flex-col gap-5">
              <div>
                <span className="inline-block bg-[#FF4D9D]/20 text-[#FF4D9D] rounded-full px-3 py-1 text-xs font-bold mb-2 border border-[#FF4D9D]/20">🎁 Referral</span>
                <h3 className="text-3xl font-display font-extrabold text-white mb-1" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>Earn by Sharing</h3>
                <p className="text-white/60 text-sm">Share your link and earn <strong className="text-[#FF4D9D]">5% rewards</strong> per friend.</p>
              </div>

              <div className={`${glass} rounded-2xl overflow-hidden`}>
                <div className="h-1 bg-gradient-to-r from-[#4CAF50] via-[#FF4D9D] to-[#FFD54F]" />
                <div className="p-5 space-y-5">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Your Referral Link</p>
                    <div className="flex gap-2">
                      <Input readOnly value="https://pepewife.io/ref/7xKp4mNr" className="h-10 rounded-xl bg-white/10 border-white/15 font-mono text-xs text-white/70" />
                      <Button onClick={handleCopy} className={`h-10 px-3 rounded-xl font-bold shrink-0 border-0 ${copied ? "bg-green-500" : "bg-gradient-to-r from-[#4CAF50] to-[#2E7D32]"} text-white`}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    {copied && <p className="text-[10px] text-green-400 font-bold mt-1">✓ Copied!</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ l: "Referred", v: "0", c: "text-[#4CAF50]" }, { l: "Pending", v: "0 PWIFE", c: "text-[#FF4D9D]" }, { l: "Rate", v: "5%", c: "text-[#FFD54F]" }].map(s => (
                      <div key={s.l} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                        <div className={`text-lg font-display font-extrabold ${s.c}`}>{s.v}</div>
                        <div className="text-[10px] font-bold text-white/40 uppercase mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${glass} rounded-2xl p-5`}>
                <h4 className="font-display font-bold text-sm text-white mb-3">🏆 Top Referrers</h4>
                <div className="space-y-1.5">
                  {[{ r: "🥇", a: "9mRk...2xNw", p: "71,000" }, { r: "🥈", a: "4pQj...8vBc", p: "49,000" }, { r: "🥉", a: "7tLx...5kMp", p: "33,500" }].map(x => (
                    <div key={x.a} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-sm">{x.r}</span>
                      <span className="font-mono text-xs text-white/50 flex-1">{x.a}</span>
                      <span className="text-[10px] font-bold text-[#4CAF50]">{x.p} PWIFE</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionBg>

      {/* WHY BUY */}
      <SectionBg src="/bg-why.png" id="why" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#FFD54F]/20 text-[#FFD54F] rounded-full px-4 py-1 text-sm font-bold mb-4 border border-[#FFD54F]/30 backdrop-blur-sm">💡 Why PWIFE?</span>
            <h2 className="text-4xl md:text-5xl font-display font-extrabold mb-4 text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>Why Buy PWIFE?</h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">Because every meme needs a queen. And every queen needs early believers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <TrendingUp className="h-6 w-6" />, c: "#4CAF50", title: "Early Entry Advantage", desc: "Stage 1 price is 5x lower than listing. The earlier you enter, the bigger the upside." },
              { icon: <Users className="h-6 w-6" />, c: "#FF4D9D", title: "Community Driven", desc: "8,000+ holders and growing. Decisions made by the community, for the community." },
              { icon: <Zap className="h-6 w-6" />, c: "#FFD54F", title: "Future Utilities", desc: "Staking rewards, governance, exclusive NFT drops, and the PWIFE ecosystem." },
              { icon: <Star className="h-6 w-6" />, c: "#AB47BC", title: "Meme Power 💅", desc: "Strong branding + viral meme energy = unstoppable momentum." },
            ].map(card => (
              <div key={card.title} className={`${glass} rounded-2xl p-6 hover:-translate-y-1 transition-transform`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${card.c}30`, color: card.c }}>
                  {card.icon}
                </div>
                <h3 className="font-display font-bold text-lg mb-2 text-white">{card.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionBg>

      {/* HOW TO BUY */}
      <SectionBg src="/bg-howtobuy.png" id="how" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#4CAF50]/20 text-[#4CAF50] rounded-full px-4 py-1 text-sm font-bold mb-4 border border-[#4CAF50]/30 backdrop-blur-sm">🛒 Simple Steps</span>
            <h2 className="text-4xl md:text-5xl font-display font-extrabold mb-4 text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>How to Buy PWIFE</h2>
            <p className="text-lg text-white/70">No experience needed. If you can use an app, you can buy PWIFE.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { s: "01", e: "👛", t: "Connect Wallet", d: "Use Phantom, Solflare, or any Solana wallet." },
              { s: "02", e: "💱", t: "Choose Currency", d: "Pick SOL or USDT." },
              { s: "03", e: "✏️", t: "Enter Amount", d: "Type how much you want." },
              { s: "04", e: "🚀", t: "Click Buy", d: "Confirm in your wallet." },
              { s: "05", e: "🎉", t: "Receive Tokens", d: "PWIFE at TGE." },
            ].map(step => (
              <div key={step.s} className={`${glass} rounded-2xl p-5 text-center hover:-translate-y-1 transition-transform`}>
                <div className="text-3xl mb-2">{step.e}</div>
                <div className="text-[10px] font-extrabold text-[#4CAF50] uppercase tracking-wider mb-1">Step {step.s}</div>
                <h3 className="font-display font-bold text-base mb-1.5 text-white">{step.t}</h3>
                <p className="text-white/50 text-xs leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button size="lg" onClick={() => scrollTo('presale')} className="bg-gradient-to-r from-[#4CAF50] to-[#2E7D32] text-white rounded-full h-14 px-10 text-lg font-bold shadow-[0_4px_20px_rgba(76,175,80,0.5)] border-0 hover:-translate-y-0.5 transition-all">
              I'm Ready — Buy Now 🐸
            </Button>
          </div>
        </div>
      </SectionBg>

      {/* TOKENOMICS */}
      <SectionBg src="/bg-tokenomics.png" id="tokenomics" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>Tokenomics</h2>
            <p className="text-lg text-white/70">Total Supply: <strong className="text-white">1,000,000,000 PWIFE</strong></p>
          </div>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tokenomicsData} cx="50%" cy="50%" innerRadius={90} outerRadius={130} paddingAngle={4} dataKey="value" stroke="none">
                    {tokenomicsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.7)", color: "#fff", backdropFilter: "blur(10px)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {tokenomicsData.map((item, idx) => (
                <div key={idx} className={`${glass} flex items-center gap-3 p-4 rounded-xl hover:-translate-y-0.5 transition-transform`}>
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="flex-1 font-semibold text-white">{item.name}</div>
                  <div className="font-display font-bold text-lg text-white">{item.value}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionBg>

      {/* ROADMAP */}
      <SectionBg src="/bg-roadmap.png" id="roadmap" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-16 text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>The Road to the Moon 🚀</h2>
          <div className="space-y-6">
            {[
              { phase: "Phase 1", title: "Foundation", desc: "Website launch, community building, presale kick-off", active: true },
              { phase: "Phase 2", title: "Growth", desc: "CEX listings, influencer partnerships, 10K holders", active: false },
              { phase: "Phase 3", title: "Launch", desc: "Token generation event, DEX listing on Raydium, CMC/CoinGecko", active: false },
              { phase: "Phase 4", title: "Expansion", desc: "Tier-1 CEX, NFT collection, PWIFE ecosystem", active: false },
            ].map((step, i) => (
              <div key={i} className={`${step.active ? glass : glassDark} rounded-2xl p-6 ${step.active ? "border-[#4CAF50]/30 ring-1 ring-[#4CAF50]/20" : ""} hover:-translate-y-0.5 transition-transform`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${step.active ? "bg-[#4CAF50]" : "bg-white/10"}`}>
                    <span className="text-sm font-bold text-white">{i + 1}</span>
                  </div>
                  <div>
                    <div className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${step.active ? "text-[#4CAF50]" : "text-white/40"}`}>{step.phase}</div>
                    <h3 className="text-lg font-display font-bold text-white">{step.title}</h3>
                    <p className="text-white/50 text-sm">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionBg>

      {/* SOCIAL FEED */}
      <SectionBg src="/bg-community.png" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-center mb-12 text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>Latest Updates 📢</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { text: "PEPEWIFE presale is live! 🎉 Stage 1 just launched. Get in early before price doubles.", time: "2h ago", likes: "🔥 892" },
              { text: "We just hit 50% sold in 48 hours! The Lady of Memes is taking over 👑", time: "1d ago", likes: "💚 1,247" },
              { text: "Raydium listing confirmed for TGE. Your bags are safe. 😏 WAGMI.", time: "2d ago", likes: "🚀 2,103" },
            ].map((post, i) => (
              <div key={i} className={`${glass} rounded-2xl p-5 hover:-translate-y-1 transition-transform`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#FF4D9D]/20 flex items-center justify-center font-bold text-[#FF4D9D] text-xs">PW</div>
                  <div>
                    <div className="font-bold text-white text-sm">PEPEWIFE</div>
                    <div className="text-xs text-white/40">@PepeWifeCoin</div>
                  </div>
                  <Twitter className="ml-auto text-[#1DA1F2] h-4 w-4" />
                </div>
                <p className="text-sm mb-4 leading-relaxed text-white/80">{post.text}</p>
                <div className="flex items-center justify-between text-xs text-white/40 font-medium">
                  <span>{post.time}</span>
                  <span>{post.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionBg>

      {/* RISK */}
      <section className="py-10 px-4 bg-black/90">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#FFD54F]/10 border border-[#FFD54F]/20 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-base font-bold text-[#FFD54F] mb-2">⚠️ Risk Warning</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              Cryptocurrency investments are highly volatile and carry significant risk. This is not financial advice. DYOR. Only invest what you can afford to lose. Meme coins are particularly risky.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black/95 border-t border-white/10 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="font-display font-bold text-xl text-white tracking-tight mb-0.5">PEPEWIFE</div>
            <p className="text-white/40 text-xs">The Lady Of Memes — Solana</p>
          </div>
          <div className="flex gap-5">
            {["Whitepaper", "Roadmap", "FAQ"].map(link => (
              <button key={link} onClick={() => link === "Roadmap" ? scrollTo("roadmap") : undefined} className="text-white/40 hover:text-white font-medium text-sm transition-colors">{link}</button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="icon" className="rounded-full text-white/40 hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/10"><Twitter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full text-white/40 hover:text-[#0088cc] hover:bg-[#0088cc]/10"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-white/5 text-center text-xs text-white/20">
          © 2025 PEPEWIFE. All rights reserved. Not financial advice.
        </div>
      </footer>

      {/* DASHBOARD */}
      <Dialog open={isDashboardOpen} onOpenChange={setIsDashboardOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden bg-black/90 backdrop-blur-xl border-white/10 shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-[#4CAF50] to-[#FF4D9D] w-full" />
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-display font-bold text-white">Investor Dashboard</DialogTitle>
              <DialogDescription>
                Connected: <span className="font-mono bg-[#FF4D9D]/15 text-[#FF4D9D] px-2 py-1 rounded font-bold">{walletAddress}</span>
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/5 p-1 rounded-xl border border-white/10">
                {["overview", "transactions", "claim"].map(t => (
                  <TabsTrigger key={t} value={t} className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 capitalize">{t}</TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#4CAF50]/10 border border-[#4CAF50]/20 rounded-2xl p-5">
                    <div className="text-xs font-bold text-[#4CAF50] mb-1 uppercase tracking-wider">Balance</div>
                    <div className="text-2xl font-display font-bold text-white">250,000 <span className="text-sm text-white/50">PWIFE</span></div>
                  </div>
                  <div className="bg-[#FF4D9D]/10 border border-[#FF4D9D]/20 rounded-2xl p-5">
                    <div className="text-xs font-bold text-[#FF4D9D] mb-1 uppercase tracking-wider">Claimable</div>
                    <div className="text-2xl font-display font-bold text-white">0 <span className="text-sm text-white/50">PWIFE</span></div>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex justify-between">
                  <div><div className="text-xs font-bold text-white/40 uppercase mb-0.5">Status</div><div className="text-lg font-bold text-white">Stage 1</div></div>
                  <div className="text-right"><div className="text-xs font-bold text-white/40 uppercase mb-0.5">Raised</div><div className="text-lg font-bold text-[#4CAF50]">$1,247,500</div></div>
                </div>
              </TabsContent>
              <TabsContent value="transactions">
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white/5 border-b border-white/10"><tr>{["Date","Amount","PWIFE","Status"].map(h => <th key={h} className="px-5 py-3 font-bold text-white/40 text-xs">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {[{ d: "Today, 14:30", a: "2.5 SOL", p: "125,000" }, { d: "Yesterday", a: "2.5 SOL", p: "125,000" }].map(tx => (
                        <tr key={tx.d}><td className="px-5 py-3 text-white/70">{tx.d}</td><td className="px-5 py-3 text-white/70">{tx.a}</td><td className="px-5 py-3 font-bold text-[#4CAF50]">{tx.p}</td><td className="px-5 py-3"><span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded">Success</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="claim">
                <div className="bg-white/5 border border-white/10 rounded-2xl text-center py-10 px-6">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-5"><span className="text-2xl">🔒</span></div>
                  <h3 className="text-xl font-display font-bold mb-2 text-white">Claiming Locked</h3>
                  <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">Claim your PWIFE after presale ends and TGE occurs.</p>
                  <Button disabled className="h-10 px-6 rounded-xl font-bold bg-white/5 text-white/30 border border-white/10">Claim Tokens</Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
