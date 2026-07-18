// Catalogue public SEO (Bible §4.8) — une page par référence, indexable par Google.
// AUCUNE donnée sensible : pas de prix, pas de stock chiffré — juste « Disponible / Sur commande ».
// Compatibilités = UNIQUEMENT la table applications (vraies données) — jamais inventées.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Product, Application, Equivalence } from "@/types/database";
import FilterImage from "@/components/FilterImage";

export const revalidate = 86400; // ISR : page régénérée au plus toutes les 24 h

const TEL_WA = "212602350290";
const CAT_FR: Record<string, string> = {
  filtre_huile: "Filtre à huile", filtre_air: "Filtre à air", filtre_carburant: "Filtre à carburant",
  filtre_habitacle: "Filtre d'habitacle", filtre_refroidissement: "Filtre de refroidissement",
  huile_moteur: "Huile moteur", autre: "Pièce auto",
};

type Row = Product & { equivalences: Equivalence[]; applications: Application[] };

async function getProduct(segs: string[]): Promise<Row | null> {
  const raw = decodeURIComponent(segs.join("/"));
  const cleanNorm = raw.toUpperCase().replace(/\s+/g, "");
  if (cleanNorm.length < 2) return null;
  const loose = "%" + cleanNorm.replace(/[%_]/g, "").split("").join("%") + "%";
  const { data } = await supabase.from("products")
    .select("*, equivalences(*), applications(*)")
    .ilike("reference", loose).limit(10);
  const rows = (data ?? []) as unknown as Row[];
  return rows.find(p => p.reference.toUpperCase().replace(/\s+/g, "") === cleanNorm) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ ref: string[] }> }): Promise<Metadata> {
  const { ref } = await params;
  const p = await getProduct(ref);
  if (!p) return { title: "Référence introuvable — FiltroPro" };
  const cat = CAT_FR[p.categorie] ?? "Pièce auto";
  const vehs = (p.applications ?? []).slice(0, 3).map(a => `${a.marque} ${a.modele}`).join(", ");
  return {
    title: `${cat} ${p.reference} ${p.marque ?? "Filtron"}${vehs ? ` — compatible ${vehs.split(",")[0]}` : ""} — Maroc | FiltroPro`,
    description: `${cat} ${p.reference} (${p.marque ?? "Filtron"}) au Maroc.${vehs ? ` Compatible : ${vehs}…` : ""} Demandez le prix et la disponibilité sur WhatsApp — livraison garages.`,
    openGraph: { title: `${cat} ${p.reference} — FiltroPro Maroc`, images: p.image_url ? [p.image_url] : undefined },
  };
}

export default async function CataloguePage({ params }: { params: Promise<{ ref: string[] }> }) {
  const { ref } = await params;
  const p = await getProduct(ref);
  if (!p) notFound();
  const cat = CAT_FR[p.categorie] ?? "Pièce auto";
  const apps = p.applications ?? [];
  const marques = [...new Set((p.equivalences ?? []).map(e => `${e.marque} ${e.reference}`))];
  const dispo = p.stock > 0 || (p.equivalences ?? []).some(e => e.stock > 0);
  const waText = encodeURIComponent(`Salam 🙏 Prix et disponibilité du ${cat.toLowerCase()} ${p.reference} ?`);

  return (
    <div className="min-h-screen bg-[#0a0b10] text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* En-tête marque */}
        <div className="flex items-center gap-2 mb-6">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="font-bold text-lg">FiltroPro</span>
          <span className="text-xs text-slate-500">· Pièces &amp; Filtres Auto · Maroc</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="shrink-0 mx-auto sm:mx-0">
              <FilterImage reference={p.reference} categorie={p.categorie} imageUrl={p.image_url} wid={280}
                className="h-44 w-44 rounded-xl object-contain bg-white p-2" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-widest text-red-400 font-semibold mb-1">{cat}</p>
              <h1 className="text-2xl font-bold font-mono">{p.reference}</h1>
              <p className="text-sm text-amber-400 font-semibold mt-0.5">{p.marque || "Filtron"}</p>
              {p.dimensions && <p className="text-sm text-slate-400 mt-2">📏 {p.dimensions}</p>}
              <p className={`inline-block mt-3 text-sm font-medium px-3 py-1 rounded-full ${dispo ? "bg-green-500/15 text-green-400" : "bg-slate-500/15 text-slate-400"}`}>
                {dispo ? "✅ Disponible" : "📦 Sur commande"}
              </p>
              <div className="mt-4">
                <a href={`https://wa.me/${TEL_WA}?text=${waText}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-5 py-3 rounded-xl transition-colors">
                  💬 Demander le prix sur WhatsApp
                </a>
              </div>
            </div>
          </div>

          {marques.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <h2 className="text-sm font-semibold text-slate-300 mb-2">Références équivalentes</h2>
              <div className="flex flex-wrap gap-1.5">
                {marques.slice(0, 20).map(m => (
                  <span key={m} className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono">{m}</span>
                ))}
              </div>
            </div>
          )}

          {apps.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">🚗 Véhicules compatibles ({apps.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 uppercase">
                      <th className="py-1.5 pe-3">Marque</th><th className="py-1.5 pe-3">Modèle</th>
                      <th className="py-1.5 pe-3">Moteur</th><th className="py-1.5">Années</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {apps.map((a, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pe-3 text-slate-200">{a.marque}</td>
                        <td className="py-1.5 pe-3 text-slate-300">{a.modele}</td>
                        <td className="py-1.5 pe-3 text-slate-400">{a.moteur ?? "—"}</td>
                        <td className="py-1.5 text-slate-500 text-xs">{a.annee_debut ?? ""}{a.annee_fin ? ` – ${a.annee_fin}` : a.annee_debut ? " →" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          FiltroPro — Pièces &amp; Filtres Auto · Maroc · <a className="underline hover:text-slate-400" href={`https://wa.me/${TEL_WA}`}>WhatsApp 06 02 35 02 90</a>
        </p>
      </div>
    </div>
  );
}
