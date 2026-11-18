"use client";
// Banque (nouveauté n° 8, BIBLE §8.41) : solde du compte et mouvements. Les chèques encaissés / débités, les virements
// des clients et les dépenses payées par banque s'ajoutent tout seuls ; le reste (dépôt d'espèces, retrait, frais) à la main.
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { TYPES_BANQUE, libelleBanque, mouvementsBanque, noterBanque } from "@/lib/banque";
import type { BanqueMouvement } from "@/types/database";
import { Landmark, Plus, X, Trash2 } from "lucide-react";

const mad = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("fr-FR")} MAD`;

export default function BanquePage() {
  const [mvts, setMvts] = useState<BanqueMouvement[] | null>(null);
  const [ajout, setAjout] = useState<{ type: BanqueMouvement["type"]; montant: string; sens: 1 | -1; date: string; note: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const charger = () => mouvementsBanque().then(setMvts).catch(() => setMvts([]));
  useEffect(() => { charger(); }, []);

  const solde = (mvts ?? []).reduce((s, m) => s + Number(m.montant), 0);
  const mois = new Date().toISOString().slice(0, 7);
  const entreesMois = (mvts ?? []).filter((m) => m.date.startsWith(mois) && m.montant > 0).reduce((s, m) => s + Number(m.montant), 0);
  const sortiesMois = (mvts ?? []).filter((m) => m.date.startsWith(mois) && m.montant < 0).reduce((s, m) => s - Number(m.montant), 0);
  const vide = mvts !== null && mvts.length === 0;

  async function enregistrer() {
    if (!ajout) return;
    const n = Number(ajout.montant.replace(",", "."));
    if (!(n > 0)) { setMsg("Écris le montant."); return; }
    await noterBanque({ date: ajout.date, montant: ajout.sens * n, type: ajout.type, note: ajout.note.trim() || null });
    setAjout(null); setMsg("Mouvement ajouté ✓"); charger();
  }
  async function supprimer(m: BanqueMouvement) {
    if (m.lien) { setMsg("Ce mouvement vient d'un chèque, d'un virement ou d'une dépense : corrige-le à sa source (Échéancier, Fournisseurs ou Caisse)."); return; }
    if (!confirm(`Supprimer ce mouvement (${mad(Number(m.montant))}) ?`)) return;
    await supabase.from("banque_mouvements").delete().eq("id", m.id); charger();
  }
  const nouveau = (type: BanqueMouvement["type"]) => {
    const t = TYPES_BANQUE.find((x) => x.cle === type)!;
    setAjout({ type, montant: "", sens: t.sens, date: new Date().toISOString().slice(0, 10), note: "" });
  };

  return (
    <div>
      <Header title="bank" />
      {msg && <div className="card p-3 mb-4 text-sm text-slate-200 flex justify-between gap-2">{msg}<button onClick={() => setMsg(null)}><X size={14} /></button></div>}

      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm"><Landmark size={16} className="text-amber-400" /> Solde du compte (d&apos;après l&apos;appli)</div>
        <div className={`text-3xl font-bold mt-1 ${solde < 0 ? "text-red-400" : "text-amber-300"}`}>{mad(solde)}</div>
        <div className="text-xs text-slate-500 mt-1">Ce mois : <span className="text-emerald-400">+{mad(entreesMois)}</span> · <span className="text-red-400">−{mad(sortiesMois)}</span></div>
        {vide && <p className="text-xs text-amber-300 mt-3">Commence par le <b>solde de départ</b> : regarde ton relevé et ajoute-le en « Autre » (ex. « Solde au 18/11 »).</p>}
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => nouveau("depot")} className="btn-primary flex items-center gap-1.5 text-sm"><Plus size={14} /> Dépôt d&apos;espèces</button>
          <button onClick={() => nouveau("retrait")} className="btn-secondary text-sm">Retrait</button>
          <button onClick={() => nouveau("virement_emis")} className="btn-secondary text-sm">Virement envoyé</button>
          <button onClick={() => nouveau("frais")} className="btn-secondary text-sm">Frais</button>
          <button onClick={() => nouveau("autre")} className="btn-secondary text-sm">Autre / solde de départ</button>
        </div>
        <p className="text-[11px] text-slate-500 mt-3">Tout seuls : chèque client encaissé (Échéancier ✓), chèque donné débité, virement d&apos;un client, dépense payée par banque ou chèque. Un dépôt d&apos;espèces sort de la caisse du jour, un retrait y entre.</p>
      </div>

      {!mvts ? <p className="text-sm text-slate-400">Chargement…</p> : mvts.length > 0 && (
        <div className="card divide-y divide-slate-800">
          {mvts.map((m) => (
            <div key={m.id} className="grid grid-cols-[4.5rem_1fr_auto_auto] gap-2 px-3 py-2 items-center">
              <span className="text-[11px] text-slate-500">{m.date.slice(8, 10)}/{m.date.slice(5, 7)}/{m.date.slice(2, 4)}</span>
              <span className="min-w-0">
                <span className="block text-sm text-slate-200 truncate">{m.note || libelleBanque(m.type)}</span>
                <span className="block text-[11px] text-slate-500">{libelleBanque(m.type)}{m.lien ? " · auto" : ""}</span>
              </span>
              <span className={`font-semibold text-sm ${m.montant < 0 ? "text-red-400" : "text-emerald-400"}`}>{m.montant > 0 ? "+" : ""}{mad(Number(m.montant))}</span>
              <button onClick={() => supprimer(m)} className="text-slate-600 hover:text-red-400" title="Supprimer"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {ajout && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
          <div className="card p-5 w-full max-w-md my-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-100">{libelleBanque(ajout.type)}</h3>
              <button onClick={() => setAjout(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            {ajout.type === "autre" && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button onClick={() => setAjout({ ...ajout, sens: 1 })} className={`rounded-lg py-2 text-sm ${ajout.sens === 1 ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500" : "btn-secondary"}`}>+ Entrée</button>
                <button onClick={() => setAjout({ ...ajout, sens: -1 })} className={`rounded-lg py-2 text-sm ${ajout.sens === -1 ? "bg-red-500/20 text-red-300 ring-1 ring-red-500" : "btn-secondary"}`}>− Sortie</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="text-xs text-slate-500">Montant (MAD)<input type="number" inputMode="decimal" autoFocus className="input mt-1 text-lg" value={ajout.montant} onChange={(e) => setAjout({ ...ajout, montant: e.target.value })} /></label>
              <label className="text-xs text-slate-500">Date<input type="date" className="input mt-1" value={ajout.date} onChange={(e) => setAjout({ ...ajout, date: e.target.value })} /></label>
            </div>
            <label className="text-xs text-slate-500 block mb-4">Note<input className="input mt-1" placeholder={ajout.type === "autre" ? "ex. Solde au 18/11" : ""} value={ajout.note} onChange={(e) => setAjout({ ...ajout, note: e.target.value })} /></label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAjout(null)} className="btn-secondary">Annuler</button>
              <button onClick={enregistrer} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
