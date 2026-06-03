"use client";
export const dynamic = "force-dynamic";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { Download, Share2, FileText } from "lucide-react";

const GROUPS = [
  {
    kind: "🚗 Voitures", sub: "Pour les clients qui travaillent les voitures",
    items: [
      { file: "catalogue-huile.pdf", icon: "🛢️", name: "Filtres à huile", desc: "Protège le moteur" },
      { file: "catalogue-air.pdf", icon: "💨", name: "Filtres à air", desc: "Combustion optimale" },
      { file: "catalogue-carburant.pdf", icon: "⛽", name: "Filtres à carburant", desc: "Protège l'injection" },
      { file: "catalogue-habitacle.pdf", icon: "❄️", name: "Filtres d'habitacle", desc: "Air de la cabine" },
    ],
  },
  {
    kind: "🚚 Bus & Camions", sub: "Poids lourds · bus · utilitaires · agricole",
    items: [
      { file: "catalogue-bus-camion.pdf", icon: "🚚", name: "Tous filtres Bus & Camions", desc: "Huile · air · carburant · habitacle" },
    ],
  },
];

export default function CataloguesPage() {
  const { t } = useLang();

  function urlFor(file: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/${file}`;
  }
  function shareWhatsApp(c: { file: string; name: string }) {
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

      {GROUPS.map((g) => (
        <div key={g.kind} className="mb-6">
          <div className="flex items-baseline gap-3 mb-3">
            <h3 className="text-lg font-bold text-slate-100">{g.kind}</h3>
            <span className="text-xs text-slate-400">{g.sub}</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {g.items.map((c) => (
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
      ))}
    </div>
  );
}
