import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useLanguage, languages } from "@/i18n/context";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = languages.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-white/80 backdrop-blur border-2 border-[#1a1a2e]/20 rounded-xl px-2.5 h-9 font-display text-sm tracking-wide whitespace-nowrap hover:border-[#FF4D9D] transition-all"
        aria-label="Change language"
      >
        <Globe className="h-3.5 w-3.5 text-[#1a1a2e]/60" />
        <span className="text-base">{current.flag}</span>
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-44 meme-card bg-white rounded-xl p-2 space-y-1 z-50 shadow-[4px_4px_0px_#1a1a2e]">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-display text-sm tracking-wide transition-all ${
                lang === l.code
                  ? "bg-[#4CAF50]/10 text-[#4CAF50] border-2 border-[#4CAF50]"
                  : "text-[#1a1a2e] hover:bg-[#FFFDE7] border-2 border-transparent"
              }`}
            >
              <span className="text-lg">{l.flag}</span>
              <span>{l.label}</span>
              {lang === l.code && <span className="ms-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
