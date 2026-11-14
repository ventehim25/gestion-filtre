"use client";
// Paramètres → « Mes 4 catalogues de prix » : pourcentages (par rapport au prix garage) + liens à envoyer.
import { useEffect, useState } from "react";
import {
  CATALOGUES, POURCENTAGES_DEFAUT, chargerPourcentages, enregistrerPourcentages, lienCatalogue, type Pourcentages,
} from "@/lib/prixCatalogues";
import { sendWhatsApp } from "@/lib/whatsapp";
import { Copy, Check, Send, ExternalLink, Tags } from "lucide-react";

export default function CataloguesSection() {
  const [pct, setPct] = useState<Pourcentages>(POURCENTAGES_DEFAUT);
  const [etat, setEtat] = useState<"" | "enregistre" | string>("");
  const [copie, setCopie] = useState<string | null>(null);

  useEffect(() => { chargerPourcentages().then(setPct); }, []);

  async function enregistrer() {
    const err = await enregistrerPourcentages(pct);
    setEtat(err ? (/reglages/.test(err) ? "Pas encore activé : il faut coller le SQL catalogues_huile_tournees.sql dans Supabase." : err) : "enregistre");
  }

  async function copier(lien: string) {
    try { await navigator.clipboard.writeText(lien); setCopie(lien); setTimeout(() => setCopie(null), 1500); } catch { /* refusé */ }
  }

  return (
    <div className="card p-6 max-w-md mb-4">
      <h3 className="font-semibold text-slate-200 mb-1 flex items-center gap-2"><Tags size={16} className="text-amber-400" /> Mes 4 catalogues de prix</h3>
      <p className="text-xs text-slate-400 mb-4">
        Mêmes articles, prix différents. Tu tapes le prix garage ; les autres se calculent avec ces pourcentages (arrondis au dirham).
        Un article peut avoir son propre prix (fiche produit). En vente, le prix suit le type du client.
      </p>

      <div className="space-y-3">
        {CATALOGUES.map((c) => {
          const lien = lienCatalogue(c.type);
          return (
            <div key={c.type} className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-100">{c.libelle}</span>
                {c.type === "garage" ? (
                  <span className="text-xs text-slate-400">prix de base</span>
                ) : (
                  <label className="flex items-center gap-1 text-xs text-slate-400">
                    <input type="number" step={1} className="input !w-20 text-right" value={pct[c.type]}
                      onChange={(e) => { setPct({ ...pct, [c.type]: Number(e.target.value) || 0 }); setEtat(""); }} />
                    %
                  </label>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs">
                <button type="button" onClick={() => copier(lien)} className="flex items-center gap-1 text-blue-400 hover:underline">
                  {copie === lien ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier le lien</>}
                </button>
                <button type="button" onClick={() => sendWhatsApp(null, `📋 Catalogue FiltroPro (${c.libelle}) — prix du jour :\n${lien}`)}
                  className="flex items-center gap-1 text-green-400 hover:underline"><Send size={12} /> WhatsApp</button>
                <a href={lien} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-400 hover:text-white"><ExternalLink size={12} /> Voir</a>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" onClick={enregistrer} className="btn-primary w-full mt-4">Enregistrer les pourcentages</button>
      {etat === "enregistre" && <p className="text-xs text-green-400 mt-2">Enregistré ✓ Les 4 catalogues sont à jour.</p>}
      {etat && etat !== "enregistre" && <p className="text-xs text-amber-300 mt-2">{etat}</p>}
    </div>
  );
}
