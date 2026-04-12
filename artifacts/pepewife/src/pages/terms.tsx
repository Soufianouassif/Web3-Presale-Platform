import { useLocation } from "wouter";
import { ArrowLeft, Twitter, Send } from "lucide-react";
import { useLanguage } from "@/i18n/context";
import LanguageSwitcher from "@/components/language-switcher";
import SEOHead from "@/components/seo-head";

export default function Terms() {
  const [, navigate] = useLocation();
  const { t, dir } = useLanguage();
  const isRTL = dir === "rtl";

  return (
    <div className="min-h-screen font-sans">
      <SEOHead
        title="PEPEWIFE – Privacy Policy"
        description="PEPEWIFE privacy policy. Learn how we handle your data, what information we collect, and your rights regarding your personal information."
        path="/terms"
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

      <div className="pt-24 pb-20 px-4 pattern-dots" style={{ background: "linear-gradient(180deg, #FFFDE7, #FFFDE7)" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="sticker bg-[#4CAF50] text-white mb-4 text-lg inline-block" style={{ transform: "rotate(-1deg)" }}>📋</div>
            <h1 className="text-5xl md:text-6xl font-display text-[#1a1a2e] comic-shadow tracking-wider mb-3">{t.termsPage.title}</h1>
            <p className="text-lg text-[#1a1a2e]/60 font-bold">{t.termsPage.subtitle}</p>
          </div>

          <div className="space-y-6">
            {[
              { title: t.termsPage.s1Title, content: t.termsPage.s1Text },
              { title: t.termsPage.s2Title, content: t.termsPage.s2Text },
              { title: t.termsPage.s3Title, content: t.termsPage.s3Text },
              { title: t.termsPage.s4Title, content: t.termsPage.s4Text },
              { title: t.termsPage.s5Title, content: t.termsPage.s5Text },
              { title: t.termsPage.s6Title, content: t.termsPage.s6Text },
            ].map((section, i) => (
              <div key={i} className="meme-card bg-white rounded-2xl p-6">
                <h2 className="font-display text-2xl text-[#1a1a2e] tracking-wider mb-3">{section.title}</h2>
                <p className="text-[#1a1a2e]/70 font-bold leading-relaxed whitespace-pre-line">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="py-10 px-4 border-t-4 border-[#1a1a2e]" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #1a1a2e 100%)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-start">
            <div className="flex items-center gap-3">
              <img src="/logo.webp" alt="PEPEWIFE" width="48" height="48" className="w-12 h-12 rounded-full border-3 border-white/30" />
              <span className="font-display text-3xl text-white tracking-wider" style={{ textShadow: isRTL ? "-2px 2px 0px #FF4D9D" : "2px 2px 0px #FF4D9D" }}>PEPEWIFE</span>
            </div>
            <p className="text-white/40 text-sm font-bold">{t.footer.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={() => navigate("/whitepaper")} className="text-white/50 hover:text-[#FFD54F] font-display text-lg tracking-wide transition-colors">{t.footer.whitepaper}</button>
            <button onClick={() => navigate("/risk-disclaimer")} className="text-white/50 hover:text-[#FFD54F] font-display text-lg tracking-wide transition-colors">{t.footer.riskDisclaimer}</button>
            <button onClick={() => navigate("/terms")} className="text-[#FFD54F] font-display text-lg tracking-wide">{t.footer.terms}</button>
          </div>
          <div className="flex gap-3">
            <button className="btn-meme w-10 h-10 rounded-full bg-white/10 text-white/60 hover:text-[#4CAF50] hover:bg-white/20 flex items-center justify-center border-white/20"><Twitter className="h-4 w-4" /></button>
            <button className="btn-meme w-10 h-10 rounded-full bg-white/10 text-white/60 hover:text-[#4CAF50] hover:bg-white/20 flex items-center justify-center border-white/20"><Send className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-5 border-t border-white/10 text-center text-sm text-white/30 font-display tracking-wide">
          {t.footer.copyright}
        </div>
      </footer>
    </div>
  );
}
