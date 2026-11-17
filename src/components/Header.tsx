"use client";
import { useLang } from "@/context/LangContext";
import { TranslationKey } from "@/lib/i18n";
import { useTypeVehicule } from "@/lib/typeVehicule";
import { Car, Truck } from "lucide-react";

type Props = { title: TranslationKey; action?: React.ReactNode };

export default function Header({ title, action }: Props) {
  const { t, lang, setLang } = useLang();
  // Mode de toute l'appli : 🚗 voitures ou 🚛 camions (BIBLE §8.37)
  const [typeV, setTypeV] = useTypeVehicule();
  return (
    <header className="flex items-center justify-between mb-6 gap-2 flex-wrap">
      <h2 className="text-xl font-semibold text-slate-800">{t(title)}</h2>
      <div className="flex items-center gap-3">
        {action}
        <div className="flex border border-slate-300 rounded-lg overflow-hidden text-sm" role="group" aria-label="Voitures ou camions">
          <button onClick={() => setTypeV("voiture")} title={t("vehCar")} aria-pressed={typeV === "voiture"}
            className={`px-2.5 py-1.5 transition-colors ${typeV === "voiture" ? "bg-red-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
            <Car size={16} />
          </button>
          <button onClick={() => setTypeV("camion")} title={t("vehTruck")} aria-pressed={typeV === "camion"}
            className={`px-2.5 py-1.5 transition-colors ${typeV === "camion" ? "bg-red-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
            <Truck size={16} />
          </button>
        </div>
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
