"use client";
// Une voiture et ses filtres (huile, air, habitacle, carburant) avec prix et stock,
// + l'huile moteur conseillée (guide Liqui Moly, BIBLE §8.19)
// + le « kit » (un filtre par type, + l'huile) à vendre ou envoyer sur WhatsApp en 1 tap (BIBLE §8.17).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FilterImage from "@/components/FilterImage";
import StockBadge from "@/components/StockBadge";
import { type Voiture, LIBELLE, annees, kitDeVoiture, messageKit } from "@/lib/voitures";
import { type BidonHuile, bidonsConvenables, bidonsPourVidange, chargerHuiles, huilesDuMoteur, litresTexte, variantePrevue } from "@/lib/huiles";
import type { HuileMoteur } from "@/types/database";
import { sendWhatsApp } from "@/lib/whatsapp";
import { Package, Send, Droplet } from "lucide-react";

export default function VoitureCarte({ v, action }: { v: Voiture; action?: React.ReactNode }) {
  const router = useRouter();
  const [huiles, setHuiles] = useState<HuileMoteur[]>([]);
  const [bidons, setBidons] = useState<BidonHuile[]>([]);
  const [variante, setVariante] = useState<string | null>(null);

  useEffect(() => {
    chargerHuiles().then(({ huiles: toutes, bidons: b }) => {
      const lignes = huilesDuMoteur(v.code_moteur, toutes);
      setHuiles(lignes); setBidons(b); setVariante(variantePrevue(v.moteur, lignes));
    });
  }, [v.code_moteur, v.moteur]);

  const kit = kitDeVoiture(v);
  const huile = huiles.find((h) => h.variante === variante) ?? null; // choisie (ou seule possible)
  const pourVidange = huile ? bidonsPourVidange(huile, bidons) : [];
  const total = kit.reduce((s, f) => s + (f.prix_vente > 0 ? f.prix_vente : 0), 0) + pourVidange.reduce((s, x) => s + (x.bidon.prix_vente > 0 ? x.bidon.prix_vente * x.qte : 0), 0);
  const sansPrix = kit.filter((f) => !(f.prix_vente > 0)).length;
  // Texte pour WhatsApp : la viscosité du bidon choisi, sinon les viscosités possibles
  const huileTexte = huile ? `${pourVidange[0]?.bidon.viscosite ?? huile.viscosites.slice(0, 3).join(" / ")}${litresTexte(huile) ? ` · ${litresTexte(huile)}` : ""}` : "";

  function vendre() {
    const ids = [...kit.map((f) => f.id), ...pourVidange.map((x) => `${x.bidon.id}*${x.qte}`)];
    router.push(`/ventes?kit=${ids.join(",")}`);
  }
  function whatsapp() {
    sendWhatsApp(null, messageKit(v, kit, huile ? { texte: huileTexte, lignes: pourVidange.map((x) => ({ reference: x.bidon.reference, qte: x.qte, prix_vente: x.bidon.prix_vente })) } : undefined));
  }

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

      {/* Huile moteur conseillée (guide Liqui Moly) */}
      {huiles.length > 0 && (
        <div className="mt-3 rounded-lg bg-slate-800/40 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <Droplet size={14} className="text-amber-300" /> Huile moteur <span className="text-xs text-slate-500 font-normal">(guide Liqui Moly, moteur {huiles[0].code})</span>
          </div>
          {huiles.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {huiles.map((h) => (
                <button key={h.variante} type="button" onClick={() => setVariante(h.variante)}
                  className={`text-xs px-2 py-0.5 rounded-full ${variante === h.variante ? "bg-amber-500 text-black" : "btn-secondary"}`}>
                  {h.variante || "toutes versions"}
                </button>
              ))}
              {!variante && <span className="text-xs text-slate-400 self-center">Avec ou sans filtre à particules (FAP) ? Choisis.</span>}
            </div>
          )}
          {huiles.filter((h) => !variante || h.variante === variante).map((h) => {
            const enStock = bidonsConvenables(h, bidons);
            return (
              <div key={h.variante} className="mt-1.5">
                {huiles.length > 1 && !variante && <span className="text-xs text-slate-400">{h.variante} : </span>}
                <span className="text-xs text-slate-400">Viscosités possibles : </span><b className="text-amber-200">{h.viscosites.join(" · ")}</b>
                {litresTexte(h) && <span className="text-slate-300"> — {litresTexte(h)}</span>}
                {h.norme && <span className="text-xs text-slate-400"> · norme {h.norme}</span>}
                <div className="text-xs mt-0.5">
                  {enStock.length
                    ? <span className="text-green-400">En stock : {enStock.slice(0, 3).map((b) => `${b.reference}${b.prix_vente > 0 ? ` (${b.prix_vente} MAD)` : ""}`).join(" · ")}</span>
                    : <span className="text-slate-500">Aucune huile de cette viscosité en stock.</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kit : un filtre par type (celui en stock d'abord) + l'huile choisie si elle est en stock */}
      {kit.length >= 2 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <Package size={15} className="text-amber-300 shrink-0" />
          <div className="text-sm text-amber-200 flex-1 min-w-[10rem]">
            Kit {kit.length} filtres{pourVidange.length > 0 && " + huile"}{total > 0 && <> · <b>{total} MAD</b></>}
            {sansPrix > 0 && <span className="text-xs text-slate-400"> ({sansPrix} sans prix)</span>}
          </div>
          <button type="button" onClick={vendre} className="btn-primary text-xs flex items-center gap-1.5">
            🧾 Vendre ce kit
          </button>
          <button type="button" onClick={whatsapp} className="btn-secondary text-xs flex items-center gap-1.5" title="Choisis le contact dans WhatsApp">
            <Send size={13} /> WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
