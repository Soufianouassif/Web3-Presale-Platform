import { useState, useEffect } from "react";
import { Menu, X, Twitter, Send, Wallet, ArrowRight, Activity, Copy, Check, Zap, Users, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    { name: "Presale", value: 40, color: "hsl(122, 39%, 49%)" },
    { name: "Liquidity", value: 20, color: "hsl(330, 100%, 65%)" },
    { name: "Team & Advisors", value: 15, color: "hsl(43, 100%, 65%)" },
    { name: "Marketing", value: 15, color: "hsl(206, 100%, 65%)" },
    { name: "Reserve", value: 10, color: "hsl(270, 100%, 65%)" },
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

  const handleConnect = () => {
    setIsConnected(true);
    setIsDashboardOpen(true);
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen font-sans bg-[#f6fdf6]">

      {/* ── NAVIGATION ── */}
      <nav className="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo('hero')}>
              <span className="font-display font-bold text-2xl text-primary tracking-tight">PEPEWIFE</span>
              <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-xs font-bold">$PWIFE</span>
            </div>

            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollTo('presale')} className="text-foreground hover:text-primary font-medium transition-colors">Presale</button>
              <button onClick={() => scrollTo('why')} className="text-foreground hover:text-primary font-medium transition-colors">Why Buy</button>
              <button onClick={() => scrollTo('tokenomics')} className="text-foreground hover:text-primary font-medium transition-colors">Tokenomics</button>
              <button onClick={() => scrollTo('roadmap')} className="text-foreground hover:text-primary font-medium transition-colors">Roadmap</button>
              {isConnected ? (
                <Button variant="outline" onClick={() => setIsDashboardOpen(true)} className="border-primary text-primary hover:bg-primary/5">
                  <Wallet className="mr-2 h-4 w-4" /> {walletAddress}
                </Button>
              ) : (
                <Button onClick={handleConnect} className="bg-primary hover:bg-primary/90 text-white btn-primary-glow rounded-full px-6">
                  Connect Wallet
                </Button>
              )}
            </div>

            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b absolute w-full left-0 top-20 shadow-lg">
            <div className="px-4 pt-2 pb-6 space-y-4 flex flex-col">
              <button onClick={() => scrollTo('presale')} className="text-left py-2 font-medium">Presale</button>
              <button onClick={() => scrollTo('why')} className="text-left py-2 font-medium">Why Buy</button>
              <button onClick={() => scrollTo('tokenomics')} className="text-left py-2 font-medium">Tokenomics</button>
              <button onClick={() => scrollTo('roadmap')} className="text-left py-2 font-medium">Roadmap</button>
              {isConnected ? (
                <Button variant="outline" onClick={() => setIsDashboardOpen(true)} className="w-full mt-2">
                  <Wallet className="mr-2 h-4 w-4" /> {walletAddress}
                </Button>
              ) : (
                <Button onClick={handleConnect} className="w-full mt-2 btn-primary-glow">Connect Wallet</Button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        id="hero"
        className="pt-32 pb-24 lg:pt-44 lg:pb-32 px-4 relative overflow-hidden min-h-[90vh] flex items-center"
        style={{
          backgroundImage: "url('/pepewife-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-white/25 to-[#f6fdf6]/90 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 w-full">
          {/* FOMO badge */}
          <div className="flex justify-center lg:justify-start mb-6">
            <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm text-secondary border border-secondary/30 rounded-full px-5 py-2 font-bold text-sm shadow-md animate-pulse">
              🔥 Stage 1 — 85% Sold Out — Hurry!
            </div>
          </div>

          <div className="max-w-3xl">
            <h1
              className="text-5xl lg:text-7xl font-display font-extrabold leading-tight mb-6"
              style={{ color: "#1a3a1a", textShadow: "0 2px 12px rgba(255,255,255,0.9)" }}
            >
              Be Early...<br />Or{" "}
              <span style={{ color: "#FF4D9D", textShadow: "0 2px 12px rgba(255,255,255,0.9)" }}>Cry Later 😭</span>
            </h1>
            <p
              className="text-xl lg:text-2xl mb-10 max-w-2xl font-medium"
              style={{ color: "#1a3a1a", textShadow: "0 1px 6px rgba(255,255,255,0.8)" }}
            >
              PEPE built the meme. SHE builds the future. <br className="hidden sm:block" />
              Join the most fashionable and fierce presale on Solana.
            </p>

            {/* Mini stats row */}
            <div className="flex flex-wrap gap-4 mb-10">
              {[
                { label: "Total Raised", value: "$1,247,500" },
                { label: "Holders", value: "8,420+" },
                { label: "Stage Price", value: "$0.0002" },
              ].map((s) => (
                <div key={s.label} className="bg-white/80 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white shadow-md">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{s.label}</div>
                  <div className="text-xl font-display font-extrabold text-foreground">{s.value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={() => scrollTo('presale')}
                className="sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-full h-14 px-10 text-lg btn-primary-glow font-bold shadow-xl">
                🚀 Buy PWIFE Now
              </Button>
              <Button size="lg" variant="outline"
                className="sm:w-auto rounded-full h-14 px-8 text-lg border-2 bg-white/80 backdrop-blur-sm hover:bg-white font-semibold shadow-md">
                Join Community <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── PARTNERS TICKER ── */}
      <section className="py-10 border-y border-black/5 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 text-center mb-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">As Featured In & Partners</p>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-content space-x-16 items-center">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex space-x-16 items-center shrink-0">
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-400"><SiCoinmarketcap size={28} /> CoinMarketCap</div>
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-400">🦎 CoinGecko</div>
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-400"><SiSolana size={28} /> Solana</div>
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-400"><Activity size={28} /> Raydium</div>
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-400"><SiBinance size={28} /> Binance News</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRESALE BOX ── */}
      <section id="presale" className="py-20 px-4 relative z-20">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block bg-secondary/10 text-secondary border border-secondary/20 rounded-full px-4 py-1 text-sm font-bold mb-4">⚡ Live Now</span>
            <h2 className="text-4xl font-display font-extrabold mb-2">Stage 1 Presale</h2>
            <p className="text-muted-foreground">Price rises after stage ends — don't miss out!</p>
          </div>

          <Card className="border-2 border-primary/20 shadow-2xl bg-white rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-accent" />

            <CardContent className="p-8 space-y-7">

              {/* Countdown */}
              <div>
                <p className="text-xs font-bold text-center text-muted-foreground uppercase tracking-widest mb-3">⏳ Stage Ends In</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: timeLeft.days, label: "Days" },
                    { val: timeLeft.hours.toString().padStart(2, "0"), label: "Hours" },
                    { val: timeLeft.minutes.toString().padStart(2, "0"), label: "Mins" },
                    { val: timeLeft.seconds.toString().padStart(2, "0"), label: "Secs" },
                  ].map((t) => (
                    <div key={t.label} className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/15 rounded-2xl py-3 text-center">
                      <div className="text-3xl font-display font-extrabold text-foreground">{t.val}</div>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-primary">127,500,000 Sold</span>
                  <span className="text-muted-foreground">Goal: 150,000,000 PWIFE</span>
                </div>
                <div className="relative">
                  <Progress value={presaleFilled} className="h-4 rounded-full" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-extrabold text-white drop-shadow">{presaleFilled}%</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 SOL = 50,000 PWIFE</span>
                  <span>1 USDT = 5,000 PWIFE</span>
                </div>
              </div>

              {/* Price display */}
              <div className="flex gap-3">
                <div className="flex-1 bg-primary/5 border border-primary/15 rounded-2xl p-3 text-center">
                  <div className="text-xs font-bold text-muted-foreground uppercase">Stage Price</div>
                  <div className="text-lg font-display font-extrabold text-primary">$0.0002</div>
                </div>
                <div className="flex-1 bg-secondary/5 border border-secondary/15 rounded-2xl p-3 text-center">
                  <div className="text-xs font-bold text-muted-foreground uppercase">Next Stage</div>
                  <div className="text-lg font-display font-extrabold text-secondary">$0.0004</div>
                </div>
                <div className="flex-1 bg-accent/10 border border-accent/20 rounded-2xl p-3 text-center">
                  <div className="text-xs font-bold text-muted-foreground uppercase">Listing</div>
                  <div className="text-lg font-display font-extrabold" style={{ color: "#b8860b" }}>$0.001</div>
                </div>
              </div>

              {/* Currency selector */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Pay With</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCurrency("SOL")}
                    className={`flex items-center justify-center gap-2 rounded-2xl h-12 font-bold text-base border-2 transition-all ${
                      currency === "SOL"
                        ? "bg-[#14F195]/10 border-[#14F195] text-[#0a9060]"
                        : "bg-gray-50 border-gray-200 text-muted-foreground hover:border-gray-300"
                    }`}
                  >
                    <SiSolana className={currency === "SOL" ? "text-[#14F195]" : "text-gray-400"} size={18} />
                    SOL
                    {currency === "SOL" && <span className="ml-1 text-xs bg-[#14F195]/20 text-[#0a9060] px-1.5 py-0.5 rounded-full">✓</span>}
                  </button>
                  <button
                    onClick={() => setCurrency("USDT")}
                    className={`flex items-center justify-center gap-2 rounded-2xl h-12 font-bold text-base border-2 transition-all ${
                      currency === "USDT"
                        ? "bg-[#26A17B]/10 border-[#26A17B] text-[#1a7a5e]"
                        : "bg-gray-50 border-gray-200 text-muted-foreground hover:border-gray-300"
                    }`}
                  >
                    <SiTether className={currency === "USDT" ? "text-[#26A17B]" : "text-gray-400"} size={18} />
                    USDT
                    {currency === "USDT" && <span className="ml-1 text-xs bg-[#26A17B]/20 text-[#1a7a5e] px-1.5 py-0.5 rounded-full">✓</span>}
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={`Amount in ${currency}`}
                    className="h-14 pl-4 pr-24 text-lg rounded-2xl bg-white border-2 font-semibold"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-xl font-bold text-sm">
                    {currency === "SOL"
                      ? <SiSolana className="text-[#14F195]" size={16} />
                      : <SiTether className="text-[#26A17B]" size={16} />
                    }
                    {currency}
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground font-medium">You receive</span>
                  <span className="font-display font-extrabold text-primary text-lg">~ 0 PWIFE</span>
                </div>

                <Button
                  onClick={handleConnect}
                  className="w-full h-14 text-lg rounded-2xl font-extrabold shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #4CAF50 0%, #FF4D9D 100%)",
                    boxShadow: "0 4px 24px rgba(76,175,80,0.35), 0 0 0 0 transparent",
                  }}
                >
                  🚀 Buy PWIFE Now
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Tokens distributed at TGE. No wallet needed to reserve.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── WHY BUY PWIFE ── */}
      <section id="why" className="py-24 px-4 bg-white/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-accent/20 text-yellow-700 rounded-full px-4 py-1 text-sm font-bold mb-4">💡 Why PWIFE?</span>
            <h2 className="text-4xl md:text-5xl font-display font-extrabold mb-4">Why Buy PWIFE?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Because every meme needs a queen. And every queen needs early believers.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <TrendingUp className="h-7 w-7" />,
                color: "from-primary/15 to-primary/5",
                border: "border-primary/20",
                iconColor: "text-primary",
                title: "Early Entry Advantage",
                desc: "Stage 1 price is 5× lower than the listing price. The earlier you enter, the bigger the potential upside.",
              },
              {
                icon: <Users className="h-7 w-7" />,
                color: "from-secondary/15 to-secondary/5",
                border: "border-secondary/20",
                iconColor: "text-secondary",
                title: "Community Driven",
                desc: "8,000+ holders and growing. Decisions are made by the community, for the community. Your voice matters.",
              },
              {
                icon: <Zap className="h-7 w-7" />,
                color: "from-accent/20 to-accent/5",
                border: "border-accent/20",
                iconColor: "text-yellow-600",
                title: "Future Utilities",
                desc: "Staking rewards, governance voting, exclusive NFT drops, and a PWIFE ecosystem all on the roadmap.",
              },
              {
                icon: <Star className="h-7 w-7" />,
                color: "from-purple-100 to-purple-50",
                border: "border-purple-200",
                iconColor: "text-purple-500",
                title: "Meme Power 💅",
                desc: "Strong branding + viral meme energy = unstoppable momentum. The internet loves a queen with bags.",
              },
            ].map((card) => (
              <Card key={card.title} className={`rounded-3xl border-2 ${card.border} shadow-md hover:shadow-xl hover:-translate-y-1 transition-all bg-gradient-to-br ${card.color}`}>
                <CardContent className="p-7">
                  <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-5 shadow-sm ${card.iconColor}`}>
                    {card.icon}
                  </div>
                  <h3 className="font-display font-bold text-xl mb-3">{card.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW TO BUY ── */}
      <section id="how" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-primary/10 text-primary rounded-full px-4 py-1 text-sm font-bold mb-4">🛒 Simple Steps</span>
            <h2 className="text-4xl md:text-5xl font-display font-extrabold mb-4">How to Buy PWIFE</h2>
            <p className="text-xl text-muted-foreground">No experience needed. If you can use an app, you can buy PWIFE.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
            {[
              { step: "01", emoji: "👛", title: "Connect Wallet", desc: "Use Phantom, Solflare, or any Solana wallet." },
              { step: "02", emoji: "💱", title: "Choose Currency", desc: "Pick SOL or USDT — whatever you have." },
              { step: "03", emoji: "✏️", title: "Enter Amount", desc: "Type how much you want to invest." },
              { step: "04", emoji: "🚀", title: "Click Buy", desc: "Confirm the transaction in your wallet." },
              { step: "05", emoji: "🎉", title: "Receive Tokens", desc: "PWIFE lands in your wallet at TGE." },
            ].map((s, i) => (
              <div key={s.step} className="relative flex flex-col items-center text-center">
                {i < 4 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+2rem)] right-0 h-0.5 bg-gradient-to-r from-primary/30 to-transparent z-0" />
                )}
                <Card className="w-full rounded-3xl border border-black/5 shadow-md bg-white hover:shadow-lg hover:-translate-y-1 transition-all z-10">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-3">{s.emoji}</div>
                    <div className="text-xs font-extrabold text-primary uppercase tracking-wider mb-2">Step {s.step}</div>
                    <h3 className="font-display font-bold text-lg mb-2">{s.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button size="lg" onClick={() => scrollTo('presale')}
              className="bg-primary hover:bg-primary/90 text-white rounded-full h-14 px-10 text-lg btn-primary-glow font-bold shadow-lg">
              I'm Ready — Buy Now 🐸
            </Button>
          </div>
        </div>
      </section>

      {/* ── TOKENOMICS ── */}
      <section id="tokenomics" className="py-24 px-4 bg-white/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Tokenomics</h2>
            <p className="text-xl text-muted-foreground">Total Supply: <strong className="text-foreground">1,000,000,000 PWIFE</strong></p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tokenomicsData} cx="50%" cy="50%" innerRadius={100} outerRadius={140} paddingAngle={5} dataKey="value" stroke="none">
                    {tokenomicsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {tokenomicsData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-black/5 hover:shadow-md transition-shadow">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="flex-1 font-semibold text-lg">{item.name}</div>
                  <div className="font-display font-bold text-xl">{item.value}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section id="roadmap" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-16">The Road to the Moon 🚀</h2>
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-primary before:via-secondary before:to-muted">
            {[
              { phase: "Phase 1", title: "Foundation", desc: "Website launch, community building, presale kick-off", active: true },
              { phase: "Phase 2", title: "Growth", desc: "CEX listings, influencer partnerships, 10K holders", active: false },
              { phase: "Phase 3", title: "Launch", desc: "Token generation event, DEX listing on Raydium, CMC/CoinGecko listing", active: false },
              { phase: "Phase 4", title: "Expansion", desc: "Tier-1 CEX listing, NFT collection, PWIFE ecosystem", active: false },
            ].map((step, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-md z-10 ${step.active ? "bg-primary" : "bg-gray-300"}`}>
                  <div className={`w-3 h-3 rounded-full ${step.active ? "bg-white" : "bg-transparent"}`} />
                </div>
                <Card className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] rounded-2xl transition-transform hover:-translate-y-1 ${step.active ? "border-primary ring-1 ring-primary/20 shadow-lg" : "border-black/5 shadow-sm"}`}>
                  <CardContent className="p-6">
                    <div className={`text-sm font-bold uppercase tracking-wider mb-2 ${step.active ? "text-primary" : "text-muted-foreground"}`}>{step.phase}</div>
                    <h3 className="text-xl font-display font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REFERRAL ── */}
      <section id="referral" className="py-24 px-4 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-secondary/10 text-secondary rounded-full px-4 py-1 text-sm font-bold mb-5">🎁 Referral Program</span>
          <h2 className="text-4xl md:text-5xl font-display font-extrabold mb-4">Earn by Sharing</h2>
          <p className="text-xl text-muted-foreground mb-10">
            Share your unique link and earn rewards for every friend who joins the PWIFE presale.
          </p>

          <Card className="rounded-3xl border border-secondary/20 shadow-xl bg-white overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-accent w-full" />
            <CardContent className="p-8 space-y-8">

              {/* Referral link input */}
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 text-left">Your Referral Link</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value="https://pepewife.io/ref/7xKp4mNr"
                    className="h-12 rounded-2xl bg-gray-50 border-2 font-mono text-sm"
                  />
                  <Button onClick={handleCopy} className={`h-12 px-5 rounded-2xl font-bold shrink-0 transition-all ${copied ? "bg-green-500 text-white" : "bg-primary text-white btn-primary-glow"}`}>
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </Button>
                </div>
                {copied && <p className="text-xs text-green-600 font-bold mt-2 text-left">✓ Copied to clipboard!</p>}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Friends Referred", value: "0", color: "text-primary" },
                  { label: "Pending Rewards", value: "0 PWIFE", color: "text-secondary" },
                  { label: "Reward Rate", value: "5%", color: "text-yellow-600" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-2xl p-4 text-center border border-black/5">
                    <div className={`text-2xl font-display font-extrabold ${s.color}`}>{s.value}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 text-sm text-muted-foreground leading-relaxed">
                💅 <strong className="text-foreground">How it works:</strong> Share your link. When a friend buys PWIFE using it, you earn <strong className="text-secondary">5% of their purchase</strong> in PWIFE tokens — paid at TGE. The more you share, the more you earn.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SOCIAL FEED ── */}
      <section className="py-24 px-4 bg-white/60">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-center mb-12">Latest Updates 📢</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { text: "PEPEWIFE presale is live! 🎉 Stage 1 just launched. Get in early before price doubles.", time: "2h ago", likes: "🔥 892" },
              { text: "We just hit 50% sold in 48 hours! The Lady of Memes is taking over 👑", time: "1d ago", likes: "💚 1,247" },
              { text: "Raydium listing confirmed for TGE. Your bags are safe. 😏 WAGMI.", time: "2d ago", likes: "🚀 2,103" },
            ].map((post, i) => (
              <Card key={i} className="rounded-3xl border border-black/5 shadow-md bg-white hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-secondary">PW</div>
                    <div>
                      <div className="font-bold">PEPEWIFE</div>
                      <div className="text-sm text-muted-foreground">@PepeWifeCoin</div>
                    </div>
                    <Twitter className="ml-auto text-[#1DA1F2] h-5 w-5" />
                  </div>
                  <p className="text-base mb-6 leading-relaxed">{post.text}</p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
                    <span>{post.time}</span>
                    <span>{post.likes} likes</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── RISK WARNING ── */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-yellow-800 mb-3">⚠️ Risk Warning</h3>
            <p className="text-yellow-700 leading-relaxed">
              Cryptocurrency investments are highly volatile and carry significant risk. This is not financial advice. Always Do Your Own Research (DYOR). Only invest what you can afford to lose. Past performance is not indicative of future results. Meme coins are particularly risky.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="font-display font-bold text-2xl text-primary tracking-tight mb-1">PEPEWIFE</div>
            <p className="text-muted-foreground text-sm">The Lady Of Memes — Solana</p>
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-muted-foreground hover:text-primary font-medium transition-colors">Whitepaper</a>
            <button onClick={() => scrollTo('roadmap')} className="text-muted-foreground hover:text-primary font-medium transition-colors">Roadmap</button>
            <a href="#" className="text-muted-foreground hover:text-primary font-medium transition-colors">FAQ</a>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2]">
              <Twitter className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#0088cc]/10 hover:text-[#0088cc]">
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t text-center text-sm text-muted-foreground">
          © 2025 PEPEWIFE. All rights reserved. Not financial advice.
        </div>
      </footer>

      {/* ── DASHBOARD MODAL ── */}
      <Dialog open={isDashboardOpen} onOpenChange={setIsDashboardOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl border-white shadow-2xl">
          <div className="h-2 bg-gradient-to-r from-primary to-secondary w-full" />
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-display font-bold">Investor Dashboard</DialogTitle>
              <DialogDescription>
                Connected: <span className="font-mono bg-secondary/10 text-secondary px-2 py-1 rounded font-bold">{walletAddress}</span>
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-gray-100 p-1 rounded-xl">
                <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
                <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Transactions</TabsTrigger>
                <TabsTrigger value="claim" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Claim</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="rounded-2xl border-none shadow-sm bg-primary/5">
                    <CardContent className="p-6">
                      <div className="text-sm font-bold text-primary mb-1 uppercase tracking-wider">Your Balance</div>
                      <div className="text-3xl font-display font-bold">250,000 <span className="text-lg text-muted-foreground">PWIFE</span></div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-none shadow-sm bg-secondary/5">
                    <CardContent className="p-6">
                      <div className="text-sm font-bold text-secondary mb-1 uppercase tracking-wider">Claimable</div>
                      <div className="text-3xl font-display font-bold">0 <span className="text-lg text-muted-foreground">PWIFE</span></div>
                    </CardContent>
                  </Card>
                </div>
                <Card className="rounded-2xl border-black/5 shadow-sm">
                  <CardContent className="p-6 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Presale Status</div>
                      <div className="text-xl font-bold">Stage 1</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Raised</div>
                      <div className="text-xl font-bold text-primary">$1,247,500</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions">
                <Card className="rounded-2xl border-black/5 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-4 font-bold text-muted-foreground">Date</th>
                          <th className="px-6 py-4 font-bold text-muted-foreground">Amount</th>
                          <th className="px-6 py-4 font-bold text-muted-foreground">PWIFE</th>
                          <th className="px-6 py-4 font-bold text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr className="bg-white">
                          <td className="px-6 py-4 font-medium">Today, 14:30</td>
                          <td className="px-6 py-4">2.5 SOL</td>
                          <td className="px-6 py-4 font-bold text-primary">125,000</td>
                          <td className="px-6 py-4"><span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-md">Success</span></td>
                        </tr>
                        <tr className="bg-white">
                          <td className="px-6 py-4 font-medium">Yesterday</td>
                          <td className="px-6 py-4">2.5 SOL</td>
                          <td className="px-6 py-4 font-bold text-primary">125,000</td>
                          <td className="px-6 py-4"><span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-md">Success</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="claim">
                <Card className="rounded-2xl border-black/5 shadow-sm text-center py-12 px-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">🔒</span>
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-2">Claiming is Locked</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    You can claim your PWIFE tokens after the presale ends and the Token Generation Event (TGE) occurs.
                  </p>
                  <Button disabled className="h-12 px-8 rounded-xl font-bold bg-gray-200 text-gray-500">
                    Claim Tokens
                  </Button>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
