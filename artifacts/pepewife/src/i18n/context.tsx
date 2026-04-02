import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import en, { type Translations } from "./en";
import ar from "./ar";
import fr from "./fr";

export type Lang = "en" | "ar" | "fr";

const translations: Record<Lang, Translations> = { en, ar, fr };

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: en,
  dir: "ltr",
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pepewife-lang");
      if (saved && (saved === "en" || saved === "ar" || saved === "fr")) {
        return saved as Lang;
      }
    }
    return "en";
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("pepewife-lang", newLang);
  };

  const t = translations[lang];
  const dir = t.dir === "rtl" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [dir, lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export const languages: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];
