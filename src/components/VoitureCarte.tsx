"use client";
// Une voiture et ses filtres (huile, air, habitacle, carburant) avec prix et stock,
// + le « kit » (un filtre par type) à vendre ou envoyer sur WhatsApp en 1 tap (BIBLE §8.17).
import { useRouter } from "next/navigation";
import FilterImage from "@/components/FilterImage";
import StockBadge from "@/components/StockBadge";
import { type Voiture, LIBELLE, annees, kitDeVoiture, messageKit } from "@/lib/voitures";
import { sendWhatsApp } from "@/lib/whatsapp";
import { Package, Send } from "lucide-react";

export default function VoitureCarte({ v, action }: { v: Voiture; action?: React.ReactNode }) {
  const router = useRouter();
  const kit = kitDeVoiture(v);
  const total = kit.reduce((s, f) => s + (f.prix_vente > 0 ? f.prix_vente : 0), 0);
  const sansPrix = kit.filter((f) => !(f.prix_vente > 0)).length;
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

      {/* Kit : un filtre par type (celui en stock d'abord) */}
      {kit.length >= 2 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <Package size={15} className="text-amber-300 shrink-0" />
          <div className="text-sm text-amber-200 flex-1 min-w-[10rem]">
            Kit {kit.length} filtres{total > 0 && <> · <b>{total} MAD</b></>}
            {sansPrix > 0 && <span className="text-xs text-slate-400"> ({sansPrix} sans prix)</span>}
          </div>
          <button type="button" onClick={() => router.push(`/ventes?kit=${kit.map((f) => f.id).join(",")}`)}
            className="btn-primary text-xs flex items-center gap-1.5">
            🧾 Vendre ce kit
          </button>
          <button type="button" onClick={() => sendWhatsApp(null, messageKit(v, kit))}
            className="btn-secondary text-xs flex items-center gap-1.5" title="Choisis le contact dans WhatsApp">
            <Send size={13} /> WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
