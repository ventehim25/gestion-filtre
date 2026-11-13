"use client";
// Une voiture et ses filtres (huile, air, habitacle, carburant) avec prix et stock.
import FilterImage from "@/components/FilterImage";
import StockBadge from "@/components/StockBadge";
import { type Voiture, LIBELLE, annees } from "@/lib/voitures";

export default function VoitureCarte({ v, action }: { v: Voiture; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/60 p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="font-semibold">{v.marque} · {v.modele}</div>
          <div className="text-sm text-slate-400">
            {[v.moteur, v.code_moteur && `code ${v.code_moteur}`, annees(v), v.puissance && `${v.puissance} ch`].filter(Boolean).join(" · ")}
          </div>
        </div>
        {action}
      </div>
      <div className="grid sm:grid-cols-2 gap-2 mt-3">
        {v.filtres.map((f) => (
          <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40">
            <FilterImage reference={f.reference} categorie={f.categorie} imageUrl={f.image_url} wid={120} className="h-12 w-12 rounded object-contain bg-white shrink-0 p-0.5" />
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-400">{LIBELLE[f.categorie] ?? f.categorie}</div>
              <div className="font-mono font-semibold truncate">{f.reference}</div>
            </div>
            <div className="text-end shrink-0 space-y-1">
              {f.prix_vente > 0 && <div className="text-sm font-semibold">{f.prix_vente} MAD</div>}
              <StockBadge stock={f.stock} stockMin={f.stock_min} />
            </div>
          </div>
        ))}
        {v.filtres.length === 0 && <p className="text-xs text-slate-400">Aucun filtre enregistré pour cette voiture.</p>}
      </div>
      {/* Pas de filtre à carburant dans nos références : normal sur beaucoup d'essence (il est dans le réservoir),
          à vérifier chez Filtron sur un diesel. On ne devine jamais une référence. */}
      {v.filtres.length > 0 && !v.filtres.some((f) => f.categorie === "filtre_carburant") && (
        <p className="mt-2 text-xs text-slate-400">
          Filtre à carburant : aucun dans tes références pour ce moteur. Sur beaucoup de moteurs essence, il est dans le réservoir avec la pompe ; sur un diesel, vérifie dans le catalogue Filtron.
        </p>
      )}
    </div>
  );
}
