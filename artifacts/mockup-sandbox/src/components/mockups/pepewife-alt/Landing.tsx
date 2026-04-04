import React, { useState, useEffect } from "react";
import { 
  Menu, X, Twitter, Send, Wallet, ChevronRight, Copy, CheckCircle2,
  Shield, Zap, Lock, Users, Rocket, Coins, ArrowRight,
  TrendingUp, Clock, DollarSign, Gift, Play, Globe
} from "lucide-react";

export function Landing() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("SOL");

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
    <div className="min-h-screen bg-[#FFFDF5] text-[#1B1F3B] font-sans selection:bg-[#FFE135] selection:text-[#1B1F3B] overflow-x-hidden relative">
      <style dangerouslySetContent={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Inter:wght@400;500;600;700;800;900&display=swap');
      `}} />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFDF5] border-b-4 border-[#1B1F3B] py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="text-3xl">🐸</span>
              <span className="font-['Bangers'] tracking-widest text-3xl text-[#1B1F3B] pt-1">PEPEWIFE</span>
            </div>
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8 font-bold">
                {['Presale', 'Why Buy', 'Tokenomics', 'Roadmap'].map((item) => (
                  <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-[#1B1F3B] hover:text-[#FF4D9D] transition-colors px-3 py-2 rounded-md text-lg">
                    {item}
                  </a>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button className="flex items-center gap-2 bg-[#FFE135] border-4 border-[#1B1F3B] shadow-[4px_4px_0px_#1B1F3B] hover:translate-y-1 hover:shadow-[0px_0px_0px_#1B1F3B] text-[#1B1F3B] px-6 py-2.5 rounded-xl font-bold transition-all text-lg">
                <Wallet className="w-5 h-5" strokeWidth={3} />
                Connect Wallet
              </button>
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-[#1B1F3B] p-2 border-2 border-[#1B1F3B] rounded-lg shadow-[2px_2px_0px_#1B1F3B] bg-white">
                {isMenuOpen ? <X className="w-6 h-6" strokeWidth={3} /> : <Menu className="w-6 h-6" strokeWidth={3} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#FFFDF5] border-b-4 border-[#1B1F3B] pb-4 px-4 shadow-xl absolute w-full">
            <div className="flex flex-col space-y-3 pt-2 font-bold">
              {['Presale', 'Why Buy', 'Tokenomics', 'Roadmap'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-[#1B1F3B] hover:text-[#FF4D9D] hover:bg-black/5 transition-colors block px-4 py-3 rounded-xl border-2 border-transparent hover:border-[#1B1F3B] text-lg">
                  {item}
                </a>
              ))}
              <div className="pt-4 flex flex-col gap-4 border-t-2 border-[#1B1F3B]/10">
                <button className="flex items-center justify-center gap-2 bg-[#FFE135] border-4 border-[#1B1F3B] shadow-[4px_4px_0px_#1B1F3B] active:translate-y-1 active:shadow-[0px_0px_0px_#1B1F3B] text-[#1B1F3B] px-6 py-4 rounded-xl font-bold transition-all text-lg">
                  <Wallet className="w-5 h-5" strokeWidth={3} />
                  Connect Wallet
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-28 pb-20">
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">

            {/* Left: Text */}
            <div className="flex-1 flex flex-col items-start text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D9D] border-4 border-[#1B1F3B] shadow-[4px_4px_0px_#1B1F3B] -rotate-2 mb-8 transform hover:rotate-0 transition-transform">
                <span className="text-white font-['Bangers'] text-xl tracking-widest pt-1">🔥 PRESALE LIVE — STAGE 1/4</span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl text-[#1B1F3B] leading-none mb-6 font-['Bangers'] tracking-wide drop-shadow-[4px_4px_0px_#FFE135]">
                PEPE FOUND LOVE.<br/>
                YOU FOUND THE<br/>
                PRE-SALE. LFG! 🚀
              </h1>

              <p className="text-xl md:text-2xl text-[#1B1F3B]/80 font-medium mb-10 leading-relaxed">
                Join the most scientifically unhinged presale on Solana. 100% memes, 100% vibes, 0% guarantees.
              </p>

              <div className="flex flex-col sm:flex-row gap-5">
                <button className="px-10 py-5 bg-[#FFE135] border-4 border-[#1B1F3B] shadow-[6px_6px_0px_#1B1F3B] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_#1B1F3B] text-[#1B1F3B] rounded-2xl font-['Bangers'] text-3xl tracking-widest transition-all flex items-center justify-center gap-3">
                  APE IN 🚀
                </button>
                <button className="px-10 py-5 bg-white border-4 border-[#1B1F3B] shadow-[6px_6px_0px_#1B1F3B] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_#1B1F3B] text-[#1B1F3B] rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-2">
                  Read Whitepaper
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mt-12 w-full">
                <div className="bg-white border-4 border-[#1B1F3B] shadow-[4px_4px_0px_#1B1F3B] rounded-2xl p-5 flex flex-col gap-1 rotate-1">
                  <span className="text-[#1B1F3B]/60 font-bold uppercase tracking-wider text-xs">Total Raised</span>
                  <span className="text-[#1B1F3B] text-3xl font-['Bangers'] tracking-wider">$0</span>
                </div>
                <div className="bg-white border-4 border-[#1B1F3B] shadow-[4px_4px_0px_#1B1F3B] rounded-2xl p-5 flex flex-col gap-1 -rotate-1">
                  <span className="text-[#1B1F3B]/60 font-bold uppercase tracking-wider text-xs">Tokens Sold</span>
                  <span className="text-[#1B1F3B] text-3xl font-['Bangers'] tracking-wider">0</span>
                </div>
                <div className="bg-[#22C55E] border-4 border-[#1B1F3B] shadow-[4px_4px_0px_#1B1F3B] rounded-2xl p-5 flex flex-col gap-1 rotate-1">
                  <span className="text-[#1B1F3B]/80 font-bold uppercase tracking-wider text-xs">Stage 1 Price</span>
                  <span className="text-[#1B1F3B] text-2xl font-['Bangers'] tracking-wider">$0.00000001</span>
                </div>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="flex-1 flex items-center justify-center relative">
              <div className="relative w-full max-w-md">
                <div className="absolute inset-0 bg-[#FFE135] border-4 border-[#1B1F3B] rounded-3xl rotate-3 shadow-[8px_8px_0px_#1B1F3B]"></div>
                <img
                  src={`${import.meta.env.BASE_URL}images/pepe-hero.png`}
                  alt="Pepe and Wife cartoon characters"
                  className="relative z-10 w-full rounded-3xl border-4 border-[#1B1F3B] shadow-[8px_8px_0px_#1B1F3B] object-cover"
                />
                {/* Floating coin badge */}
                <div className="absolute -top-6 -right-6 z-20">
                  <img
                    src={`${import.meta.env.BASE_URL}images/pwife-coin.png`}
                    alt="$PWIFE coin"
                    className="w-20 h-20 drop-shadow-xl animate-bounce"
                  />
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Partners Ticker */}
        <section className="border-y-4 border-[#1B1F3B] bg-white py-6 overflow-hidden flex relative mb-20 shadow-[0_4px_0px_#1B1F3B]">
          <div className="flex gap-20 items-center w-max animate-[marquee_20s_linear_infinite]">
            {[...Array(4)].map((_, i) => (
              <React.Fragment key={i}>
                <div className="flex items-center gap-3 text-[#1B1F3B]/50 font-['Bangers'] tracking-widest text-3xl"><TrendingUp className="w-8 h-8" strokeWidth={3}/> COINMARKETCAP</div>
                <div className="flex items-center gap-3 text-[#1B1F3B]/50 font-['Bangers'] tracking-widest text-3xl"><div className="w-8 h-8 bg-[#1B1F3B]/50 rounded-full"/> SOLANA</div>
                <div className="flex items-center gap-3 text-[#1B1F3B]/50 font-['Bangers'] tracking-widest text-3xl"><Coins className="w-8 h-8" strokeWidth={3}/> BINANCE</div>
                <div className="flex items-center gap-3 text-[#1B1F3B]/50 font-['Bangers'] tracking-widest text-3xl"><Globe className="w-8 h-8" strokeWidth={3}/> ORCAL</div>
                <div className="flex items-center gap-3 text-[#1B1F3B]/50 font-['Bangers'] tracking-widest text-3xl"><Zap className="w-8 h-8" strokeWidth={3}/> RAYDIUM</div>
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Presale Box Section */}
        <section id="presale" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-['Bangers'] tracking-widest text-[#1B1F3B] drop-shadow-[3px_3px_0px_#FF4D9D]">
              BUY $PWIFE BEFORE YOUR FRIENDS DO 😤
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Left Card: Countdown */}
            <div className="bg-white border-4 border-[#1B1F3B] shadow-[8px_8px_0px_#1B1F3B] rounded-3xl p-8 lg:p-10 -rotate-1">
              <h3 className="text-2xl font-bold mb-8 text-center uppercase tracking-wide">Next price increase in:</h3>
              <div className="flex justify-center gap-4 sm:gap-6 mb-10">
                {[
                  { label: 'Days', value: timeLeft.days },
                  { label: 'Hours', value: timeLeft.hours },
                  { label: 'Mins', value: timeLeft.minutes },
                  { label: 'Secs', value: timeLeft.seconds }
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#FFFDF5] border-4 border-[#1B1F3B] shadow-[4px_4px_0px_#1B1F3B] rounded-2xl flex items-center justify-center text-4xl sm:text-5xl font-['Bangers'] tracking-widest text-[#1B1F3B] mb-3">
                      {item.value.toString().padStart(2, '0')}
                    </div>
                    <span className="text-sm font-bold text-[#1B1F3B]/60 uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex justify-between font-bold mb-3">
                  <span className="uppercase">Stage 1 progress: 0%</span>
                  <span className="text-[#22C55E] uppercase">$0 / $500,000</span>
                </div>
                <div className="w-full h-8 bg-[#FFFDF5] rounded-full overflow-hidden border-4 border-[#1B1F3B] p-1">
                  <div className="h-full w-[5%] bg-[#22C55E] rounded-full border-2 border-[#1B1F3B] relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Buy Widget */}
            <div className="bg-white border-4 border-[#1B1F3B] shadow-[8px_8px_0px_#1B1F3B] rounded-3xl p-8 lg:p-10 rotate-1">
              {/* Tabs */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {['SOL', 'USDT'].map(currency => (
                  <button 
                    key={currency}
                    onClick={() => setActiveTab(currency)}
                    className={`py-4 text-xl font-bold rounded-xl border-4 transition-all ${
                      activeTab === currency 
                      ? 'bg-[#FFE135] border-[#1B1F3B] shadow-[4px_4px_0px_#1B1F3B]' 
                      : 'bg-[#FFFDF5] border-[#1B1F3B]/20 text-[#1B1F3B]/50 hover:border-[#1B1F3B]/50 hover:text-[#1B1F3B]'
                    }`}
                  >
                    {currency}
                  </button>
                ))}
              </div>

              {/* Input Fields */}
              <div className="space-y-6 mb-8">
                <div>
                  <div className="flex justify-between font-bold text-sm mb-2 uppercase">
                    <span>You Pay</span>
                    <span className="text-[#1B1F3B]/50">Balance: 0 {activeTab}</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0.0" 
                      className="w-full bg-[#FFFDF5] border-4 border-[#1B1F3B] rounded-2xl py-4 px-5 text-2xl font-bold placeholder:text-[#1B1F3B]/30 focus:outline-none focus:shadow-[4px_4px_0px_#FF4D9D] transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1B1F3B] bg-[#FFE135] border-2 border-[#1B1F3B] px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#FF4D9D] hover:text-white transition-colors shadow-[2px_2px_0px_#1B1F3B]">MAX</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center -my-2 relative z-10">
                  <div className="w-10 h-10 bg-white border-4 border-[#1B1F3B] rounded-full flex items-center justify-center shadow-[2px_2px_0px_#1B1F3B]">
                    <ArrowRight className="w-5 h-5 text-[#1B1F3B] rotate-90" strokeWidth={3} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-bold text-sm mb-2 uppercase">
                    <span>You Receive</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="0.0" 
                      readOnly
                      className="w-full bg-[#1B1F3B]/5 border-4 border-[#1B1F3B]/20 rounded-2xl py-4 px-5 text-2xl font-bold placeholder:text-[#1B1F3B]/50 outline-none"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="font-['Bangers'] tracking-widest text-2xl text-[#1B1F3B] pt-1">$PWIFE</span>
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full py-5 bg-[#FFE135] border-4 border-[#1B1F3B] text-[#1B1F3B] rounded-2xl font-['Bangers'] tracking-widest text-3xl shadow-[6px_6px_0px_#1B1F3B] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_#1B1F3B] transition-all flex items-center justify-center gap-3">
                <Wallet className="w-6 h-6" strokeWidth={3} /> APE IN 🚀
              </button>
            </div>
          </div>

          {/* Stage Prices */}
          <div className="mt-16 bg-white border-4 border-[#1B1F3B] shadow-[6px_6px_0px_#1B1F3B] rounded-3xl p-6 sm:p-8">
            <h4 className="text-center font-['Bangers'] text-2xl tracking-widest mb-6">PRICE PROGRESSION (LISTING: $0.061)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#22C55E] border-4 border-[#1B1F3B] shadow-[4px_4px_0px_#1B1F3B] rounded-2xl p-4 flex flex-col items-center gap-1 -rotate-1">
                <span className="font-bold uppercase text-[#1B1F3B]">Stage 1</span>
                <span className="font-['Bangers'] text-2xl tracking-wider text-[#1B1F3B]">$0.00000001</span>
              </div>
              <div className="bg-[#FFFDF5] border-4 border-[#1B1F3B]/20 rounded-2xl p-4 flex flex-col items-center gap-1 opacity-70">
                <span className="font-bold uppercase text-[#1B1F3B]/50">Stage 2</span>
                <span className="font-['Bangers'] text-2xl tracking-wider text-[#1B1F3B]/50">$0.00000002</span>
              </div>
              <div className="bg-[#FFFDF5] border-4 border-[#1B1F3B]/20 rounded-2xl p-4 flex flex-col items-center gap-1 opacity-70">
                <span className="font-bold uppercase text-[#1B1F3B]/50">Stage 3</span>
                <span className="font-['Bangers'] text-2xl tracking-wider text-[#1B1F3B]/50">$0.00000004</span>
              </div>
              <div className="bg-[#FFFDF5] border-4 border-[#1B1F3B]/20 rounded-2xl p-4 flex flex-col items-center gap-1 opacity-70">
                <span className="font-bold uppercase text-[#1B1F3B]/50">Stage 4</span>
                <span className="font-['Bangers'] text-2xl tracking-wider text-[#1B1F3B]/50">$0.00000006</span>
              </div>
            </div>
          </div>
        </section>

        {/* Why Buy Section */}
        <section id="why-buy" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-['Bangers'] tracking-widest text-[#1B1F3B] drop-shadow-[3px_3px_0px_#FFE135] mb-6">
              WHY APE INTO $PWIFE?
            </h2>
            <p className="text-xl text-[#1B1F3B]/70 font-medium max-w-2xl mx-auto">
              Because numbers go up, and we have the best stickers. Seriously though, look at these bulletproof fundamentals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border-4 border-[#1B1F3B] shadow-[8px_8px_0px_#1B1F3B] p-8 rounded-3xl -rotate-1 hover:rotate-0 transition-transform">
              <div className="w-16 h-16 bg-[#FFE135] border-4 border-[#1B1F3B] rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0px_#1B1F3B] text-3xl">
                💯
              </div>
              <h3 className="text-3xl font-['Bangers'] tracking-widest text-[#1B1F3B] mb-4">100 Trillion Supply</h3>
              <p className="text-lg text-[#1B1F3B]/80 font-medium leading-relaxed">
                Because we love big numbers and low prices. Why hold one token when you can hold billions?
              </p>
            </div>
            
            <div className="bg-white border-4 border-[#1B1F3B] shadow-[8px_8px_0px_#1B1F3B] p-8 rounded-3xl rotate-1 hover:rotate-0 transition-transform">
              <div className="w-16 h-16 bg-[#FF4D9D] border-4 border-[#1B1F3B] rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0px_#1B1F3B] text-3xl">
                🔒
              </div>
              <h3 className="text-3xl font-['Bangers'] tracking-widest text-[#1B1F3B] mb-4">Locked Liquidity</h3>
              <p className="text-lg text-[#1B1F3B]/80 font-medium leading-relaxed">
                We can't rug you even if we wanted to (we don't). Funds are SAFU.
              </p>
            </div>

            <div className="bg-white border-4 border-[#1B1F3B] shadow-[8px_8px_0px_#1B1F3B] p-8 rounded-3xl rotate-1 hover:rotate-0 transition-transform">
              <div className="w-16 h-16 bg-[#22C55E] border-4 border-[#1B1F3B] rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0px_#1B1F3B] text-3xl">
                🔥
              </div>
              <h3 className="text-3xl font-['Bangers'] tracking-widest text-[#1B1F3B] mb-4">Revoked Mint</h3>
              <p className="text-lg text-[#1B1F3B]/80 font-medium leading-relaxed">
                No printer go brrr. Supply is fixed forever. What you see is what you get.
              </p>
            </div>

            <div className="bg-white border-4 border-[#1B1F3B] shadow-[8px_8px_0px_#1B1F3B] p-8 rounded-3xl -rotate-1 hover:rotate-0 transition-transform">
              <div className="w-16 h-16 bg-[#00D4FF] border-4 border-[#1B1F3B] rounded-2xl flex items-center justify-center mb-6 shadow-[4px_4px_0px_#1B1F3B] text-3xl">
                🐸
              </div>
              <h3 className="text-3xl font-['Bangers'] tracking-widest text-[#1B1F3B] mb-4">Community First</h3>
              <p className="text-lg text-[#1B1F3B]/80 font-medium leading-relaxed">
                40% of tokens go to the people. That's you, fren. We're all gonna make it.
              </p>
            </div>
          </div>
        </section>

        {/* Tokenomics Section */}
        <section id="tokenomics" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t-4 border-dashed border-[#1B1F3B]/20">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-['Bangers'] tracking-widest text-[#1B1F3B] drop-shadow-[3px_3px_0px_#22C55E] mb-6">
              WHERE DO THE TOKENS GO? 📊
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Chart Mock */}
            <div className="relative aspect-square max-w-md mx-auto w-full flex items-center justify-center p-8">
              <div className="absolute inset-0 bg-[#FFE135] border-4 border-[#1B1F3B] rounded-full shadow-[12px_12px_0px_#1B1F3B] rotate-3"></div>
              <div className="w-[90%] h-[90%] rounded-full border-8 border-[#1B1F3B] relative overflow-hidden" style={{ background: 'conic-gradient(#22C55E 0% 40%, #FF4D9D 40% 60%, #FFE135 60% 75%, #00D4FF 75% 85%, #F97316 85% 95%, #EF4444 95% 100%)' }}>
                <div className="absolute inset-0 m-auto w-1/2 h-1/2 bg-[#FFFDF5] rounded-full border-8 border-[#1B1F3B] flex items-center justify-center">
                  <span className="font-['Bangers'] text-4xl text-[#1B1F3B] tracking-wider pt-2">100T</span>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-4 font-bold text-lg">
              <div className="flex items-center gap-4 bg-white border-4 border-[#1B1F3B] p-5 rounded-2xl shadow-[4px_4px_0px_#1B1F3B] hover:-translate-y-1 transition-transform">
                <span className="text-3xl">🟢</span>
                <span className="flex-1">Community</span>
                <span className="font-['Bangers'] text-3xl tracking-wider pt-1">40%</span>
              </div>
              <div className="flex items-center gap-4 bg-white border-4 border-[#1B1F3B] p-5 rounded-2xl shadow-[4px_4px_0px_#1B1F3B] hover:-translate-y-1 transition-transform">
                <span className="text-3xl">🟣</span>
                <span className="flex-1">Presale</span>
                <span className="font-['Bangers'] text-3xl tracking-wider pt-1">20%</span>
              </div>
              <div className="flex items-center gap-4 bg-white border-4 border-[#1B1F3B] p-5 rounded-2xl shadow-[4px_4px_0px_#1B1F3B] hover:-translate-y-1 transition-transform">
                <span className="text-3xl">🟡</span>
                <span className="flex-1">Liquidity</span>
                <span className="font-['Bangers'] text-3xl tracking-wider pt-1">15%</span>
              </div>
              <div className="flex items-center gap-4 bg-white border-4 border-[#1B1F3B] p-5 rounded-2xl shadow-[4px_4px_0px_#1B1F3B] hover:-translate-y-1 transition-transform">
                <span className="text-3xl">🔵</span>
                <span className="flex-1">Marketing</span>
                <span className="font-['Bangers'] text-3xl tracking-wider pt-1">10%</span>
              </div>
              <div className="flex items-center gap-4 bg-white border-4 border-[#1B1F3B] p-5 rounded-2xl shadow-[4px_4px_0px_#1B1F3B] hover:-translate-y-1 transition-transform">
                <span className="text-3xl">🟠</span>
                <span className="flex-1">Ecosystem</span>
                <span className="font-['Bangers'] text-3xl tracking-wider pt-1">10%</span>
              </div>
              <div className="flex items-center gap-4 bg-white border-4 border-[#1B1F3B] p-5 rounded-2xl shadow-[4px_4px_0px_#1B1F3B] hover:-translate-y-1 transition-transform">
                <span className="text-3xl">🔴</span>
                <span className="flex-1">Team</span>
                <span className="font-['Bangers'] text-3xl tracking-wider pt-1">5%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section id="roadmap" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16 flex flex-col items-center gap-4">
            <img
              src={`${import.meta.env.BASE_URL}images/pepe-rocket.png`}
              alt="Pepe on rocket"
              className="w-36 h-36 object-contain drop-shadow-xl"
            />
            <h2 className="text-5xl md:text-6xl font-['Bangers'] tracking-widest text-[#1B1F3B] drop-shadow-[3px_3px_0px_#00D4FF]">
              THE MASTER PLAN 🗺️
            </h2>
          </div>

          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[39px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-2 before:bg-[#1B1F3B]">
            
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-[#1B1F3B] bg-[#22C55E] shadow-[4px_4px_0px_#1B1F3B] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-3xl">
                ✅
              </div>
              <div className="w-[calc(100%-6rem)] md:w-[calc(50%-4rem)] bg-white border-4 border-[#1B1F3B] shadow-[6px_6px_0px_#1B1F3B] p-6 rounded-3xl rotate-1 group-hover:-rotate-1 transition-transform">
                <h3 className="font-['Bangers'] text-3xl tracking-widest text-[#1B1F3B] mb-2">Phase 1</h3>
                <p className="font-bold text-[#1B1F3B]/80 text-lg">Presale Launch, Community Building, Token Deployment</p>
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-[#1B1F3B] bg-[#FFE135] shadow-[4px_4px_0px_#1B1F3B] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-3xl">
                🔄
              </div>
              <div className="w-[calc(100%-6rem)] md:w-[calc(50%-4rem)] bg-white border-4 border-[#1B1F3B] shadow-[6px_6px_0px_#1B1F3B] p-6 rounded-3xl -rotate-1 group-hover:rotate-1 transition-transform">
                <h3 className="font-['Bangers'] text-3xl tracking-widest text-[#1B1F3B] mb-2">Phase 2</h3>
                <p className="font-bold text-[#1B1F3B]/80 text-lg">DEX Listing, CoinGecko/CMC Listing, Marketing Push</p>
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-[#1B1F3B] bg-white shadow-[4px_4px_0px_#1B1F3B] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-3xl">
                ⏳
              </div>
              <div className="w-[calc(100%-6rem)] md:w-[calc(50%-4rem)] bg-white border-4 border-[#1B1F3B] shadow-[6px_6px_0px_#1B1F3B] p-6 rounded-3xl rotate-1 group-hover:-rotate-1 transition-transform opacity-70">
                <h3 className="font-['Bangers'] text-3xl tracking-widest text-[#1B1F3B] mb-2">Phase 3</h3>
                <p className="font-bold text-[#1B1F3B]/80 text-lg">Tap-to-Earn Game Launch, Staking Rewards, Partnerships</p>
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-[#1B1F3B] bg-white shadow-[4px_4px_0px_#1B1F3B] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 text-3xl">
                🌙
              </div>
              <div className="w-[calc(100%-6rem)] md:w-[calc(50%-4rem)] bg-white border-4 border-[#1B1F3B] shadow-[6px_6px_0px_#1B1F3B] p-6 rounded-3xl -rotate-1 group-hover:rotate-1 transition-transform opacity-70">
                <h3 className="font-['Bangers'] text-3xl tracking-widest text-[#1B1F3B] mb-2">Phase 4</h3>
                <p className="font-bold text-[#1B1F3B]/80 text-lg">CEX Listing, Cross-chain Bridge, $PWIFE Ecosystem Expansion</p>
              </div>
            </div>

          </div>
        </section>

        {/* Referral */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="bg-[#FF4D9D] border-4 border-[#1B1F3B] shadow-[12px_12px_0px_#1B1F3B] rounded-[2rem] p-8 md:p-12 text-center rotate-1">
            <h2 className="text-4xl md:text-5xl font-['Bangers'] tracking-widest text-white drop-shadow-[3px_3px_0px_#1B1F3B] mb-6">
              TELL YOUR FRIENDS. GET RICH TOGETHER. 💰
            </h2>
            <p className="text-xl font-bold text-white mb-10">
              Earn 5% of every purchase made by anyone you refer. It's not a pyramid, it's a triangle of friendship 🔺
            </p>

            <div className="bg-[#FFFDF5] border-4 border-[#1B1F3B] rounded-2xl p-6 mb-10 -rotate-1">
              <div className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" 
                  value="Connect wallet to get your link" 
                  readOnly 
                  className="flex-1 bg-[#1B1F3B]/5 border-4 border-[#1B1F3B]/20 rounded-xl py-4 px-5 text-lg font-bold text-[#1B1F3B]/50 outline-none"
                />
                <button className="px-8 py-4 bg-[#FFE135] border-4 border-[#1B1F3B] text-[#1B1F3B] rounded-xl font-['Bangers'] tracking-widest text-2xl shadow-[4px_4px_0px_#1B1F3B] hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_#1B1F3B] transition-all whitespace-nowrap">
                  COPY LINK
                </button>
              </div>
            </div>

            <div className="bg-white border-4 border-[#1B1F3B] rounded-2xl overflow-hidden shadow-[4px_4px_0px_#1B1F3B]">
              <div className="bg-[#1B1F3B] text-white p-4 font-['Bangers'] tracking-widest text-2xl">
                TOP REFERRERS
              </div>
              <div className="divide-y-4 divide-[#1B1F3B]/10 font-bold">
                {[
                  { rank: 1, address: '8xK...9zP', reward: '5.2M' },
                  { rank: 2, address: '3mY...2wQ', reward: '4.1M' },
                  { rank: 3, address: '9aB...7cV', reward: '2.8M' },
                ].map((row) => (
                  <div key={row.rank} className="flex justify-between items-center p-4 hover:bg-[#FFFDF5]">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-[#FFE135] border-2 border-[#1B1F3B] flex items-center justify-center text-[#1B1F3B]">#{row.rank}</span>
                      <span className="text-[#1B1F3B]">{row.address}</span>
                    </div>
                    <span className="text-[#22C55E]">{row.reward} $PWIFE</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t-4 border-[#1B1F3B] bg-[#FFFDF5] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center text-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-5xl">🐸</span>
              <span className="font-['Bangers'] tracking-widest text-4xl text-[#1B1F3B] pt-2">PEPEWIFE</span>
              <p className="text-xl font-bold text-[#1B1F3B]/70 mt-2">The wife Pepe never knew he needed 💅</p>
            </div>
            
            <div className="flex gap-4 my-4">
              <a href="#" className="w-14 h-14 bg-white border-4 border-[#1B1F3B] rounded-full flex items-center justify-center shadow-[4px_4px_0px_#1B1F3B] hover:translate-y-1 hover:shadow-[0px_0px_0px_#1B1F3B] transition-all text-[#1B1F3B]">
                <Twitter className="w-6 h-6" strokeWidth={2.5} />
              </a>
              <a href="#" className="w-14 h-14 bg-[#00D4FF] border-4 border-[#1B1F3B] rounded-full flex items-center justify-center shadow-[4px_4px_0px_#1B1F3B] hover:translate-y-1 hover:shadow-[0px_0px_0px_#1B1F3B] transition-all text-[#1B1F3B]">
                <Send className="w-6 h-6" strokeWidth={2.5} />
              </a>
            </div>
            
            <div className="text-[#1B1F3B]/50 font-bold text-sm max-w-lg mt-8">
              <p className="mb-2">© 2025 PEPEWIFE. Not financial advice. Never financial advice.</p>
              <p>Cryptocurrency investments are highly volatile. Do your own research and only invest what you can afford to lose to a cartoon frog's spouse.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
