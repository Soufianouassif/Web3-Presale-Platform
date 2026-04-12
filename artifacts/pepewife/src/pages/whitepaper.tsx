import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Twitter, Send, Menu, X, ChevronRight } from "lucide-react";
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
  0: "📌", 1: "📖", 2: "🎯", 3: "⚡", 4: "💎",
  5: "🪙", 6: "📊", 7: "🔐", 8: "💧", 9: "🛠️",
  10: "🏛️", 11: "🗺️", 12: "🛡️", 13: "⚠️", 14: "🏁",
};

const sectionColors: Record<number, string> = {
  0: "#4CAF50", 1: "#FF4D9D", 2: "#4CAF50", 3: "#FF4D9D", 4: "#FFD54F",
  5: "#4CAF50", 6: "#FF4D9D", 7: "#4CAF50", 8: "#FF4D9D", 9: "#4CAF50",
  10: "#FFD54F", 11: "#FF4D9D", 12: "#4CAF50", 13: "#FF4D9D", 14: "#4CAF50",
};

export default function Whitepaper() {
  const [, navigate] = useLocation();
  const { t, dir } = useLanguage();
  const isRTL = dir === "rtl";
  const [activeIdx, setActiveIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

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

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const idx = parseInt(visible[0].target.getAttribute("data-idx") || "0", 10);
          setActiveIdx(idx);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.5] }
    );

    sectionRefs.current.forEach(el => {
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = useCallback((idx: number) => {
    const el = sectionRefs.current[idx];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setSidebarOpen(false);
  }, []);

  const SidebarContent = () => (
    <nav className="space-y-0.5">
      <div className="px-3 py-2 mb-2">
        <div className="flex items-center gap-2">
          <img src="/logo.webp" alt="PEPEWIFE" width="28" height="28" className="w-7 h-7 rounded-full border-2 border-[#1a1a2e]" />
          <span className="font-display text-sm text-[#1a1a2e]/50 tracking-widest uppercase">{t.footer.whitepaper.replace("📄 ", "")}</span>
        </div>
      </div>
      {sections.map((s, i) => (
        <button
          key={i}
          onClick={() => scrollTo(i)}
          className={`w-full text-start flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 group ${
            activeIdx === i
              ? "bg-white border-2 font-bold shadow-[2px_2px_0px_#1a1a2e]"
              : "hover:bg-white/60 border-2 border-transparent text-[#1a1a2e]/50 hover:text-[#1a1a2e]"
          }`}
          style={activeIdx === i ? { borderColor: sectionColors[i], color: sectionColors[i] } : {}}
        >
          <span className="text-base shrink-0">{sectionIcons[i]}</span>
          <span className="leading-tight line-clamp-2 font-display tracking-wide">{s.title}</span>
          {activeIdx === i && (
            <ChevronRight size={14} className="shrink-0 ms-auto" style={{ color: sectionColors[i] }} />
          )}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen font-sans" style={{ background: "linear-gradient(180deg, #FFFDE7 0%, #E8F5E9 50%, #FFF9C4 100%)" }}>
      <SEOHead
        title="PEPEWIFE Whitepaper – Tokenomics, Roadmap & Vision"
        description="Read the official PEPEWIFE whitepaper. Learn about $PWIFE tokenomics, roadmap, security commitments, staking, Tap-to-Earn, and the Solana meme token vision."
        path="/whitepaper"
      />

      {/* ── Top Nav ── */}
      <nav className="fixed top-0 w-full z-50 border-b-4 border-[#1a1a2e]" style={{ background: "linear-gradient(90deg, #FFFDE7, #E8F5E9)" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="lg:hidden btn-meme w-9 h-9 rounded-xl bg-[#1a1a2e]/5 border-[#1a1a2e]/20 flex items-center justify-center text-[#1a1a2e]"
              >
                {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer wiggle-hover shrink-0" onClick={() => navigate("/")}>
                <img src="/logo.webp" alt="PEPEWIFE" width="36" height="36" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-[#1a1a2e] shrink-0" />
                <span className="font-display text-xl sm:text-2xl text-[#1a1a2e] tracking-wide whitespace-nowrap" style={{ textShadow: isRTL ? "-2px 2px 0px #FFD54F" : "2px 2px 0px #FFD54F" }}>PEPEWIFE</span>
                <span className="hidden sm:inline-block bg-[#FF4D9D] text-white text-[10px] font-display px-2 py-0.5 rounded-full border-2 border-[#1a1a2e]">{t.footer.whitepaper.replace("📄 ", "")}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 bg-[#1a1a2e]/5 rounded-xl px-3 py-1.5 border-2 border-[#1a1a2e]/10">
                <span className="text-xs font-display text-[#1a1a2e]/40 tracking-wider">{activeIdx + 1}/{sections.length}</span>
                <span className="text-xs font-display text-[#1a1a2e]/70 tracking-wide truncate max-w-[140px]">{sectionIcons[activeIdx]} {sections[activeIdx]?.title}</span>
              </div>
              <LanguageSwitcher />
              <button onClick={() => navigate("/")} className="btn-meme bg-[#4CAF50] text-white rounded-xl h-9 px-4 font-display text-sm tracking-wide flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">{t.nav.backToHome}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Layout ── */}
      <div className="pt-14 sm:pt-16 flex min-h-screen">

        {/* ── Desktop Sidebar ── */}
        <aside
          className={`fixed top-14 sm:top-16 bottom-0 z-40 w-64 overflow-y-auto border-e-4 border-[#1a1a2e] p-3 transition-transform duration-300
            ${isRTL ? "right-0 border-e-0 border-s-4" : "left-0"}
            ${sidebarOpen ? "translate-x-0" : isRTL ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
          style={{ background: "linear-gradient(180deg, #FFFDE7 0%, #E8F5E9 100%)" }}
        >
          <SidebarContent />
        </aside>

        {/* ── Main Content ── */}
        <main className={`flex-1 min-w-0 ${isRTL ? "lg:me-64" : "lg:ms-64"}`}>

          {/* Hero Banner */}
          <div style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #1a1a2e 60%, #1a1a2e 100%)" }}>
            <div className="relative overflow-hidden">
              <img
                src="/whitepaper-cover.webp"
                alt="PEPEWIFE Whitepaper"
                className="w-full h-[200px] sm:h-[280px] object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1a1a2e]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <div className="sticker bg-[#4CAF50] text-white mb-3 text-xl inline-block" style={{ transform: "rotate(-2deg)" }}>📄</div>
                <h1 className="text-3xl sm:text-5xl font-display text-white tracking-wider mb-2" style={{ textShadow: "3px 3px 0px #FF4D9D, -1px -1px 0px #4CAF50" }}>
                  {t.whitepaper.title}
                </h1>
                <p className="text-base sm:text-lg text-white/70 font-bold max-w-xl">{t.whitepaper.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="py-10 px-4 sm:px-8 max-w-3xl mx-auto space-y-6">
            {sections.map((section, i) => (
              <div
                key={i}
                ref={el => { sectionRefs.current[i] = el; }}
                data-idx={i}
                id={`section-${i}`}
              >
                {sectionImages[i] && (
                  <div className="mb-5 rounded-2xl overflow-hidden border-4 border-[#1a1a2e] shadow-lg">
                    <img
                      src={sectionImages[i].src}
                      alt={`PEPEWIFE – ${sectionImages[i].alt}`}
                      loading="lazy"
                      className="w-full h-[180px] sm:h-[240px] object-cover"
                    />
                  </div>
                )}
                <div
                  className="meme-card bg-white rounded-2xl p-5 sm:p-7 relative overflow-hidden scroll-mt-20"
                  style={{ borderColor: activeIdx === i ? sectionColors[i] : undefined, boxShadow: activeIdx === i ? `4px 4px 0px ${sectionColors[i]}` : undefined }}
                >
                  <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: sectionColors[i] }} />
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl sm:text-3xl shrink-0">{sectionIcons[i]}</span>
                    <div>
                      <div className="text-[10px] font-display tracking-widest mb-0.5" style={{ color: sectionColors[i] }}>
                        {String(i + 1).padStart(2, "0")} / {String(sections.length).padStart(2, "0")}
                      </div>
                      <h2 className="font-display text-xl sm:text-2xl text-[#1a1a2e] tracking-wider leading-tight">{section.title}</h2>
                    </div>
                  </div>
                  <p className="text-[#1a1a2e]/70 font-bold leading-relaxed whitespace-pre-line text-sm sm:text-base">{section.content}</p>
                </div>
              </div>
            ))}

            {/* Prev / Next */}
            <div className="flex justify-between gap-4 pt-4">
              <button
                onClick={() => activeIdx > 0 && scrollTo(activeIdx - 1)}
                disabled={activeIdx === 0}
                className="btn-meme flex-1 py-3 rounded-xl font-display text-sm tracking-wide flex items-center justify-center gap-2 border-[#1a1a2e]/20 disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#FF4D9D] transition-colors"
                style={{ background: "#FFFDE7" }}
              >
                ← {activeIdx > 0 ? sections[activeIdx - 1]?.title?.slice(0, 25) + "…" : ""}
              </button>
              <button
                onClick={() => activeIdx < sections.length - 1 && scrollTo(activeIdx + 1)}
                disabled={activeIdx === sections.length - 1}
                className="btn-meme flex-1 py-3 rounded-xl font-display text-sm tracking-wide flex items-center justify-center gap-2 border-[#1a1a2e]/20 disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#4CAF50] transition-colors"
                style={{ background: "#E8F5E9" }}
              >
                {activeIdx < sections.length - 1 ? sections[activeIdx + 1]?.title?.slice(0, 25) + "…" : ""} →
              </button>
            </div>
          </div>

          {/* Footer */}
          <footer className="py-10 px-4 border-t-4 border-[#1a1a2e]" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #1a1a2e 100%)" }}>
            <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-start">
                <div className="flex items-center gap-3">
                  <img src="/logo.webp" alt="PEPEWIFE" width="48" height="48" className="w-10 h-10 rounded-full border-2 border-white/30" />
                  <span className="font-display text-2xl text-white tracking-wider" style={{ textShadow: isRTL ? "-2px 2px 0px #FF4D9D" : "2px 2px 0px #FF4D9D" }}>PEPEWIFE</span>
                </div>
                <p className="text-white/40 text-xs font-bold mt-1">{t.footer.tagline}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button onClick={() => navigate("/whitepaper")} className="text-[#FFD54F] font-display text-base tracking-wide">{t.footer.whitepaper}</button>
                <button onClick={() => navigate("/risk-disclaimer")} className="text-white/50 hover:text-[#FFD54F] font-display text-base tracking-wide transition-colors">{t.footer.riskDisclaimer}</button>
                <button onClick={() => navigate("/terms")} className="text-white/50 hover:text-[#FFD54F] font-display text-base tracking-wide transition-colors">{t.footer.terms}</button>
              </div>
              <div className="flex gap-3">
                <button className="btn-meme w-9 h-9 rounded-full bg-white/10 text-white/60 hover:text-[#4CAF50] hover:bg-white/20 flex items-center justify-center border-white/20"><Twitter className="h-4 w-4" /></button>
                <button className="btn-meme w-9 h-9 rounded-full bg-white/10 text-white/60 hover:text-[#4CAF50] hover:bg-white/20 flex items-center justify-center border-white/20"><Send className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="max-w-3xl mx-auto mt-6 pt-4 border-t border-white/10 text-center text-xs text-white/30 font-display tracking-wide">
              {t.footer.copyright}
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
