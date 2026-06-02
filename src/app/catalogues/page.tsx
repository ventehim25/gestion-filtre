"use client";
export const dynamic = "force-dynamic";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { Download, Share2, FileText } from "lucide-react";

const CATALOGUES = [
  { file: "catalogue-huile.pdf", icon: "🛢️", name: "Filtres à huile", desc: "Voitures · protège le moteur" },
  { file: "catalogue-air.pdf", icon: "💨", name: "Filtres à air", desc: "Voitures · combustion optimale" },
  { file: "catalogue-carburant.pdf", icon: "⛽", name: "Filtres à carburant", desc: "Voitures · protège l'injection" },
  { file: "catalogue-habitacle.pdf", icon: "❄️", name: "Filtres d'habitacle", desc: "Voitures · air de la cabine" },
  { file: "catalogue-bus-camion.pdf", icon: "🚚", name: "Bus & Camions", desc: "Poids lourds · utilitaires" },
];

export default function CataloguesPage() {
  const { t } = useLang();

  function urlFor(file: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/${file}`;
  }
  function shareWhatsApp(c: (typeof CATALOGUES)[number]) {
    const text = `📘 Catalogue FiltroPro — ${c.name}\n${urlFor(c.file)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div>
      <Header title="catalogues" />

      <div className="card p-5 mb-4 brand-gradient text-white">
        <h3 className="text-lg font-bold flex items-center gap-2"><FileText size={20} /> {t("cataloguesTitle")}</h3>
        <p className="text-sm text-white/85 mt-1">{t("cataloguesIntro")}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {CATALOGUES.map((c) => (
          <div key={c.file} className="card p-5 flex items-center gap-4">
            <div className="text-4xl shrink-0">{c.icon}</div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-slate-100">{c.name}</h4>
              <p className="text-xs text-slate-400">{c.desc}</p>
              <div className="flex gap-2 mt-3">
                <a href={`/${c.file}`} target="_blank" rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-2 text-xs">
                  <Download size={14} /> {t("download")}
                </a>
                <button onClick={() => shareWhatsApp(c)}
                  className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors">
                  <Share2 size={14} /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
