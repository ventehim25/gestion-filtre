"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { Download, Share2, FileText, Link2, Copy, Check, Printer } from "lucide-react";
import { TARIF_KEY, CAT_FR, CAT_ORDER, loadCatalogueItems } from "@/lib/catalogue";

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
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://gestion-filtre.vercel.app";
  const tarifUrl = `${origin}/tarif?k=${TARIF_KEY}`;

  function urlFor(file: string) { return `${origin}/${file}`; }
  function shareWhatsApp(c: { file: string; name: string }) {
    const text = `📘 Catalogue FiltroPro — ${c.name}\n${urlFor(c.file)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function copyTarif() {
    navigator.clipboard?.writeText(tarifUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  function shareTarif() {
    const text = `📗 *Catalogue & Tarifs FiltroPro* (prix du jour)\n${tarifUrl}\n\nCommande directement depuis le lien 👇`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  // Génère un catalogue de prix imprimable (→ Enregistrer en PDF, ou capture d'écran pour WhatsApp)
  async function genererPdf() {
    setPdfLoading(true);
    try {
      const items = await loadCatalogueItems();
      const w = window.open("", "_blank");
      if (!w) { setPdfLoading(false); return; }
      const byCat = new Map<string, typeof items>();
      for (const i of items) { const a = byCat.get(i.categorie) ?? []; a.push(i); byCat.set(i.categorie, a); }
      const date = new Date().toLocaleDateString("fr-FR");
      const sections = CAT_ORDER.filter(c => byCat.has(c)).map(c => {
        const rows = byCat.get(c)!.map(i =>
          `<tr><td class="r">${i.reference}</td><td class="m">${i.marque}</td><td class="p">${i.prix} MAD${i.promo ? ' <span class="pr">PROMO</span>' : ""}</td></tr>`
        ).join("");
        return `<h2>${CAT_FR[c]}</h2><table>${rows}</table>`;
      }).join("");
      w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Catalogue & Tarifs FiltroPro</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#141414;margin:0;padding:28px 26px 40px;max-width:720px;margin:0 auto}
        .top{display:flex;align-items:center;gap:12px;border-bottom:3px solid #c99a2e;padding-bottom:12px}
        .top .n{font-size:24px;font-weight:800}.top .n span{color:#c99a2e}
        .top .s{margin-left:auto;text-align:right;font-size:12px;color:#666}
        h2{margin:22px 0 6px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#a9791f;border-bottom:1px solid #e8e2d4;padding-bottom:4px}
        table{width:100%;border-collapse:collapse}
        td{padding:6px 4px;font-size:13px;border-bottom:1px solid #f0ece2}
        td.r{font-family:monospace;font-weight:700;width:40%}
        td.m{color:#777;width:32%;font-size:12px}
        td.p{text-align:right;font-weight:800;white-space:nowrap}
        .pr{background:#fde2e4;color:#c81e2a;font-size:9px;padding:1px 5px;border-radius:10px;margin-left:6px;vertical-align:middle}
        .foot{margin-top:26px;text-align:center;font-size:11px;color:#888;line-height:1.7}
        @media print{button{display:none}}
      </style></head><body>
      <div class="top"><div class="n">Filtro<span>Pro</span></div><div class="s">Catalogue &amp; Tarifs<br>${date} · 06 02 35 02 90</div></div>
      ${sections || "<p>Aucun article disponible.</p>"}
      <p class="foot">Prix susceptibles d'évoluer · sous réserve de disponibilité<br>FiltroPro — Pièces &amp; Filtres Auto · Maroc · Livraison aux garages</p>
      <button onclick="window.print()" style="margin-top:18px;padding:10px 18px;background:#c99a2e;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:700">🖨️ Imprimer / Enregistrer en PDF</button>
      </body></html>`);
      w.document.close();
    } finally { setPdfLoading(false); }
  }

  return (
    <div>
      <Header title="catalogues" />

      {/* ===== Catalogue de prix (privé, à jour) ===== */}
      <div className="card p-5 mb-6 border-amber-500/25">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">📗 Mon catalogue de prix (privé)</h3>
        <p className="text-sm text-slate-400 mt-1">
          Un lien à envoyer <b>seulement à tes garages</b>. Il montre tes filtres dispo avec les <b>prix à jour</b> — quand tu changes un prix ou un stock dans Produits, le catalogue se met à jour tout seul. <b>Ne le mets pas sur Google.</b>
        </p>

        <div className="mt-3 flex items-center gap-2 bg-[var(--surface-2)] rounded-lg px-3 py-2">
          <Link2 size={15} className="text-amber-400 shrink-0" />
          <span className="text-xs text-slate-300 font-mono truncate flex-1">{tarifUrl}</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <button onClick={copyTarif} className="btn-secondary flex items-center gap-2 text-sm">
            {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />} {copied ? "Copié ✓" : "Copier le lien"}
          </button>
          <button onClick={shareTarif} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white">
            <Share2 size={15} /> Envoyer sur WhatsApp
          </button>
          <a href={tarifUrl} target="_blank" rel="noreferrer" className="btn-secondary flex items-center gap-2 text-sm">
            👁️ Aperçu
          </a>
          <button onClick={genererPdf} disabled={pdfLoading} className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50">
            <Printer size={15} /> {pdfLoading ? "Génération…" : "Générer PDF"}
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">« Générer PDF » ouvre un catalogue imprimable (→ Enregistrer en PDF, ou capture d&apos;écran pour l&apos;envoyer sur WhatsApp).</p>
      </div>

      {/* ===== Catalogues PDF Filtron (fixes) ===== */}
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
