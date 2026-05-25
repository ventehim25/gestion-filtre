"use client";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";

export default function ParametresPage() {
  const { t, lang, setLang } = useLang();
  return (
    <div>
      <Header title="settings" />
      <div className="card p-6 max-w-md">
        <h3 className="font-semibold text-slate-700 mb-4">{t("language")}</h3>
        <div className="flex gap-3">
          <button onClick={() => setLang("fr")} className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${lang === "fr" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
            🇫🇷 Français
          </button>
          <button onClick={() => setLang("ar")} className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${lang === "ar" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
            🇲🇦 العربية
          </button>
        </div>
      </div>
    </div>
  );
}
