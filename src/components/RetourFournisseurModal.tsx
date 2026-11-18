"use client";
// Fenêtre « ↩ Rendre au fournisseur » (nouveauté n° 2, BIBLE §8.41).
// Étapes : 1) choisir dans ce que j'ai pris chez lui ce que je rends (au plus le stock) · 2) vérifier le prix d'achat
// · 3) Valider → le stock baisse, la dette (crédit) ou le capital se corrige tout seul. ✕ dans l'historique = annuler.
import { useEffect, useMemo, useState } from "react";
import { Undo2, X } from "lucide-react";
import { enregistrerRetourFournisseur, piecesDuFournisseur, type PieceARendre } from "@/lib/retours";
import type { Fournisseur, Reception } from "@/types/database";

type Props = { fournisseur: Fournisseur; receptions: Reception[]; onClose: () => void; onDone: (message: string) => void };

export default function RetourFournisseurModal({ fournisseur, receptions, onClose, onDone }: Props) {
  const [pieces, setPieces] = useState<PieceARendre[] | null>(null);
  const [qte, setQte] = useState<Record<string, number>>({});
  const [prix, setPrix] = useState<Record<string, number>>({});
  const [cherche, setCherche] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const capital = (fournisseur.type ?? "credit") === "capital";

  useEffect(() => {
    piecesDuFournisseur(receptions, fournisseur.id).then(setPieces).catch((e) => setErreur(String(e?.message ?? e)));
  }, [receptions, fournisseur.id]);

  const cle = (p: PieceARendre) => `${p.product_id}|${p.equivalence_id ?? ""}`;
  const visibles = useMemo(() => {
    const q = cherche.trim().toLowerCase().replace(/\s+/g, "");
    return (pieces ?? []).filter((p) => !q || p.ref.toLowerCase().replace(/\s+/g, "").includes(q));
  }, [pieces, cherche]);
  const choisies = (pieces ?? []).filter((p) => (qte[cle(p)] ?? 0) > 0)
    .map((p) => ({ product_id: p.product_id, equivalence_id: p.equivalence_id, ref: p.ref, quantite: qte[cle(p)], prix_achat: prix[cle(p)] ?? p.prix_achat }));
  const montant = choisies.reduce((s, l) => s + l.quantite * l.prix_achat, 0);

  async function valider() {
    if (!choisies.length) { setErreur("Choisis au moins une pièce à rendre."); return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) { setErreur("Retour impossible hors-ligne : réessaie avec le réseau."); return; }
    setEnvoi(true); setErreur("");
    try {
      await enregistrerRetourFournisseur({ fournisseur_id: fournisseur.id, date, lignes: choisies, note });
      onDone(`Retour à ${fournisseur.nom} enregistré ✓ — stock baissé, ${montant.toFixed(0)} MAD ${capital ? "reviennent dans ton capital" : "enlevés de la dette"}`);
    } catch (e) {
      const m = String((e as { message?: string })?.message ?? e);
      setErreur(/type|receptions_type_check|schema cache/i.test(m) ? "La base n'accepte pas encore les retours (SQL gestion_magasin.sql)." : m);
      setEnvoi(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
      <div className="card p-5 w-full max-w-lg my-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-100 flex items-center gap-2"><Undo2 size={18} className="text-amber-400" /> Rendre à {fournisseur.nom}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-xs text-slate-400 mb-3">Seulement les pièces prises chez {fournisseur.nom} (réceptions avec détail). {capital ? "L'argent revient dans ton capital." : "La dette baisse du prix d'achat."}</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <label className="text-xs text-slate-500">Chercher une réf.<input className="input mt-1" value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="ex. OE 667" /></label>
          <label className="text-xs text-slate-500">Date<input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>

        {!pieces && !erreur && <p className="text-xs text-slate-500 mb-3">Chargement…</p>}
        {pieces && pieces.length === 0 && <p className="text-xs text-slate-500 mb-3">Aucune pièce prise chez {fournisseur.nom} avec détail enregistré.</p>}
        <div className="space-y-2 mb-4 max-h-[45vh] overflow-y-auto pe-1">
          {visibles.map((p) => {
            const k = cle(p);
            const max = Math.max(0, Math.min(p.pris, p.stock));
            const n = qte[k] ?? 0;
            return (
              <div key={k} className={`rounded-lg px-3 py-2 ${n > 0 ? "bg-amber-500/10 border border-amber-500/40" : "bg-slate-800/50"}`}>
                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-100 truncate">{p.ref}</p>
                    <p className="text-[11px] text-slate-500">pris {p.pris} · en stock {p.stock}</p>
                  </div>
                  {max > 0 ? (
                    <div className="flex items-center gap-1">
                      <button type="button" className="btn-secondary px-2 py-1" onClick={() => setQte({ ...qte, [k]: Math.max(0, n - 1) })}>−</button>
                      <span className="w-8 text-center font-semibold text-amber-300">{n}</span>
                      <button type="button" className="btn-secondary px-2 py-1" onClick={() => setQte({ ...qte, [k]: Math.min(max, n + 1) })}>+</button>
                    </div>
                  ) : <span className="text-[11px] text-slate-500">plus en stock</span>}
                </div>
                {n > 0 && (
                  <label className="text-[11px] text-slate-400 flex items-center gap-2 mt-1.5">Prix d&apos;achat
                    <input type="number" inputMode="decimal" className="input py-1 text-sm" value={prix[k] ?? p.prix_achat}
                      onChange={(e) => setPrix({ ...prix, [k]: Number(e.target.value.replace(",", ".")) || 0 })} />
                  </label>
                )}
              </div>
            );
          })}
        </div>

        <label className="text-xs text-slate-500 block mb-3">Raison (facultatif)
          <input className="input mt-1" placeholder="ex. invendu, défaut, erreur de livraison…" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {erreur && <p className="text-xs text-red-400 mb-3">{erreur}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button onClick={valider} disabled={envoi || !choisies.length} className="btn-primary disabled:opacity-50">
            {envoi ? "…" : `Valider le retour${montant ? ` (${montant.toFixed(0)} MAD)` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
