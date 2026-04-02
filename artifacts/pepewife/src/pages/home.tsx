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
    <div className="min-h-screen font-sans bg-white">

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo('hero')}>
              <span className="font-display font-bold text-2xl text-[#1a1a2e] tracking-tight">PEPEWIFE</span>
              <span className="bg-[#FF4D9D]/10 text-[#FF4D9D] px-2 py-0.5 rounded-full text-xs font-bold">$PWIFE</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              {[{ id: "presale", label: "Presale" }, { id: "why", label: "Why Buy" }, { id: "tokenomics", label: "Tokenomics" }, { id: "roadmap", label: "Roadmap" }].map(s => (
                <button key={s.id} onClick={() => scrollTo(s.id)} className="text-gray-600 hover:text-[#4CAF50] font-medium transition-colors text-sm">{s.label}</button>
              ))}
              {isConnected ? (
                <Button variant="outline" onClick={() => setIsDashboardOpen(true)} className="border-[#4CAF50]/30 text-[#4CAF50] hover:bg-[#4CAF50]/5 text-sm h-9">
                  <Wallet className="mr-1.5 h-3.5 w-3.5" /> {walletAddress}
                </Button>
              ) : (
                <Button onClick={handleConnect} className="bg-[#4CAF50] hover:bg-[#43A047] text-white rounded-full px-6 h-9 text-sm font-bold shadow-md">
                  Connect Wallet
                </Button>
              )}
            </div>
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg">
            <div className="px-4 pt-2 pb-4 space-y-3 flex flex-col">
              {[{ id: "presale", label: "Presale" }, { id: "why", label: "Why Buy" }, { id: "tokenomics", label: "Tokenomics" }, { id: "roadmap", label: "Roadmap" }].map(s => (
                <button key={s.id} onClick={() => scrollTo(s.id)} className="text-left py-1.5 font-medium text-gray-700">{s.label}</button>
              ))}
              <Button onClick={handleConnect} className="w-full mt-2 bg-[#4CAF50] text-white rounded-full font-bold">Connect Wallet</Button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="hero" className="relative overflow-hidden" style={{ backgroundImage: "url('/pepewife-bg.png')", backgroundSize: "cover", backgroundPosition: "right center", backgroundRepeat: "no-repeat" }}>
        <div className="pt-28 pb-24 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-[#FF4D9D] border border-[#FF4D9D]/20 rounded-full px-4 py-1.5 font-bold text-sm mb-6 animate-pulse shadow-sm">
              🔥 Stage 1 — 85% Sold Out — Hurry!
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-extrabold leading-tight mb-6 text-[#1a1a2e]" style={{ textShadow: "0 2px 12px rgba(255,255,255,0.8)" }}>
              Be Early...<br />Or <span className="text-[#FF4D9D]">Cry Later 😭</span>
            </h1>
            <p className="text-xl lg:text-2xl mb-8 max-w-2xl font-medium text-gray-700" style={{ textShadow: "0 1px 6px rgba(255,255,255,0.7)" }}>
              PEPE built the meme. SHE builds the future.<br className="hidden sm:block" />
              Join the most fashionable presale on Solana.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {[{ l: "Total Raised", v: "$1,247,500" }, { l: "Holders", v: "8,420+" }, { l: "Stage Price", v: "$0.0002" }].map(s => (
                <div key={s.l} className="bg-white/80 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/50 shadow-md">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.l}</div>
                  <div className="text-lg font-display font-extrabold text-[#1a1a2e]">{s.v}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => scrollTo('presale')} className="sm:w-auto bg-[#4CAF50] hover:bg-[#43A047] text-white rounded-full h-14 px-10 text-lg font-bold shadow-lg hover:-translate-y-0.5 transition-all">
                🚀 Buy PWIFE Now
              </Button>
              <Button size="lg" variant="outline" className="sm:w-auto rounded-full h-14 px-8 text-lg border-2 border-gray-300 bg-white/80 backdrop-blur-sm hover:bg-white font-semibold shadow-md">
                Join Community <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* PARTNERS */}
      <section className="py-8 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 text-center mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">As Featured In & Partners</p>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-content space-x-16 items-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex space-x-16 items-center shrink-0">
                <div className="flex items-center gap-2 font-display font-bold text-lg text-gray-300"><SiCoinmarketcap size={24} /> CoinMarketCap</div>
                <div className="flex items-center gap-2 font-display font-bold text-lg text-gray-300">🦎 CoinGecko</div>
                <div className="flex items-center gap-2 font-display font-bold text-lg text-gray-300"><SiSolana size={24} /> Solana</div>
                <div className="flex items-center gap-2 font-display font-bold text-lg text-gray-300"><Activity size={24} /> Raydium</div>
                <div className="flex items-center gap-2 font-display font-bold text-lg text-gray-300"><SiBinance size={24} /> Binance</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRESALE + REFERRAL */}
      <section id="presale" className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#FF4D9D]/10 text-[#FF4D9D] border border-[#FF4D9D]/20 rounded-full px-4 py-1 text-sm font-bold mb-4">⚡ Live Now</span>
            <h2 className="text-4xl font-display font-extrabold mb-2 text-[#1a1a2e]">Stage 1 Presale</h2>
            <p className="text-gray-500">Price rises after stage ends — don't miss out!</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <Card className="rounded-3xl border-2 border-[#4CAF50]/15 shadow-xl bg-white overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-[#4CAF50] via-[#FF4D9D] to-[#FFD54F]" />
              <CardContent className="p-7 space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-[0.2em] mb-3">⏳ Stage Ends In</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[{ val: timeLeft.days, label: "Days" }, { val: timeLeft.hours.toString().padStart(2, "0"), label: "Hrs" }, { val: timeLeft.minutes.toString().padStart(2, "0"), label: "Min" }, { val: timeLeft.seconds.toString().padStart(2, "0"), label: "Sec" }].map(t => (
                      <div key={t.label} className="bg-gradient-to-br from-[#4CAF50]/5 to-[#FF4D9D]/5 border border-gray-100 rounded-xl py-2.5 text-center">
                        <div className="text-2xl font-display font-extrabold text-[#1a1a2e]">{t.val}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#4CAF50]">127.5M Sold</span>
                    <span className="text-gray-400">Goal: 150M PWIFE</span>
                  </div>
                  <div className="relative">
                    <Progress value={presaleFilled} className="h-3 rounded-full" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-white drop-shadow">{presaleFilled}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[{ l: "Stage", v: "$0.0002", c: "text-[#4CAF50]", bg: "bg-[#4CAF50]/5" }, { l: "Next", v: "$0.0004", c: "text-[#FF4D9D]", bg: "bg-[#FF4D9D]/5" }, { l: "Listing", v: "$0.001", c: "text-[#b8860b]", bg: "bg-[#FFD54F]/10" }].map(p => (
                    <div key={p.l} className={`${p.bg} border border-gray-100 rounded-xl p-2.5 text-center`}>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">{p.l}</div>
                      <div className={`text-base font-display font-extrabold ${p.c}`}>{p.v}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Pay With</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["SOL", "USDT"] as const).map(c => (
                      <button key={c} onClick={() => setCurrency(c)}
                        className={`flex items-center justify-center gap-2 rounded-xl h-11 font-bold text-sm border-2 transition-all ${currency === c ? (c === "SOL" ? "bg-[#14F195]/10 border-[#14F195] text-[#0a9060]" : "bg-[#26A17B]/10 border-[#26A17B] text-[#1a7a5e]") : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                        {c === "SOL" ? <SiSolana size={16} /> : <SiTether size={16} />} {c}
                        {currency === c && <span className="text-[10px] ml-0.5">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="relative">
                    <Input type="number" placeholder={`Amount in ${currency}`} className="h-12 pl-4 pr-20 text-base rounded-xl border-2 font-semibold" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg font-bold text-xs text-gray-500">
                      {currency === "SOL" ? <SiSolana size={14} className="text-[#14F195]" /> : <SiTether size={14} className="text-[#26A17B]" />} {currency}
                    </div>
                  </div>
                  <div className="bg-[#4CAF50]/5 border border-[#4CAF50]/15 rounded-lg px-3 py-2.5 flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-medium">You receive</span>
                    <span className="font-display font-extrabold text-[#4CAF50] text-base">~ 0 PWIFE</span>
                  </div>
                  <Button onClick={handleConnect} className="w-full h-12 text-base rounded-xl font-extrabold shadow-lg border-0" style={{ background: "linear-gradient(135deg, #4CAF50 0%, #FF4D9D 100%)" }}>
                    🚀 Buy PWIFE Now
                  </Button>
                </div>
                <p className="text-center text-[10px] text-gray-400">Tokens distributed at TGE. No wallet needed to reserve.</p>
              </CardContent>
            </Card>

            {/* Referral */}
            <div className="flex flex-col gap-5">
              <div>
                <span className="inline-block bg-[#FF4D9D]/10 text-[#FF4D9D] rounded-full px-3 py-1 text-xs font-bold mb-2">🎁 Referral Program</span>
                <h3 className="text-3xl font-display font-extrabold text-[#1a1a2e] mb-1">Earn by Sharing</h3>
                <p className="text-gray-500 text-sm">Share your link and earn <strong className="text-[#FF4D9D]">5% rewards</strong> per friend.</p>
              </div>

              <Card className="rounded-2xl border border-gray-200 shadow-lg bg-white overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#4CAF50] via-[#FF4D9D] to-[#FFD54F]" />
                <CardContent className="p-5 space-y-5">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Your Referral Link</p>
                    <div className="flex gap-2">
                      <Input readOnly value="https://pepewife.io/ref/7xKp4mNr" className="h-10 rounded-xl bg-gray-50 border-2 font-mono text-xs" />
                      <Button onClick={handleCopy} className={`h-10 px-3 rounded-xl font-bold shrink-0 ${copied ? "bg-green-500" : "bg-[#4CAF50] hover:bg-[#43A047]"} text-white`}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    {copied && <p className="text-[10px] text-green-600 font-bold mt-1">✓ Copied!</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ l: "Referred", v: "0", c: "text-[#4CAF50]" }, { l: "Pending", v: "0 PWIFE", c: "text-[#FF4D9D]" }, { l: "Rate", v: "5%", c: "text-[#b8860b]" }].map(s => (
                      <div key={s.l} className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                        <div className={`text-lg font-display font-extrabold ${s.c}`}>{s.v}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-gray-200 shadow-md bg-white">
                <CardContent className="p-5">
                  <h4 className="font-display font-bold text-sm text-[#1a1a2e] mb-3">🏆 Top Referrers</h4>
                  <div className="space-y-1.5">
                    {[{ r: "🥇", a: "9mRk...2xNw", p: "71,000" }, { r: "🥈", a: "4pQj...8vBc", p: "49,000" }, { r: "🥉", a: "7tLx...5kMp", p: "33,500" }].map(x => (
                      <div key={x.a} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-sm">{x.r}</span>
                        <span className="font-mono text-xs text-gray-400 flex-1">{x.a}</span>
                        <span className="text-[10px] font-bold text-[#4CAF50]">{x.p} PWIFE</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* WHY BUY */}
      <section id="why" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#FFD54F]/15 text-[#b8860b] rounded-full px-4 py-1 text-sm font-bold mb-4">💡 Why PWIFE?</span>
            <h2 className="text-4xl md:text-5xl font-display font-extrabold mb-4 text-[#1a1a2e]">Why Buy PWIFE?</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Because every meme needs a queen. And every queen needs early believers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <TrendingUp className="h-6 w-6" />, c: "#4CAF50", title: "Early Entry Advantage", desc: "Stage 1 price is 5x lower than listing. The earlier you enter, the bigger the upside." },
              { icon: <Users className="h-6 w-6" />, c: "#FF4D9D", title: "Community Driven", desc: "8,000+ holders and growing. Decisions made by the community, for the community." },
              { icon: <Zap className="h-6 w-6" />, c: "#FFD54F", title: "Future Utilities", desc: "Staking rewards, governance, exclusive NFT drops, and the PWIFE ecosystem." },
              { icon: <Star className="h-6 w-6" />, c: "#AB47BC", title: "Meme Power", desc: "Strong branding + viral meme energy = unstoppable momentum." },
            ].map(card => (
              <div key={card.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${card.c}15`, color: card.c }}>
                  {card.icon}
                </div>
                <h3 className="font-display font-bold text-lg mb-2 text-[#1a1a2e]">{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW TO BUY */}
      <section id="how" className="py-24 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#4CAF50]/10 text-[#4CAF50] rounded-full px-4 py-1 text-sm font-bold mb-4">🛒 Simple Steps</span>
            <h2 className="text-4xl md:text-5xl font-display font-extrabold mb-4 text-[#1a1a2e]">How to Buy PWIFE</h2>
            <p className="text-lg text-gray-500">No experience needed. If you can use an app, you can buy PWIFE.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { s: "01", e: "👛", t: "Connect Wallet", d: "Use Phantom, Solflare, or any Solana wallet." },
              { s: "02", e: "💱", t: "Choose Currency", d: "Pick SOL or USDT." },
              { s: "03", e: "✏️", t: "Enter Amount", d: "Type how much you want." },
              { s: "04", e: "🚀", t: "Click Buy", d: "Confirm in your wallet." },
              { s: "05", e: "🎉", t: "Receive Tokens", d: "PWIFE at TGE." },
            ].map(step => (
              <div key={step.s} className="bg-white rounded-2xl p-5 text-center border border-gray-100 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="text-3xl mb-3">{step.e}</div>
                <div className="text-[10px] font-extrabold text-[#4CAF50] uppercase tracking-wider mb-1">Step {step.s}</div>
                <h3 className="font-display font-bold text-base mb-1.5 text-[#1a1a2e]">{step.t}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button size="lg" onClick={() => scrollTo('presale')} className="bg-[#4CAF50] hover:bg-[#43A047] text-white rounded-full h-14 px-10 text-lg font-bold shadow-lg hover:-translate-y-0.5 transition-all">
              I'm Ready — Buy Now 🐸
            </Button>
          </div>
        </div>
      </section>

      {/* TOKENOMICS */}
      <section id="tokenomics" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-[#1a1a2e]">Tokenomics</h2>
            <p className="text-lg text-gray-500">Total Supply: <strong className="text-[#1a1a2e]">1,000,000,000 PWIFE</strong></p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <img src="/tokenomics-girl.png" alt="PEPEWIFE Tokenomics" className="w-full max-w-md object-contain drop-shadow-2xl float-animation" />
            </div>
            <div className="space-y-6">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tokenomicsData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none" label={({ name, value }) => `${value}%`}>
                      {tokenomicsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #eee", background: "#fff", color: "#1a1a2e" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5">
                {tokenomicsData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                    <div className="flex-1">
                      <div className="font-semibold text-[#1a1a2e] text-sm">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.value * 10}M PWIFE</div>
                    </div>
                    <div className="font-display font-bold text-xl text-[#1a1a2e]">{item.value}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section id="roadmap" className="py-24 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-[#1a1a2e]">The Road to the Moon 🚀</h2>
          </div>
          <div className="space-y-8">
            {[
              { phase: "Phase 1", title: "Foundation", desc: "Website launch, community building, presale kick-off, social media expansion", active: true, img: "/roadmap-phase1.png", color: "#4CAF50" },
              { phase: "Phase 2", title: "Growth", desc: "CEX listings, influencer partnerships, 10K holders target, global marketing push", active: false, img: "/roadmap-phase2.png", color: "#FF4D9D" },
              { phase: "Phase 3", title: "Launch", desc: "Token generation event, DEX listing on Raydium, CMC & CoinGecko listings", active: false, img: "/roadmap-phase3.png", color: "#42A5F5" },
              { phase: "Phase 4", title: "Expansion", desc: "Tier-1 CEX listing, NFT collection, staking platform, PWIFE ecosystem", active: false, img: "/roadmap-phase4.png", color: "#AB47BC" },
            ].map((step, i) => (
              <div key={i} className={`flex flex-col md:flex-row items-center gap-6 p-6 rounded-3xl border-2 transition-all hover:shadow-lg ${step.active ? "border-[#4CAF50]/30 bg-[#4CAF50]/5 shadow-md" : "border-gray-100 bg-white shadow-sm"}`}>
                <img src={step.img} alt={step.title} className="w-28 h-28 object-contain shrink-0 drop-shadow-lg" />
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: step.color }}>{step.phase}</span>
                    {step.active && <span className="text-[10px] font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded-full uppercase">Current</span>}
                  </div>
                  <h3 className="text-xl font-display font-bold text-[#1a1a2e] mb-1">{step.title}</h3>
                  <p className="text-gray-500 text-sm">{step.desc}</p>
                </div>
                {step.active && <ChevronRight className="h-6 w-6 text-[#4CAF50] hidden md:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL FEED */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-center mb-12 text-[#1a1a2e]">Latest Updates 📢</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { text: "PEPEWIFE presale is live! 🎉 Stage 1 just launched. Get in early before price doubles.", time: "2h ago", likes: "🔥 892" },
              { text: "We just hit 50% sold in 48 hours! The Lady of Memes is taking over 👑", time: "1d ago", likes: "💚 1,247" },
              { text: "Raydium listing confirmed for TGE. Your bags are safe. 😏 WAGMI.", time: "2d ago", likes: "🚀 2,103" },
            ].map((post, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[#FF4D9D]/10 flex items-center justify-center font-bold text-[#FF4D9D] text-xs">PW</div>
                  <div>
                    <div className="font-bold text-[#1a1a2e] text-sm">PEPEWIFE</div>
                    <div className="text-xs text-gray-400">@PepeWifeCoin</div>
                  </div>
                  <Twitter className="ml-auto text-[#1DA1F2] h-4 w-4" />
                </div>
                <p className="text-sm mb-4 leading-relaxed text-gray-600">{post.text}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                  <span>{post.time}</span>
                  <span>{post.likes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RISK */}
      <section className="py-8 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#FFD54F]/10 border border-[#FFD54F]/20 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[#b8860b] mb-1">⚠️ Risk Warning</h3>
            <p className="text-gray-500 text-xs leading-relaxed">
              Cryptocurrency investments are highly volatile and carry significant risk. This is not financial advice. DYOR. Only invest what you can afford to lose.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1a1a2e] py-10 px-4">
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
            <Button variant="ghost" size="icon" className="rounded-full text-white/40 hover:text-[#1DA1F2] hover:bg-white/5"><Twitter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="rounded-full text-white/40 hover:text-[#0088cc] hover:bg-white/5"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-white/10 text-center text-xs text-white/20">
          © 2025 PEPEWIFE. All rights reserved. Not financial advice.
        </div>
      </footer>

      {/* DASHBOARD */}
      <Dialog open={isDashboardOpen} onOpenChange={setIsDashboardOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-[#4CAF50] to-[#FF4D9D] w-full" />
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-display font-bold text-[#1a1a2e]">Investor Dashboard</DialogTitle>
              <DialogDescription>
                Connected: <span className="font-mono bg-[#FF4D9D]/10 text-[#FF4D9D] px-2 py-1 rounded font-bold">{walletAddress}</span>
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-xl">
                {["overview", "transactions", "claim"].map(t => (
                  <TabsTrigger key={t} value={t} className="rounded-lg capitalize">{t}</TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#4CAF50]/5 border border-[#4CAF50]/15 rounded-2xl p-5">
                    <div className="text-xs font-bold text-[#4CAF50] mb-1 uppercase tracking-wider">Balance</div>
                    <div className="text-2xl font-display font-bold text-[#1a1a2e]">250,000 <span className="text-sm text-gray-400">PWIFE</span></div>
                  </div>
                  <div className="bg-[#FF4D9D]/5 border border-[#FF4D9D]/15 rounded-2xl p-5">
                    <div className="text-xs font-bold text-[#FF4D9D] mb-1 uppercase tracking-wider">Claimable</div>
                    <div className="text-2xl font-display font-bold text-[#1a1a2e]">0 <span className="text-sm text-gray-400">PWIFE</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex justify-between">
                  <div><div className="text-xs font-bold text-gray-400 uppercase mb-0.5">Status</div><div className="text-lg font-bold text-[#1a1a2e]">Stage 1</div></div>
                  <div className="text-right"><div className="text-xs font-bold text-gray-400 uppercase mb-0.5">Raised</div><div className="text-lg font-bold text-[#4CAF50]">$1,247,500</div></div>
                </div>
              </TabsContent>
              <TabsContent value="transactions">
                <div className="bg-white border rounded-2xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b"><tr>{["Date","Amount","PWIFE","Status"].map(h => <th key={h} className="px-5 py-3 font-bold text-gray-400 text-xs">{h}</th>)}</tr></thead>
                    <tbody className="divide-y">
                      {[{ d: "Today, 14:30", a: "2.5 SOL", p: "125,000" }, { d: "Yesterday", a: "2.5 SOL", p: "125,000" }].map(tx => (
                        <tr key={tx.d}><td className="px-5 py-3 text-gray-600">{tx.d}</td><td className="px-5 py-3 text-gray-600">{tx.a}</td><td className="px-5 py-3 font-bold text-[#4CAF50]">{tx.p}</td><td className="px-5 py-3"><span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">Success</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="claim">
                <div className="bg-gray-50 border rounded-2xl text-center py-10 px-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5"><span className="text-2xl">🔒</span></div>
                  <h3 className="text-xl font-display font-bold mb-2 text-[#1a1a2e]">Claiming Locked</h3>
                  <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">Claim your PWIFE after presale ends and TGE occurs.</p>
                  <Button disabled className="h-10 px-6 rounded-xl font-bold">Claim Tokens</Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
