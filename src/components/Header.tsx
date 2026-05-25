"use client";
import { useLang } from "@/context/LangContext";
import { TranslationKey } from "@/lib/i18n";

type Props = { title: TranslationKey; action?: React.ReactNode };

export default function Header({ title, action }: Props) {
  const { t, lang, setLang } = useLang();
  return (
    <header className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-slate-800">{t(title)}</h2>
      <div className="flex items-center gap-3">
        {action}
        <div className="flex border border-slate-300 rounded-lg overflow-hidden text-sm">
          <button
            onClick={() => setLang("fr")}
            className={`px-3 py-1.5 transition-colors ${lang === "fr" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            FR
          </button>
          <button
            onClick={() => setLang("ar")}
            className={`px-3 py-1.5 transition-colors ${lang === "ar" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            ع
          </button>
        </div>
      </div>
    </header>
  );
}
