"use client";
// Une voiture et ses filtres (huile, air, habitacle, carburant) avec prix et stock,
// + l'huile moteur conseillée (guide Liqui Moly, BIBLE §8.19)
// + le « kit » (un filtre par type, + l'huile) à vendre ou envoyer sur WhatsApp en 1 tap (BIBLE §8.17)
// + la distribution moteur (catalogue officiel Gates, BIBLE §8.34) avec la remarque de montage de chaque pièce.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FilterImage from "@/components/FilterImage";
import StockBadge from "@/components/StockBadge";
import { type Voiture, type ProdLite, libelle, annees, kitDeVoiture, messageKit } from "@/lib/voitures";
import { estDistribution } from "@/lib/categories";
import { type BidonHuile, bidonsConvenables, bidonsPourVidange, chargerHuiles, estCleVoiture, huilesDeLaVoiture, litresTexte, variantePrevue, versionsFap } from "@/lib/huiles";
import type { HuileMoteur } from "@/types/database";
import { sendWhatsApp } from "@/lib/whatsapp";
import { Package, Send, Droplet, Cog } from "lucide-react";

export default function VoitureCarte({ v, action }: { v: Voiture; action?: React.ReactNode }) {
  const router = useRouter();
  const [huiles, setHuiles] = useState<HuileMoteur[]>([]);
  const [bidons, setBidons] = useState<BidonHuile[]>([]);
  const [variante, setVariante] = useState<string | null>(null);
  const [huilesChargees, setHuilesChargees] = useState(false);

  useEffect(() => {
    chargerHuiles().then(({ huiles: toutes, bidons: b }) => {
      const lignes = huilesDeLaVoiture(v, toutes);
      setHuiles(lignes); setBidons(b); setVariante(variantePrevue(v.moteur, lignes, v.modele)); setHuilesChargees(toutes.length > 0);
    });
  }, [v.code_moteur, v.moteur, v.marque, v.modele, v.annee_debut, v.puissance]); // eslint-disable-line react-hooks/exhaustive-deps

  const kit = kitDeVoiture(v);
  const filtres = v.filtres.filter((f) => !estDistribution(f.categorie));
  const distribution = v.filtres.filter((f) => estDistribution(f.categorie));
  const piece = (f: ProdLite) => {
    const rem = v.remarques?.[f.id];
    return (
      <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/40">
        <FilterImage reference={f.reference} categorie={f.categorie} imageUrl={f.image_url} wid={120} className="h-12 w-12 rounded object-contain bg-white shrink-0 p-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-400">{libelle(f.categorie)}{f.marque && estDistribution(f.categorie) ? ` · ${f.marque}` : ""}</div>
          <div className="font-mono font-semibold truncate">{f.reference}</div>
          {rem && <div className="text-[11px] text-amber-300/90 leading-snug">⚠ {rem}</div>}
        </div>
        <div className="text-end shrink-0 space-y-1">
          {f.prix_vente > 0 && <div className="text-sm font-semibold">{f.prix_vente} MAD</div>}
          <StockBadge stock={f.stock} stockMin={f.stock_min} />
        </div>
      </div>
    );
  };
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
        {filtres.map(piece)}
        {filtres.length === 0 && <p className="text-xs text-slate-400">Aucun filtre enregistré pour cette voiture.</p>}
      </div>
      {/* Pas de filtre à carburant dans nos références : normal sur beaucoup d'essence (il est dans le réservoir),
          à vérifier chez Filtron sur un diesel. On ne devine jamais une référence. */}
      {filtres.length > 0 && !filtres.some((f) => f.categorie === "filtre_carburant") && (
        <p className="mt-2 text-xs text-slate-400">
          Filtre à carburant : aucun dans tes références pour ce moteur. Sur beaucoup de moteurs essence, il est dans le réservoir avec la pompe ; sur un diesel, vérifie dans le catalogue Filtron.
        </p>
      )}

      {/* Distribution moteur (catalogue officiel Gates) : kit, kit + pompe, courroie, galets, kit chaîne.
          Une voiture peut avoir plusieurs choix : la remarque (⚠) dit lequel prendre (date, climatisation, moteur exact). */}
      {distribution.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-sm text-slate-200 font-medium">
            <Cog size={14} className="text-amber-300" /> Distribution moteur
            <span className="text-xs text-slate-500 font-normal">(catalogue officiel {[...new Set(distribution.map((f) => f.marque).filter(Boolean))].join(", ") || "fabricant"})</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 mt-1.5">{distribution.map(piece)}</div>
        </div>
      )}

      {/* Huile moteur conseillée (guide Liqui Moly) */}
      {huiles.length > 0 && (
        <div className="mt-3 rounded-lg bg-slate-800/40 px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <Droplet size={14} className="text-amber-300" /> Huile moteur <span className="text-xs text-slate-500 font-normal">
              (guide Liqui Moly, {estCleVoiture(huiles[0]) ? "d'après le modèle, la cylindrée et la puissance" : `moteur ${huiles[0].code}`})
            </span>
          </div>
          {huiles.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {huiles.map((h) => (
                <button key={h.variante} type="button" onClick={() => setVariante(h.variante)}
                  className={`text-xs px-2 py-0.5 rounded-full ${variante === h.variante ? "bg-amber-500 text-black" : "btn-secondary"}`}>
                  {h.variante || "toutes versions"}
                </button>
              ))}
              {!variante && <span className="text-xs text-slate-400 self-center">
                {versionsFap(huiles) ? "Avec ou sans filtre à particules (FAP) ? Choisis." : "Le guide donne une huile différente selon la version : choisis la bonne."}
              </span>}
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
                {h.remarque && <div className="text-xs text-amber-300/80">{h.remarque}</div>}
                {h.description && <div className="text-[11px] text-slate-500">Relevé sur : {h.description}</div>}
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

      {/* Moteur pas encore relevé : lien vers le guide (on ne devine jamais l'huile) */}
      {huilesChargees && huiles.length === 0 && filtres.length > 0 && (
        <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <Droplet size={12} className="text-slate-500" /> Huile moteur : pas encore relevée pour ce moteur dans FiltroPro.
          <a href="https://www.liqui-moly.com/fr/fr/service/guide-des-huiles.html" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Voir le guide Liqui Moly ↗</a>
        </p>
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
