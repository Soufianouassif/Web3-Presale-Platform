import React, { useState, useEffect } from "react";
import { 
  Menu, X, Globe, Wallet, ChevronRight, Copy, CheckCircle2,
  Shield, Zap, Lock, Users, Rocket, Coins, ArrowRight,
  TrendingUp, BarChart3, Clock, DollarSign, Gift, Play
} from "lucide-react";

export function Landing() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("SOL");

  // Mock countdown timer
  const [timeLeft, setTimeLeft] = useState({
    days: 14,
    hours: 23,
    minutes: 59,
    seconds: 59
  });

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

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#060B18] text-slate-300 font-sans selection:bg-[#00FF88] selection:text-black overflow-x-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#9B5DE5] rounded-full blur-[150px] opacity-20 animate-pulse"></div>
        <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-[#00FF88] rounded-full blur-[150px] opacity-10"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-[#00D4FF] rounded-full blur-[150px] opacity-10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMSIvPjwvc3ZnPg==')] opacity-50 mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0F1E]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF88] to-[#00D4FF] flex items-center justify-center p-0.5">
                <div className="w-full h-full bg-[#060B18] rounded-full flex items-center justify-center">
                  <span className="text-[#00FF88] font-bold text-xl">P</span>
                </div>
              </div>
              <span className="text-white font-bold text-xl tracking-wider">PEPEWIFE<span className="text-[#00FF88]">.</span></span>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                {['Presale', 'Why Buy', 'Tokenomics', 'Roadmap', 'About'].map((item) => (
                  <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-slate-300 hover:text-[#00FF88] transition-colors px-3 py-2 rounded-md text-sm font-medium">
                    {item}
                  </a>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                <Globe className="w-4 h-4" />
                <span className="text-sm">EN</span>
              </button>
              <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-2.5 rounded-full font-medium transition-all hover:border-[#00FF88]/50 hover:shadow-[0_0_15px_rgba(0,255,136,0.2)]">
                <Wallet className="w-4 h-4 text-[#00FF88]" />
                Connect Wallet
              </button>
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-300 hover:text-white p-2">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#0A0F1E] border-b border-white/5 pb-4 px-4">
            <div className="flex flex-col space-y-3 pt-2">
              {['Presale', 'Why Buy', 'Tokenomics', 'Roadmap', 'About'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-slate-300 hover:text-[#00FF88] transition-colors block px-3 py-2 rounded-md text-base font-medium">
                  {item}
                </a>
              ))}
              <div className="pt-4 flex flex-col gap-4 border-t border-white/5">
                <button className="flex items-center justify-center gap-2 text-slate-300">
                  <Globe className="w-4 h-4" />
                  <span>Language: EN</span>
                </button>
                <button className="flex items-center justify-center gap-2 bg-[#00FF88] text-black px-5 py-3 rounded-full font-bold">
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-32 pb-20">
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Hero Text */}
            <div className="flex flex-col gap-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9B5DE5]/10 border border-[#9B5DE5]/30 w-fit mx-auto lg:mx-0">
                <span className="w-2 h-2 rounded-full bg-[#9B5DE5] animate-pulse"></span>
                <span className="text-[#9B5DE5] text-xs font-bold tracking-widest uppercase">Stage 1 Presale Live</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight">
                Be Early... <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] to-[#00D4FF]">Or Cry Later</span> 😭
              </h1>
              
              <p className="text-lg lg:text-xl text-slate-400 max-w-xl mx-auto lg:mx-0">
                The queen of memes has arrived on Solana. PEPEWIFE isn't just another token; it's a movement. Secure your bag before the ecosystem explodes.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-4">
                <button className="group relative px-8 py-4 bg-[#00FF88] text-black rounded-full font-bold text-lg overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(0,255,136,0.4)]">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    APE IN NOW <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 h-full w-full scale-0 rounded-full transition-all duration-300 group-hover:scale-100 group-hover:bg-white/20 z-0"></div>
                </button>
                <button className="px-8 py-4 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 text-white rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2">
                  Join The Fam <Users className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Raised</span>
                  <span className="text-white text-2xl font-bold">$0</span>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                  <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Tokens Sold</span>
                  <span className="text-white text-2xl font-bold">0</span>
                </div>
                <div className="bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-2xl p-4 flex flex-col gap-1 sm:col-span-1 col-span-2">
                  <span className="text-[#00FF88] text-xs font-medium uppercase tracking-wider">Stage 1 Price</span>
                  <span className="text-white text-2xl font-bold">$0.00000001</span>
                </div>
              </div>
            </div>

            {/* Presale Box */}
            <div className="relative mx-auto w-full max-w-md" id="presale">
              <div className="absolute -inset-1 bg-gradient-to-b from-[#00FF88] to-[#9B5DE5] rounded-[2rem] blur opacity-20 animate-pulse"></div>
              <div className="relative bg-[#0A0F1E]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl">
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">Buy $PWIFE</h3>
                  <p className="text-sm text-slate-400">Next price increase in:</p>
                  
                  {/* Countdown */}
                  <div className="flex justify-center gap-3 mt-4">
                    {[
                      { label: 'Days', value: timeLeft.days },
                      { label: 'Hours', value: timeLeft.hours },
                      { label: 'Mins', value: timeLeft.minutes },
                      { label: 'Secs', value: timeLeft.seconds }
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-inner mb-1">
                          {item.value.toString().padStart(2, '0')}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-slate-400">Raised: $0</span>
                    <span className="text-[#00FF88]">Goal: $500,000</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full w-[5%] bg-gradient-to-r from-[#00FF88] to-[#00D4FF] rounded-full relative">
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-3 gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/5">
                  {['SOL', 'USDT', 'ETH'].map(currency => (
                    <button 
                      key={currency}
                      onClick={() => setActiveTab(currency)}
                      className={`py-2 text-sm font-medium rounded-lg transition-all ${activeTab === currency ? 'bg-[#00FF88] text-black shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      {currency}
                    </button>
                  ))}
                </div>

                {/* Input Fields */}
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 px-1">
                      <span className="text-slate-400">You Pay</span>
                      <span className="text-slate-400">Balance: 0 {activeTab}</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="0.0" 
                        className="w-full bg-[#060B18] border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00FF88]/50 focus:ring-1 focus:ring-[#00FF88]/50 transition-all font-mono"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-xs font-bold text-[#00FF88] bg-[#00FF88]/10 px-2 py-1 rounded-md cursor-pointer hover:bg-[#00FF88]/20 transition-colors">MAX</span>
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">💰</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center -my-2 relative z-10">
                    <div className="w-8 h-8 bg-[#0A0F1E] border border-white/10 rounded-full flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-slate-400 rotate-90" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5 px-1">
                      <span className="text-slate-400">You Receive</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="0.0" 
                        readOnly
                        className="w-full bg-[#060B18] border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-slate-600 opacity-70 font-mono"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="font-bold text-white text-sm">$PWIFE</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 bg-gradient-to-r from-[#00FF88] to-[#00D4FF] text-black rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(0,255,136,0.3)] flex items-center justify-center gap-2">
                  <Wallet className="w-5 h-5" /> Connect Wallet to Buy
                </button>

                {/* Stage Prices */}
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="text-xs text-center text-slate-500 mb-3 font-medium uppercase tracking-wider">Price Stages</p>
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                    <div className="bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-lg p-2 flex flex-col gap-1">
                      <span className="text-[#00FF88] font-bold">Stage 1</span>
                      <span className="text-white">$0.00000001</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-lg p-2 flex flex-col gap-1 opacity-50">
                      <span className="text-slate-400">Stage 2</span>
                      <span className="text-slate-300">$0.00000002</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-lg p-2 flex flex-col gap-1 opacity-50">
                      <span className="text-slate-400">Stage 3</span>
                      <span className="text-slate-300">$0.00000003</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-lg p-2 flex flex-col gap-1 opacity-50">
                      <span className="text-slate-400">Stage 4</span>
                      <span className="text-slate-300">$0.00000004</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Partners Ticker */}
        <section className="border-y border-white/5 bg-white/[0.02] py-6 overflow-hidden flex relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#060B18] to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#060B18] to-transparent z-10 pointer-events-none"></div>
          
          <div className="flex gap-16 items-center w-max animate-[marquee_20s_linear_infinite]">
            {[...Array(3)].map((_, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xl opacity-50 hover:opacity-100 transition-opacity"><TrendingUp className="w-6 h-6"/> CoinMarketCap</div>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xl opacity-50 hover:opacity-100 transition-opacity"><div className="w-6 h-6 bg-slate-500 rounded-full"/> Solana</div>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xl opacity-50 hover:opacity-100 transition-opacity"><Coins className="w-6 h-6"/> Binance</div>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xl opacity-50 hover:opacity-100 transition-opacity"><Globe className="w-6 h-6"/> Orcal</div>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xl opacity-50 hover:opacity-100 transition-opacity"><Zap className="w-6 h-6"/> Raydium</div>
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Why Buy Section */}
        <section id="why-buy" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why Buy <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] to-[#00D4FF]">$PWIFE</span>?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Built on Solana for lightning-fast transactions and zero BS. The most secure and hyped meme token of this cycle.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Coins className="w-8 h-8 text-[#00FF88]" />, title: "100 Trillion Supply", desc: "Massive supply to ensure everyone can hold millions of tokens. Get your bag.", color: "group-hover:border-[#00FF88]/50 group-hover:shadow-[0_0_30px_rgba(0,255,136,0.1)]" },
              { icon: <Lock className="w-8 h-8 text-[#9B5DE5]" />, title: "Locked Liquidity", desc: "LP tokens will be burned or locked at launch. Rug-proof by design.", color: "group-hover:border-[#9B5DE5]/50 group-hover:shadow-[0_0_30px_rgba(155,93,229,0.1)]" },
              { icon: <Shield className="w-8 h-8 text-[#00D4FF]" />, title: "Revoked Mint", desc: "Mint authority is revoked. No new tokens can ever be created. Absolute scarcity.", color: "group-hover:border-[#00D4FF]/50 group-hover:shadow-[0_0_30px_rgba(0,212,255,0.1)]" },
              { icon: <Users className="w-8 h-8 text-[#FF3366]" />, title: "Community First", desc: "No VC dumps. 40% allocated straight to the community. Power to the players.", color: "group-hover:border-[#FF3366]/50 group-hover:shadow-[0_0_30px_rgba(255,51,102,0.1)]" }
            ].map((feature, i) => (
              <div key={i} className={`group bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl transition-all duration-300 ${feature.color}`}>
                <div className="w-16 h-16 bg-[#060B18] rounded-2xl border border-white/5 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tokenomics Section */}
        <section id="tokenomics" className="relative py-24 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Tokenomics</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Transparent and fair distribution. Built for long-term sustainability.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Chart Placeholder */}
              <div className="relative aspect-square max-w-md mx-auto w-full flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[40px] border-[#0A0F1E] shadow-[0_0_50px_rgba(0,255,136,0.1)]"></div>
                {/* SVG Donut Mock */}
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 drop-shadow-2xl">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#00FF88" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="0" className="opacity-90"></circle>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#9B5DE5" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="100.48" className="opacity-90"></circle>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#00D4FF" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="150.72" className="opacity-90"></circle>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#FF3366" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="188.4" className="opacity-90"></circle>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#FFD700" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="213.52" className="opacity-90"></circle>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#FFFFFF" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="238.64" className="opacity-90"></circle>
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm text-slate-400 font-medium uppercase tracking-widest">Total Supply</span>
                  <span className="text-3xl font-bold text-white">100T</span>
                </div>
              </div>

              {/* Breakdown List */}
              <div className="flex flex-col gap-4">
                {[
                  { label: "Community Rewards", percent: "40%", color: "bg-[#00FF88]", desc: "Airdrops, staking, and community incentives" },
                  { label: "Presale", percent: "20%", color: "bg-[#9B5DE5]", desc: "Initial token offering for early supporters" },
                  { label: "Liquidity", percent: "15%", color: "bg-[#00D4FF]", desc: "DEX & CEX liquidity provision" },
                  { label: "Marketing", percent: "10%", color: "bg-[#FF3366]", desc: "Partnerships, influencers, and campaigns" },
                  { label: "Ecosystem", percent: "10%", color: "bg-[#FFD700]", desc: "Future development and DApps" },
                  { label: "Team", percent: "5%", color: "bg-[#FFFFFF]", desc: "Locked for 12 months, linear vesting" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                    <div className={`w-3 h-12 rounded-full ${item.color}`}></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white text-lg">{item.label}</span>
                        <span className="font-mono font-bold text-xl">{item.percent}</span>
                      </div>
                      <p className="text-sm text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section id="roadmap" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">The Master Plan</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">We're not just here to take part, we're here to take over.</p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#00FF88] via-[#9B5DE5] to-[#060B18] -translate-x-1/2"></div>

            <div className="space-y-12">
              {[
                { phase: "Phase 1", title: "The Genesis", status: "active", items: ["Smart Contract Deployment", "Website Launch", "Presale Kickoff", "Community Building", "Marketing Campaign V1"] },
                { phase: "Phase 2", title: "The Expansion", status: "upcoming", items: ["DEX Launch on Raydium", "CoinMarketCap Listing", "CoinGecko Listing", "10,000+ Holders", "CEX Listings Tier 2"] },
                { phase: "Phase 3", title: "The Utility", status: "upcoming", items: ["Tap-to-Earn Game Beta", "Staking Platform Launch", "NFT Collection Drop", "Tier 1 CEX Listings", "Major Partnerships"] },
                { phase: "Phase 4", title: "The Ecosystem", status: "upcoming", items: ["PEPEWIFE Swap", "Ecosystem Expansion", "Real-world Events", "Merch Store", "100M+ Market Cap Goal"] }
              ].map((phase, i) => (
                <div key={i} className={`relative flex flex-col md:flex-row gap-8 md:justify-between items-start md:items-center ${i % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                  
                  {/* Timeline node */}
                  <div className="absolute left-0 md:left-1/2 w-14 h-14 rounded-full bg-[#060B18] border-2 border-[#00FF88] shadow-[0_0_15px_rgba(0,255,136,0.5)] flex items-center justify-center -translate-x-1/2 z-10">
                    {phase.status === 'active' ? <div className="w-4 h-4 bg-[#00FF88] rounded-full animate-pulse"></div> : <div className="w-4 h-4 bg-white/20 rounded-full"></div>}
                  </div>

                  <div className="ml-16 md:ml-0 md:w-[45%] bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl hover:border-white/20 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${phase.status === 'active' ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30' : 'bg-white/10 text-slate-400 border border-white/10'}`}>
                        {phase.phase}
                      </span>
                      <h3 className="text-2xl font-bold text-white">{phase.title}</h3>
                    </div>
                    <ul className="space-y-3">
                      {phase.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-slate-300">
                          <CheckCircle2 className={`w-5 h-5 shrink-0 ${phase.status === 'active' ? 'text-[#00FF88]' : 'text-slate-600'}`} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Referral Section */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="bg-gradient-to-br from-[#1A1025] to-[#0A1A1E] border border-white/10 rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#9B5DE5] rounded-full blur-[120px] opacity-20"></div>
            
            <div className="relative z-10 text-center mb-10">
              <div className="w-16 h-16 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Gift className="w-8 h-8 text-[#00FF88]" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Shill & Earn <span className="text-[#00FF88]">5%</span> Instantly</h2>
              <p className="text-slate-400 max-w-xl mx-auto">Generate your unique referral link. When someone buys $PWIFE through your link, you instantly receive 5% of their purchase in SOL directly to your wallet.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto mb-16">
              <input 
                type="text" 
                readOnly 
                value="Connect wallet to generate link" 
                className="flex-1 bg-[#060B18] border border-white/10 rounded-xl py-4 px-6 text-slate-500 font-mono text-center md:text-left focus:outline-none"
              />
              <button className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl py-4 px-8 font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap opacity-50 cursor-not-allowed">
                <Copy className="w-5 h-5" /> Copy Link
              </button>
            </div>

            {/* Leaderboard */}
            <div className="bg-[#060B18]/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm max-w-3xl mx-auto">
              <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#9B5DE5]" /> Top Shillers
                </h3>
              </div>
              <div className="p-0">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500 bg-white/[0.02] border-b border-white/5">
                    <tr>
                      <th className="px-6 py-4 font-medium">Rank</th>
                      <th className="px-6 py-4 font-medium">Wallet</th>
                      <th className="px-6 py-4 font-medium text-right">Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { rank: 1, wallet: "8x9T...3qWa", earned: "45.2 SOL", color: "text-[#FFD700]" },
                      { rank: 2, wallet: "4mZP...9kLs", earned: "32.8 SOL", color: "text-slate-300" },
                      { rank: 3, wallet: "G7bN...1yXr", earned: "18.5 SOL", color: "text-[#CD7F32]" },
                      { rank: 4, wallet: "9vCw...5hQm", earned: "12.1 SOL", color: "text-slate-500" },
                      { rank: 5, wallet: "2pLk...8jRt", earned: "8.4 SOL", color: "text-slate-500" }
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className={`px-6 py-4 font-bold ${row.color}`}>#{row.rank}</td>
                        <td className="px-6 py-4 text-slate-300 font-mono">{row.wallet}</td>
                        <td className="px-6 py-4 text-[#00FF88] font-mono text-right font-medium">{row.earned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-[#0A0F1E] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00FF88] to-[#00D4FF] flex items-center justify-center p-0.5">
                  <div className="w-full h-full bg-[#060B18] rounded-full flex items-center justify-center">
                    <span className="text-[#00FF88] font-bold">P</span>
                  </div>
                </div>
                <span className="text-white font-bold text-xl tracking-wider">PEPEWIFE<span className="text-[#00FF88]">.</span></span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                The most advanced meme token ecosystem on Solana. Don't fade the wife. Join the presale, earn rewards, and be part of the revolution.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Quick Links</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li><a href="#presale" className="hover:text-[#00FF88] transition-colors">Buy Presale</a></li>
                <li><a href="#tokenomics" className="hover:text-[#00FF88] transition-colors">Tokenomics</a></li>
                <li><a href="#roadmap" className="hover:text-[#00FF88] transition-colors">Roadmap</a></li>
                <li><a href="#" className="hover:text-[#00FF88] transition-colors">Whitepaper</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 uppercase tracking-wider text-sm">Community</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[#00FF88] hover:border-[#00FF88]/50 hover:bg-[#00FF88]/10 transition-all">
                  <span className="font-bold text-lg">X</span>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[#00D4FF] hover:border-[#00D4FF]/50 hover:bg-[#00D4FF]/10 transition-all">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </a>
              </div>
            </div>
            
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} PEPEWIFE. All rights reserved.</p>
            <p>Cryptocurrency investments carry a high degree of risk. Do your own research.</p>
          </div>
        </div>
      </footer>

      {/* Global Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 2rem)); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
