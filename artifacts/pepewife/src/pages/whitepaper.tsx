import { useLocation } from "wouter";
import { ArrowLeft, Twitter, Send } from "lucide-react";
import { useLanguage } from "@/i18n/context";
import LanguageSwitcher from "@/components/language-switcher";
import SEOHead from "@/components/seo-head";

const sectionImages: Record<number, { src: string; alt: string }> = {
  5: { src: "/wp-token-details.webp", alt: "Token Details" },
  6: { src: "/wp-tokenomics.webp", alt: "Tokenomics" },
  9: { src: "/wp-utility.webp", alt: "Token Utility" },
  11: { src: "/wp-roadmap.webp", alt: "Roadmap" },
  12: { src: "/wp-security.webp", alt: "Security" },
};

const sectionIcons: Record<number, string> = {
  0: "📌",
  1: "📖",
  2: "🎯",
  3: "⚡",
  4: "💎",
  5: "🪙",
  6: "📊",
  7: "🔐",
  8: "💧",
  9: "🛠️",
  10: "🏛️",
  11: "🗺️",
  12: "🛡️",
  13: "⚠️",
  14: "🏁",
};

const sectionColors: Record<number, string> = {
  0: "#4CAF50",
  1: "#FF4D9D",
  2: "#42A5F5",
  3: "#AB47BC",
  4: "#FFD54F",
  5: "#4CAF50",
  6: "#FF4D9D",
  7: "#42A5F5",
  8: "#AB47BC",
  9: "#4CAF50",
  10: "#FFD54F",
  11: "#FF4D9D",
  12: "#42A5F5",
  13: "#AB47BC",
  14: "#4CAF50",
};

export default function Whitepaper() {
  const [, navigate] = useLocation();
  const { t, dir } = useLanguage();
  const isRTL = dir === "rtl";

  const sections = [
    { title: t.whitepaper.s1Title, content: t.whitepaper.s1Text },
    { title: t.whitepaper.s2Title, content: t.whitepaper.s2Text },
    { title: t.whitepaper.s3Title, content: t.whitepaper.s3Text },
    { title: t.whitepaper.s4Title, content: t.whitepaper.s4Text },
    { title: t.whitepaper.s5Title, content: t.whitepaper.s5Text },
    { title: t.whitepaper.s6Title, content: t.whitepaper.s6Text },
    { title: t.whitepaper.s7Title, content: t.whitepaper.s7Text },
    { title: t.whitepaper.s8Title, content: t.whitepaper.s8Text },
    { title: t.whitepaper.s9Title, content: t.whitepaper.s9Text },
    { title: t.whitepaper.s10Title, content: t.whitepaper.s10Text },
    { title: t.whitepaper.s11Title, content: t.whitepaper.s11Text },
    { title: t.whitepaper.s12Title, content: t.whitepaper.s12Text },
    { title: t.whitepaper.s13Title, content: t.whitepaper.s13Text },
    { title: t.whitepaper.s14Title, content: t.whitepaper.s14Text },
    { title: t.whitepaper.s15Title, content: t.whitepaper.s15Text },
  ];

  return (
    <div className="min-h-screen font-sans">
      <SEOHead
        title="PEPEWIFE Whitepaper – Tokenomics, Roadmap & Vision"
        description="Read the official PEPEWIFE whitepaper. Learn about $PWIFE tokenomics, roadmap, security commitments, staking, Tap-to-Earn, and the Solana meme token vision."
        path="/whitepaper"
      />
      <nav className="fixed top-0 w-full z-50 border-b-4 border-[#1a1a2e]" style={{ background: "linear-gradient(90deg, #FFFDE7, #E8F5E9)" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer wiggle-hover shrink-0" onClick={() => navigate("/")}>
                <img src="/logo.webp" alt="PEPEWIFE" width="36" height="36" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#1a1a2e] shrink-0" />
                <span className="font-display text-xl sm:text-2xl text-[#1a1a2e] tracking-wide whitespace-nowrap" style={{ textShadow: isRTL ? "-2px 2px 0px #FFD54F" : "2px 2px 0px #FFD54F" }}>PEPEWIFE</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <button onClick={() => navigate("/")} className="btn-meme bg-[#4CAF50] text-white rounded-xl h-9 px-4 font-display text-sm tracking-wide flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> {t.nav.backToHome}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-16" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #311B92 50%, #1a1a2e 100%)" }}>
        <div className="relative overflow-hidden">
          <img
            src="/whitepaper-cover.webp"
            alt="PEPEWIFE Whitepaper cover – The Lady of Memes, Solana meme token documentation"
            className="w-full h-[300px] sm:h-[400px] md:h-[500px] object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1a1a2e]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="sticker bg-[#4CAF50] text-white mb-4 text-2xl inline-block" style={{ transform: "rotate(-2deg)" }}>📄</div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-display text-white tracking-wider mb-3" style={{ textShadow: "3px 3px 0px #FF4D9D, -1px -1px 0px #4CAF50" }}>
              {t.whitepaper.title}
            </h1>
            <p className="text-lg sm:text-xl text-white/70 font-bold max-w-2xl">{t.whitepaper.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="py-16 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #1a1a2e, #FFFDE7 15%, #E8F5E9 85%, #1a1a2e)" }}>
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, i) => (
            <div key={i}>
              {sectionImages[i] && (
                <div className="mb-6 rounded-2xl overflow-hidden border-4 border-[#1a1a2e] shadow-lg">
                  <img
                    src={sectionImages[i].src}
                    alt={`PEPEWIFE whitepaper – ${sectionImages[i].alt}`}
                    loading="lazy"
                    className="w-full h-[200px] sm:h-[280px] object-cover"
                  />
                </div>
              )}
              <div className="meme-card bg-white rounded-2xl p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: sectionColors[i] || "#4CAF50" }} />
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl shrink-0">{sectionIcons[i] || "📌"}</span>
                  <h2 className="font-display text-2xl sm:text-3xl text-[#1a1a2e] tracking-wider">{section.title}</h2>
                </div>
                <p className="text-[#1a1a2e]/70 font-bold leading-relaxed whitespace-pre-line text-base sm:text-lg">{section.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="py-10 px-4 border-t-4 border-[#1a1a2e]" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #311B92 100%)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-start">
            <div className="flex items-center gap-3">
              <img src="/logo.webp" alt="PEPEWIFE" width="48" height="48" className="w-12 h-12 rounded-full border-3 border-white/30" />
              <span className="font-display text-3xl text-white tracking-wider" style={{ textShadow: isRTL ? "-2px 2px 0px #FF4D9D" : "2px 2px 0px #FF4D9D" }}>PEPEWIFE</span>
            </div>
            <p className="text-white/40 text-sm font-bold">{t.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => navigate("/whitepaper")} className="text-[#FFD54F] font-display text-lg tracking-wide">{t.footer.whitepaper}</button>
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
