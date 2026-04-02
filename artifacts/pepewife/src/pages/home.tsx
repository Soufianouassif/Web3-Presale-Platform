import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X, Twitter, Send, Wallet, ArrowRight, Activity, PieChart as PieChartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { SiCoinmarketcap, SiBinance, SiSolana } from "react-icons/si";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 14, minutes: 0, seconds: 0 });

  // Mock data
  const walletAddress = "7xKp...4mNr";
  const tokenPrice = 50000; // PWIFE per 1 SOL
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

  return (
    <div className="min-h-screen font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo('hero')}>
              <span className="font-display font-bold text-2xl text-primary tracking-tight">PEPEWIFE</span>
              <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-xs font-bold">$PWIFE</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollTo('presale')} className="text-foreground hover:text-primary font-medium transition-colors">Presale</button>
              <button onClick={() => scrollTo('tokenomics')} className="text-foreground hover:text-primary font-medium transition-colors">Tokenomics</button>
              <button onClick={() => scrollTo('roadmap')} className="text-foreground hover:text-primary font-medium transition-colors">Roadmap</button>
              
              {isConnected ? (
                <Button variant="outline" onClick={() => setIsDashboardOpen(true)} className="border-primary text-primary hover:bg-primary/5" data-testid="button-dashboard">
                  <Wallet className="mr-2 h-4 w-4" />
                  {walletAddress}
                </Button>
              ) : (
                <Button onClick={handleConnect} className="bg-primary hover:bg-primary/90 text-white btn-primary-glow rounded-full px-6" data-testid="button-connect-wallet">
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

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b absolute w-full left-0 top-20 shadow-lg">
            <div className="px-4 pt-2 pb-6 space-y-4 flex flex-col">
              <button onClick={() => scrollTo('presale')} className="text-left py-2 font-medium">Presale</button>
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

      {/* Hero Section */}
      <section id="hero" className="pt-32 pb-20 lg:pt-40 lg:pb-28 px-4 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #b8e4ff 0%, #c9f0c0 60%, #e8f9e8 100%)" }}>

        {/* SVG cartoon background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {/* Ground strip */}
          <ellipse cx="50%" cy="102%" rx="70%" ry="18%" fill="#a8e6a3" opacity="0.5" />

          {/* Cloud 1 — large left */}
          <g opacity="0.9" style={{ animation: "cloudDrift1 40s linear infinite" }}>
            <ellipse cx="12%" cy="18%" rx="9%" ry="4.5%" fill="white" />
            <ellipse cx="17%" cy="16%" rx="7%" ry="5%" fill="white" />
            <ellipse cx="22%" cy="18%" rx="9%" ry="4.5%" fill="white" />
            <ellipse cx="17%" cy="20%" rx="11%" ry="3.5%" fill="white" />
          </g>

          {/* Cloud 2 — top center */}
          <g opacity="0.85" style={{ animation: "cloudDrift2 55s linear infinite" }}>
            <ellipse cx="50%" cy="10%" rx="7%" ry="4%" fill="white" />
            <ellipse cx="55%" cy="8%" rx="6%" ry="4.5%" fill="white" />
            <ellipse cx="60%" cy="10%" rx="7%" ry="4%" fill="white" />
            <ellipse cx="55%" cy="12%" rx="9%" ry="3%" fill="white" />
          </g>

          {/* Cloud 3 — right */}
          <g opacity="0.8" style={{ animation: "cloudDrift3 48s linear infinite" }}>
            <ellipse cx="82%" cy="22%" rx="8%" ry="4%" fill="white" />
            <ellipse cx="87%" cy="20%" rx="6%" ry="4.5%" fill="white" />
            <ellipse cx="92%" cy="22%" rx="7%" ry="4%" fill="white" />
            <ellipse cx="87%" cy="24.5%" rx="10%" ry="3%" fill="white" />
          </g>

          {/* Small cloud — bottom right faint */}
          <g opacity="0.45">
            <ellipse cx="74%" cy="82%" rx="6%" ry="3%" fill="white" />
            <ellipse cx="78%" cy="80%" rx="5%" ry="3.5%" fill="white" />
            <ellipse cx="83%" cy="82%" rx="6%" ry="3%" fill="white" />
            <ellipse cx="78%" cy="84.5%" rx="8%" ry="2.5%" fill="white" />
          </g>

          {/* Rocket icon — top right floating */}
          <text x="88%" y="15%" fontSize="2.8%" textAnchor="middle" opacity="0.45" style={{ animation: "floatIcon 7s ease-in-out infinite" }}>🚀</text>

          {/* Moon icon */}
          <text x="6%" y="30%" fontSize="2.4%" textAnchor="middle" opacity="0.4" style={{ animation: "floatIcon 9s ease-in-out infinite", animationDelay: "-3s" }}>🌙</text>

          {/* Diamond icon */}
          <text x="75%" y="70%" fontSize="2%" textAnchor="middle" opacity="0.3" style={{ animation: "floatIcon 8s ease-in-out infinite", animationDelay: "-5s" }}>💎</text>

          {/* Whale icon */}
          <text x="20%" y="78%" fontSize="2.2%" textAnchor="middle" opacity="0.3" style={{ animation: "floatIcon 11s ease-in-out infinite", animationDelay: "-2s" }}>🐋</text>

          {/* Star sparkles */}
          <circle cx="35%" cy="12%" r="0.4%" fill="#FFD54F" opacity="0.6" />
          <circle cx="65%" cy="20%" r="0.3%" fill="#FF4D9D" opacity="0.5" />
          <circle cx="90%" cy="40%" r="0.35%" fill="#4CAF50" opacity="0.4" />
          <circle cx="10%" cy="60%" r="0.3%" fill="#FFD54F" opacity="0.5" />
        </svg>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 relative z-10">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-block bg-secondary/15 text-secondary border border-secondary/30 rounded-full px-4 py-1.5 mb-6 font-semibold text-sm shadow-sm">
              🔥 The Lady of Memes is here
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-extrabold leading-tight mb-6" style={{ color: "#1a3a1a", textShadow: "0 2px 0 rgba(255,255,255,0.6)" }}>
              Be Early... Or <span style={{ color: "#4CAF50", WebkitTextStroke: "1px rgba(0,80,0,0.15)" }}>Cry Later</span>
            </h1>
            <p className="text-xl mb-8 max-w-2xl mx-auto lg:mx-0" style={{ color: "#2d4a2d" }}>
              PEPE built the meme. SHE builds the future. Join the most fashionable and fierce community on Solana.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button size="lg" onClick={() => scrollTo('presale')} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-full h-14 px-8 text-lg btn-primary-glow font-bold" data-testid="button-buy-hero">
                Buy PWIFE Now
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full h-14 px-8 text-lg border-2 bg-white/70 hover:bg-white font-semibold" data-testid="button-join-community">
                Join Community <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="relative w-full max-w-lg mx-auto aspect-square float-animation">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl" />
              <img src="/pepewife-hero.png" alt="Pepewife Hero" className="relative z-10 w-full h-full object-contain drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Presale Section */}
      <section id="presale" className="py-20 px-4 relative z-20">
        <div className="max-w-xl mx-auto">
          <Card className="border-2 border-white shadow-xl bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-secondary to-accent" />
            <CardHeader className="text-center pt-10">
              <CardTitle className="font-display text-3xl font-bold">Stage 1 Presale — Live Now</CardTitle>
              <CardDescription className="text-lg">Total Raised: <strong className="text-foreground">$1,247,500</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4 flex justify-between items-center text-center">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold font-display">{timeLeft.days}</span>
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Days</span>
                </div>
                <span className="text-2xl text-muted-foreground">:</span>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold font-display">{timeLeft.hours.toString().padStart(2, '0')}</span>
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Hours</span>
                </div>
                <span className="text-2xl text-muted-foreground">:</span>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold font-display">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Mins</span>
                </div>
                <span className="text-2xl text-muted-foreground">:</span>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold font-display text-secondary">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Secs</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>127,500,000 Sold</span>
                  <span>150,000,000 PWIFE</span>
                </div>
                <Progress value={presaleFilled} className="h-3" />
                <p className="text-xs text-center text-muted-foreground mt-1">1 SOL = 50,000 PWIFE</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Input type="number" placeholder="Amount in SOL" className="h-14 pl-4 pr-20 text-lg rounded-2xl bg-white border-2" data-testid="input-amount" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg font-bold">
                    <SiSolana className="text-[#14F195]" /> SOL
                  </div>
                </div>
                
                {isConnected ? (
                  <Button className="w-full h-14 text-lg rounded-2xl btn-primary-glow font-bold" data-testid="button-buy">
                    Buy PWIFE Now
                  </Button>
                ) : (
                  <Button onClick={handleConnect} className="w-full h-14 text-lg rounded-2xl bg-secondary hover:bg-secondary/90 text-white font-bold" data-testid="button-connect-presale">
                    Connect Wallet to Buy
                  </Button>
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground">Tokens will be distributed to your wallet at TGE (Token Generation Event).</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Partners Ticker */}
      <section className="py-10 border-y border-black/5 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 text-center mb-6">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">As Featured In & Partners</p>
        </div>
        <div className="ticker-wrap">
          <div className="ticker-content space-x-16 items-center">
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="flex space-x-16 items-center shrink-0">
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-400"><SiCoinmarketcap size={28}/> CoinMarketCap</div>
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-400">🦎 CoinGecko</div>
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-400"><SiSolana size={28} /> Solana</div>
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-400"><Activity size={28}/> Raydium</div>
                <div className="flex items-center gap-2 font-display font-bold text-xl text-gray-400"><SiBinance size={28}/> Binance News</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tokenomics */}
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
                  <Pie
                    data={tokenomicsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={140}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {tokenomicsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-6">
              {tokenomicsData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-black/5">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="flex-1 font-semibold text-lg">{item.name}</div>
                  <div className="font-display font-bold text-xl">{item.value}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-16">The Road to the Moon 🚀</h2>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-primary before:via-secondary before:to-muted">
            {[
              { phase: "Phase 1", title: "Foundation", desc: "Website launch, community building, presale kick-off", active: true },
              { phase: "Phase 2", title: "Growth", desc: "CEX listings, influencer partnerships, 10K holders", active: false },
              { phase: "Phase 3", title: "Launch", desc: "Token generation event, DEX listing on Raydium, CMC/CoinGecko listing", active: false },
              { phase: "Phase 4", title: "Expansion", desc: "Tier-1 CEX listing, NFT collection, PWIFE ecosystem", active: false }
            ].map((step, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-md z-10 ${step.active ? 'bg-primary' : 'bg-gray-300'}`}>
                  <div className={`w-3 h-3 rounded-full ${step.active ? 'bg-white' : 'bg-transparent'}`} />
                </div>
                <Card className={`w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] rounded-2xl transition-transform hover:-translate-y-1 ${step.active ? 'border-primary ring-1 ring-primary/20 shadow-lg' : 'border-black/5 shadow-sm'}`}>
                  <CardContent className="p-6">
                    <div className={`text-sm font-bold uppercase tracking-wider mb-2 ${step.active ? 'text-primary' : 'text-muted-foreground'}`}>{step.phase}</div>
                    <h3 className="text-xl font-display font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Feed */}
      <section className="py-24 px-4 bg-white/60">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-center mb-12">Latest Updates</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { text: "PEPEWIFE presale is live! 🎉 Stage 1 just launched. Get in early...", time: "2h ago", likes: "🔥 892" },
              { text: "We just hit 50% sold in 48 hours! The Lady of Memes is taking over 👑", time: "1d ago", likes: "💚 1,247" },
              { text: "Raydium listing confirmed for TGE. Your bags are safe. 😏", time: "2d ago", likes: "🚀 2,103" }
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
                  <p className="text-lg mb-6">{post.text}</p>
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

      {/* Risk Warning */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-yellow-800 mb-3 flex items-center gap-2">
              ⚠️ Risk Warning
            </h3>
            <p className="text-yellow-700 leading-relaxed">
              Cryptocurrency investments are highly volatile and carry significant risk. This is not financial advice. Always Do Your Own Research (DYOR). Only invest what you can afford to lose. Past performance is not indicative of future results. Meme coins are particularly risky.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="font-display font-bold text-2xl text-primary tracking-tight mb-2">PEPEWIFE</div>
            <p className="text-muted-foreground">The Lady Of Memes</p>
          </div>
          
          <div className="flex gap-6">
            <a href="#" className="text-muted-foreground hover:text-primary font-medium">Whitepaper</a>
            <a href="#roadmap" className="text-muted-foreground hover:text-primary font-medium">Roadmap</a>
            <a href="#" className="text-muted-foreground hover:text-primary font-medium">FAQ</a>
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
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          © 2025 PEPEWIFE. All rights reserved. Not financial advice.
        </div>
      </footer>

      {/* Dashboard Modal */}
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
                          <th className="px-6 py-4 font-bold text-muted-foreground">Amount SOL</th>
                          <th className="px-6 py-4 font-bold text-muted-foreground">PWIFE Received</th>
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
