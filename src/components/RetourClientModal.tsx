"use client";
// Fenêtre « ↩ Retour de pièces » d'un bon de vente (nouveauté n° 2, BIBLE §8.41).
// Étapes : 1) combien de pièces le client rend (au plus ce qui reste du bon) · 2) comment on règle l'argent
// (avoir / argent rendu / déduit de ce qu'il doit) · 3) Valider → le stock revient tout seul.
import { useEffect, useState } from "react";
import { Undo2, X } from "lucide-react";
import { enregistrerRetourClient, lignesPourRetour, type LigneVenteRetour, type ModeRetour } from "@/lib/retours";
import type { RetourClient } from "@/types/database";

type Props = {
  sale: { id: string; client_id: string; total: number; montant_paye: number; date: string; client?: { nom: string } | null };
  onClose: () => void;
  onDone: (message: string) => void;
};

const MODES: { cle: ModeRetour; titre: string; aide: string }[] = [
  { cle: "avoir", titre: "🎁 Avoir", aide: "Crédit gardé pour sa prochaine vente (bouton « Déduire » dans Vente)." },
  { cle: "rembourse", titre: "💵 Je lui rends l'argent", aide: "L'argent sort de la caisse du jour." },
  { cle: "deduit", titre: "➖ Déduire de ce qu'il doit", aide: "Le reste à payer de ce bon baisse. Rien ne sort de la caisse." },
];

export default function RetourClientModal({ sale, onClose, onDone }: Props) {
  const [lignes, setLignes] = useState<LigneVenteRetour[] | null>(null);
  const [anciens, setAnciens] = useState<RetourClient[]>([]);
  const [qte, setQte] = useState<Record<number, number>>({});
  const reste = Math.round((sale.total - sale.montant_paye) * 100) / 100;
  const [mode, setMode] = useState<ModeRetour>(reste > 0 ? "deduit" : "avoir");
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    lignesPourRetour(sale.id)
      .then(({ lignes, retours }) => { setLignes(lignes); setAnciens(retours); })
      .catch((e) => setErreur(/retours_clients|schema cache/i.test(String(e?.message)) ? "La table des retours n'existe pas encore (SQL gestion_magasin.sql)." : String(e?.message ?? e)));
  }, [sale.id]);

  const choisies = (lignes ?? []).map((l, i) => ({ ...l, quantite: qte[i] ?? 0 })).filter((l) => l.quantite > 0);
  const montant = choisies.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
  const deduitImpossible = mode === "deduit" && montant > reste + 0.01;

  async function valider() {
    if (!choisies.length) { setErreur("Choisis au moins une pièce rendue."); return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) { setErreur("Retour impossible hors-ligne : réessaie avec le réseau."); return; }
    setEnvoi(true); setErreur("");
    try {
      await enregistrerRetourClient({
        sale, mode, note,
        lignes: choisies.map(({ product_id, equivalence_id, ref, quantite, prix_unitaire, cout_unitaire }) => ({ product_id, equivalence_id, ref, quantite, prix_unitaire, cout_unitaire })),
      });
      const quoi = mode === "avoir" ? `${montant.toFixed(0)} MAD d'avoir pour ${sale.client?.nom ?? "le client"}`
        : mode === "rembourse" ? `${montant.toFixed(0)} MAD sortis de la caisse` : `reste à payer baissé de ${montant.toFixed(0)} MAD`;
      onDone(`Retour enregistré ✓ — stock remis, ${quoi}`);
    } catch (e) {
      setErreur(String((e as { message?: string })?.message ?? e));
      setEnvoi(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
      <div className="card p-5 w-full max-w-lg my-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Undo2 size={18} className="text-amber-400" /> Retour de pièces</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-xs text-slate-400 mb-4">Bon du {sale.date} · {sale.client?.nom ?? ""} · {sale.total.toFixed(0)} MAD{reste > 0 ? ` · reste à payer ${reste.toFixed(0)} MAD` : " · payé"}</p>

        <p className="text-sm font-medium text-slate-200 mb-2">1. Combien il rend ?</p>
        {!lignes && !erreur && <p className="text-xs text-slate-500 mb-3">Chargement…</p>}
        {lignes && lignes.length === 0 && <p className="text-xs text-slate-500 mb-3">Ce bon n&apos;a pas de détail d&apos;articles (ancien impayé) : retour impossible.</p>}
        <div className="space-y-2 mb-4">
          {lignes?.map((l, i) => {
            const max = l.vendu - l.dejaRendu;
            return (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-center rounded-lg bg-slate-800/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-100 truncate">{l.ref}</p>
                  <p className="text-[11px] text-slate-500">vendu {l.vendu} × {l.prix_unitaire.toFixed(0)} MAD{l.dejaRendu ? ` · déjà rendu ${l.dejaRendu}` : ""}</p>
                </div>
                {max > 0 ? (
                  <div className="flex items-center gap-1">
                    <button type="button" className="btn-secondary px-2 py-1" onClick={() => setQte({ ...qte, [i]: Math.max(0, (qte[i] ?? 0) - 1) })}>−</button>
                    <span className="w-8 text-center font-semibold text-amber-300">{qte[i] ?? 0}</span>
                    <button type="button" className="btn-secondary px-2 py-1" onClick={() => setQte({ ...qte, [i]: Math.min(max, (qte[i] ?? 0) + 1) })}>+</button>
                    <button type="button" className="text-[11px] text-slate-400 hover:text-amber-300 ms-1" onClick={() => setQte({ ...qte, [i]: max })}>tout</button>
                  </div>
                ) : <span className="text-[11px] text-slate-500">tout rendu</span>}
              </div>
            );
          })}
        </div>

        <p className="text-sm font-medium text-slate-200 mb-2">2. L&apos;argent ({montant.toFixed(0)} MAD)</p>
        <div className="space-y-1.5 mb-3">
          {MODES.map((m) => {
            const off = m.cle === "deduit" && reste <= 0;
            return (
              <button key={m.cle} type="button" disabled={off} onClick={() => setMode(m.cle)}
                className={`w-full text-start rounded-lg px-3 py-2 border transition-colors ${mode === m.cle ? "border-amber-500 bg-amber-500/10" : "border-slate-700 hover:border-slate-500"} ${off ? "opacity-40 cursor-not-allowed" : ""}`}>
                <span className="text-sm font-medium text-slate-100">{m.titre}</span>
                <span className="block text-[11px] text-slate-400">{off ? "Ce bon est déjà payé." : m.aide}</span>
              </button>
            );
          })}
        </div>
        {deduitImpossible && <p className="text-xs text-red-400 mb-2">Il ne doit plus que {reste.toFixed(0)} MAD sur ce bon : choisis « Avoir » ou « Je lui rends l&apos;argent ».</p>}
        <label className="text-xs text-slate-500 block mb-4">Raison (facultatif)
          <input className="input mt-1" placeholder="ex. mauvaise référence, pièce abîmée…" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        {anciens.length > 0 && (
          <div className="text-[11px] text-slate-500 mb-3">
            Retours déjà faits : {anciens.map((r) => `${r.date} −${Number(r.montant).toFixed(0)} MAD (${r.mode === "avoir" ? "avoir" : r.mode === "rembourse" ? "rendu" : "déduit"})`).join(" · ")}
          </div>
        )}
        {erreur && <p className="text-xs text-red-400 mb-3">{erreur}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={valider} disabled={envoi || !choisies.length || deduitImpossible} className="btn-primary disabled:opacity-50">
            {envoi ? "…" : `3. Valider le retour${montant ? ` (${montant.toFixed(0)} MAD)` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
