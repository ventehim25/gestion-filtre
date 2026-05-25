"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { Lang, translations, TranslationKey } from "@/lib/i18n";

type LangContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  isRtl: boolean;
};

const LangContext = createContext<LangContextType>({
  lang: "fr",
  setLang: () => {},
  t: (key) => key,
  isRtl: false,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("fr");
  const t = (key: TranslationKey) => translations[lang][key];
  return (
    <LangContext.Provider value={{ lang, setLang, t, isRtl: lang === "ar" }}>
      <div dir={lang === "ar" ? "rtl" : "ltr"}>{children}</div>
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
