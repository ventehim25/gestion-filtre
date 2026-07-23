"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import Header from "@/components/Header";
import { useLang } from "@/context/LangContext";
import { Download, Share2, FileText, Link2, Copy, Check, Printer } from "lucide-react";
import { TARIF_KEY, CAT_FR, CAT_ORDER, loadCatalogueItems } from "@/lib/catalogue";
import { logoPlaceholder } from "@/lib/filterPhotos";

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

  // Génère un catalogue PRO imprimable (cartes produits avec photos) → Enregistrer en PDF
  async function genererPdf() {
    setPdfLoading(true);
    try {
      const items = await loadCatalogueItems();
      const w = window.open("", "_blank");
      if (!w) { setPdfLoading(false); return; }
      const byCat = new Map<string, typeof items>();
      for (const i of items) { const a = byCat.get(i.categorie) ?? []; a.push(i); byCat.set(i.categorie, a); }
      const date = new Date().toLocaleDateString("fr-FR");
      const total = items.length;

      const s7Name = (ref: string) => { const m = ref.toUpperCase().match(/^([A-Z]+)\s*(.+)$/); return m ? m[1] + "_" + m[2].replace(/\//g, ".") : ref.toUpperCase(); };
      const s7 = (ref: string, suf: string) => `https://s7g10.scene7.com/is/image/mannhummel/${s7Name(ref)}${suf}?qlt=82&wid=320`;
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const ph = logoPlaceholder();

      const card = (i: (typeof items)[number]) => {
        const cands = [...(i.imageUrl ? [`${i.imageUrl}?qlt=82&wid=320`] : []), s7(i.reference, "-1"), s7(i.reference, ""), s7(i.reference, "-2"), ph];
        return `<div class="card"><div class="ph"><img class="pimg" src="${esc(cands[0])}" data-fb="${esc(cands.slice(1).join("|"))}" onerror="fbNext(this)" alt=""></div>`
          + `<div class="ref">${esc(i.reference)}</div><div class="mk">${esc(i.marque)}</div>`
          + `<div class="pr">${i.prix} MAD${i.promo ? ' <span class="promo">PROMO</span>' : ""}</div></div>`;
      };
      const sections = CAT_ORDER.filter(c => byCat.has(c)).map(c =>
        `<section class="cat"><div class="cat-h"><span class="ct">${CAT_FR[c]}</span><span class="cn">${byCat.get(c)!.length} réf.</span></div><div class="grid">${byCat.get(c)!.map(card).join("")}</div></section>`
      ).join("") || `<p style="text-align:center;color:#999;padding:40px">Aucun article disponible.</p>`;

      const logo = `<svg class="logo" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="lg" x1="6" y1="3" x2="42" y2="45" gradientUnits="userSpaceOnUse"><stop stop-color="#f43f5e"/><stop offset="0.6" stop-color="#dc2626"/><stop offset="1" stop-color="#7f1d1d"/></linearGradient></defs><path d="M24 2.5 41.55 12.75 V33.25 L24 43.5 6.45 33.25 V12.75 Z" fill="url(#lg)"/><g stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M13 18 C 19.5 13.5, 28.5 13.5, 35 18"/><path d="M13 24 C 19.5 19.5, 28.5 19.5, 35 24"/><path d="M13 30 C 19.5 25.5, 28.5 25.5, 35 30"/></g><circle cx="35" cy="18" r="2.1" fill="#fff"/></svg>`;

      w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Catalogue FiltroPro — ${date}</title><style>
        @page{ size:A4; margin:11mm 9mm; }
        *{ box-sizing:border-box; }
        body{ font-family:Arial,Helvetica,sans-serif; color:#1b1712; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .cover{ background:linear-gradient(135deg,#1a1620,#0f0d13 60%,#0b0a0e); color:#f2ecdd; border-radius:12px; padding:18px 22px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
        .cover .brand{ display:flex; align-items:center; gap:12px; }
        .cover .logo{ width:46px; height:46px; }
        .cover .wm{ font-size:26px; font-weight:800; letter-spacing:-.01em; line-height:1; }
        .cover .wm span{ background:linear-gradient(135deg,#fbe38f,#d4af37,#b8860b); -webkit-background-clip:text; background-clip:text; color:transparent; }
        .cover .tl{ font-size:9px; letter-spacing:.22em; text-transform:uppercase; color:#b9b0a0; margin-top:3px; }
        .cover .meta{ text-align:right; }
        .cover .big{ font-size:14px; font-weight:800; letter-spacing:.3em; color:#e2c56b; }
        .cover .sub{ font-size:10.5px; color:#cfc7b6; margin-top:3px; }
        .cat{ margin-top:15px; }
        .cat-h{ display:flex; align-items:baseline; justify-content:space-between; border-bottom:2px solid #c99a2e; padding-bottom:5px; margin-bottom:9px; }
        .cat-h .ct{ font-size:13px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#a9791f; }
        .cat-h .cn{ font-size:10px; color:#b0a488; }
        .grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:9px; }
        .card{ border:1px solid #e8e2d4; border-radius:9px; padding:8px; break-inside:avoid; page-break-inside:avoid; }
        .ph{ height:36mm; background:#fff; border:1px solid #f0ece2; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden; }
        .pimg{ max-width:96%; max-height:96%; object-fit:contain; }
        .ref{ font-family:'Courier New',monospace; font-weight:700; font-size:12.5px; margin-top:7px; }
        .mk{ font-size:10px; color:#8a8172; margin-top:1px; }
        .pr{ font-weight:800; font-size:13.5px; margin-top:3px; }
        .promo{ background:#fde2e4; color:#c81e2a; font-size:8px; font-weight:800; padding:1px 5px; border-radius:10px; margin-left:5px; vertical-align:middle; }
        .foot{ margin-top:22px; text-align:center; font-size:10px; color:#9a917f; line-height:1.7; border-top:1px solid #eee; padding-top:10px; }
        .bar{ text-align:center; margin:16px 0 4px; }
        .bar button{ padding:11px 22px; background:#c99a2e; color:#fff; border:0; border-radius:9px; cursor:pointer; font-weight:800; font-size:14px; }
        .hint{ text-align:center; font-size:11px; color:#b0a488; margin-top:6px; }
        @media print{ .bar,.hint{ display:none; } }
      </style></head><body>
        <div class="cover"><div class="brand">${logo}<div><div class="wm">Filtro<span>Pro</span></div><div class="tl">Pièces &amp; Filtres Auto · Maroc</div></div></div>
          <div class="meta"><div class="big">CATALOGUE</div><div class="sub">${total} références · ${date}</div><div class="sub">📞 06 02 35 02 90 · Livraison aux garages</div></div></div>
        ${sections}
        <p class="foot">Prix susceptibles d'évoluer · sous réserve de disponibilité<br>FiltroPro — Pièces &amp; Filtres Auto · Maroc · Livraison aux garages · 06 02 35 02 90</p>
        <div class="bar"><button onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button></div>
        <p class="hint">Attends que toutes les photos se chargent avant d'imprimer.</p>
        <script>function fbNext(el){var fb=(el.getAttribute('data-fb')||'').split('|').filter(Boolean);if(!fb.length){el.style.display='none';return;}el.src=fb.shift();el.setAttribute('data-fb',fb.join('|'));}</script>
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
