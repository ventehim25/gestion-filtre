"use client";
// Caisse du jour + dépenses (nouveauté n° 1, BIBLE §8.41) : « combien je dois avoir en poche ce soir » et le vrai bénéfice.
// Entrées = argent reçu des clients en espèces (noté à la vente et à chaque encaissement) ; sorties = dépenses en espèces
// et argent donné aux fournisseurs en espèces ; le soir : « j'ai compté … » → écart.
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { CATEGORIES_DEPENSE, calculerCaisse, chargerJour, depensesEntre, libelleDepense, type JourCaisse } from "@/lib/caisse";
import { ChevronLeft, ChevronRight, Plus, X, Wallet, Trash2, Lock } from "lucide-react";

const jourISO = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const money = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("fr-FR")} MAD`;
const decaler = (iso: string, n: number) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return jourISO(d); };

export default function CaissePage() {
  const [date, setDate] = useState(jourISO(new Date()));
  const [jour, setJour] = useState<JourCaisse | null>(null);
  const [mois, setMois] = useState<{ categorie: string; total: number }[]>([]);
  const [ajout, setAjout] = useState(false);
  const [dep, setDep] = useState({ montant: "", categorie: "essence", mode: "especes" as "especes" | "banque" | "cheque", note: "" });
  const [compte, setCompte] = useState("");
  const [fond, setFond] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  async function charger(d = date) {
    const j = await chargerJour(d);
    setJour(j);
    setFond(String(j.journee?.fond_debut ?? j.fondPropose));
    setCompte(j.journee?.compte_fin != null ? String(j.journee.compte_fin) : "");
    const debut = d.slice(0, 8) + "01";
    const deps = await depensesEntre(debut, decaler(decaler(debut, 32).slice(0, 8) + "01", -1));
    const parCat = new Map<string, number>();
    for (const x of deps) parCat.set(x.categorie, (parCat.get(x.categorie) ?? 0) + Number(x.montant));
    setMois([...parCat.entries()].map(([categorie, total]) => ({ categorie, total })).sort((a, b) => b.total - a.total));
  }
  useEffect(() => { charger(date); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const c = useMemo(() => (jour ? calculerCaisse({ ...jour, journee: jour.journee ? { ...jour.journee, fond_debut: Number(fond) || 0 } : { date, fond_debut: Number(fond) || 0, compte_fin: null, ecart: null, note: null, cloture_le: null } }) : null), [jour, fond, date]);
  const totalMois = mois.reduce((s, m) => s + m.total, 0);

  async function ajouterDepense() {
    const montant = Number(dep.montant.replace(",", "."));
    if (!(montant > 0)) { setMsg("Écris le montant de la dépense."); return; }
    const { error } = await supabase.from("depenses").insert({ date, montant, categorie: dep.categorie, mode: dep.mode, note: dep.note.trim() || null });
    if (error) { setMsg(error.code === "PGRST205" ? "Colle d'abord supabase/gestion_magasin.sql dans Supabase." : error.message); return; }
    setAjout(false); setDep({ montant: "", categorie: dep.categorie, mode: "especes", note: "" }); setMsg("Dépense ajoutée."); charger();
  }
  async function supprimerDepense(id: string) {
    if (!confirm("Supprimer cette dépense ?")) return;
    await supabase.from("depenses").delete().eq("id", id); charger();
  }
  async function cloturer() {
    if (!c) return;
    const compteFin = Number(compte.replace(",", "."));
    if (!(compteFin >= 0) || compte.trim() === "") { setMsg("Écris l'argent que tu as compté."); return; }
    const { error } = await supabase.from("caisse_journees").upsert({ date, fond_debut: Number(fond) || 0, compte_fin: compteFin, ecart: Math.round((compteFin - c.theorique) * 100) / 100, cloture_le: new Date().toISOString() });
    if (error) { setMsg(error.message); return; }
    setMsg("Journée clôturée : demain, la caisse repartira de ce montant."); charger();
  }

  return (
    <div>
      <Header title="cash" />
      {/* Jour */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setDate(decaler(date, -1))} className="btn-secondary p-2" aria-label="Jour précédent"><ChevronLeft size={16} /></button>
        <input type="date" className="input max-w-[11rem]" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <button onClick={() => setDate(decaler(date, 1))} className="btn-secondary p-2" aria-label="Jour suivant"><ChevronRight size={16} /></button>
        {date !== jourISO(new Date()) && <button onClick={() => setDate(jourISO(new Date()))} className="text-xs text-blue-400 underline">Aujourd&apos;hui</button>}
      </div>

      {jour?.tablesAbsentes && (
        <div className="card p-4 mb-4 text-sm text-amber-300">La caisse n&apos;est pas encore activée : colle <b>supabase/gestion_magasin.sql</b> dans Supabase (une seule fois).</div>
      )}
      {msg && <div className="card p-3 mb-4 text-sm text-slate-200 flex justify-between gap-2">{msg}<button onClick={() => setMsg(null)}><X size={14} /></button></div>}

      {c && (
        <>
          {/* Le chiffre du soir */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm"><Wallet size={16} className="text-amber-400" /> Tu dois avoir en caisse (espèces)</div>
            <div className="text-3xl font-bold text-amber-300 mt-1">{money(c.theorique)}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-sm">
              <label className="text-xs text-slate-500">Fond de départ
                <input type="number" className="input mt-1" value={fond} onChange={(e) => setFond(e.target.value)} />
              </label>
              <div><div className="text-xs text-slate-500">+ Espèces reçues</div><div className="font-semibold text-green-400 mt-2">{money(c.entrees)}</div></div>
              <div><div className="text-xs text-slate-500">− Dépenses (espèces)</div><div className="font-semibold text-red-400 mt-2">{money(c.depensesEspeces)}</div></div>
              <div><div className="text-xs text-slate-500">− Donné aux fournisseurs</div><div className="font-semibold text-red-400 mt-2">{money(c.avancesEspeces)}</div></div>
            </div>
            {c.autresEntrees > 0 && <p className="text-xs text-slate-400 mt-3">+ {money(c.autresEntrees)} reçus en chèque / virement (pas dans la caisse : voir l&apos;échéancier).</p>}
            {/* Clôture */}
            <div className="mt-4 pt-4 border-t border-slate-700/60 flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-500 flex-1 min-w-[10rem]">Le soir : j&apos;ai compté (MAD)
                <input type="number" className="input mt-1" value={compte} onChange={(e) => setCompte(e.target.value)} placeholder="ex. 1250" />
              </label>
              <button onClick={cloturer} className="btn-primary flex items-center gap-1.5"><Lock size={14} /> Clôturer la journée</button>
            </div>
            {jour?.journee?.cloture_le && c.ecart != null && (
              <p className={`text-sm mt-2 ${Math.abs(c.ecart) < 1 ? "text-green-400" : c.ecart < 0 ? "text-red-400" : "text-amber-300"}`}>
                {Math.abs(c.ecart) < 1 ? "✓ La caisse est juste." : c.ecart < 0 ? `⚠ Il manque ${money(-c.ecart)}.` : `⚠ Il y a ${money(c.ecart)} de trop.`}
              </p>
            )}
          </div>

          {/* Entrées */}
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-slate-200 mb-2">Argent reçu des clients ({jour?.paiements.length ?? 0})</h3>
            {(jour?.paiements.length ?? 0) === 0 && <p className="text-xs text-slate-500">Rien ce jour-là. (Les paiements sont notés depuis le 18/11/2026 : à la vente et à chaque encaissement.)</p>}
            {jour?.paiements.map((p) => (
              <div key={p.id} className="flex justify-between gap-2 text-sm py-1 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-300">{p.client_nom ?? "Client"} <span className="text-xs text-slate-500">· {p.mode === "especes" ? "espèces" : p.mode === "cheque" ? `chèque${p.numero_cheque ? " n° " + p.numero_cheque : ""}` : p.mode}{p.cle === "vente" ? " · à la vente" : ""}</span></span>
                <span className={Number(p.montant) < 0 ? "text-red-400" : "text-green-400"}>{money(Number(p.montant))}</span>
              </div>
            ))}
          </div>

          {/* Sorties */}
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-200">Dépenses ({jour?.depenses.length ?? 0})</h3>
              <button onClick={() => setAjout(true)} className="btn-primary text-sm flex items-center gap-1"><Plus size={14} /> Dépense</button>
            </div>
            {(jour?.depenses.length ?? 0) === 0 && <p className="text-xs text-slate-500">Aucune dépense ce jour-là.</p>}
            {jour?.depenses.map((d) => (
              <div key={d.id} className="flex justify-between gap-2 text-sm py-1 border-b border-slate-800/60 last:border-0">
                <span className="text-slate-300">{libelleDepense(d.categorie).icone} {libelleDepense(d.categorie).libelle}{d.note ? <span className="text-xs text-slate-500"> · {d.note}</span> : null}{d.mode !== "especes" ? <span className="text-xs text-slate-500"> · {d.mode}</span> : null}</span>
                <span className="flex items-center gap-2 text-red-400">{money(Number(d.montant))}<button onClick={() => supprimerDepense(d.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={13} /></button></span>
              </div>
            ))}
            {(jour?.avances.length ?? 0) > 0 && (
              <div className="mt-3 pt-2 border-t border-slate-800/60">
                <div className="text-xs text-slate-500 mb-1">Donné aux fournisseurs ce jour-là</div>
                {jour?.avances.map((a) => (
                  <div key={a.id} className="flex justify-between text-sm py-0.5"><span className="text-slate-400">{a.mode === "cheque" ? "🧾 chèque (pas dans la caisse)" : "💵 espèces"}{a.personne ? ` · ${a.personne}` : ""}</span><span className="text-red-400">{money(Number(a.montant))}</span></div>
                ))}
              </div>
            )}
          </div>

          {/* Mois */}
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-slate-200 mb-2">Dépenses du mois : {money(totalMois)}</h3>
            {mois.map((m) => (
              <div key={m.categorie} className="flex items-center gap-2 text-sm py-0.5">
                <span className="w-40 text-slate-300 truncate">{libelleDepense(m.categorie).icone} {libelleDepense(m.categorie).libelle}</span>
                <div className="flex-1 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-red-500/70" style={{ width: `${totalMois ? (m.total / totalMois) * 100 : 0}%` }} /></div>
                <span className="w-24 text-end text-slate-300">{money(m.total)}</span>
              </div>
            ))}
            <p className="text-xs text-slate-500 mt-2">Ton bénéfice net du mois (ventes − achats − dépenses) est dans Mon activité.</p>
          </div>
        </>
      )}

      {ajout && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-50 p-4">
          <div className="card p-5 w-full max-w-sm my-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-100">Nouvelle dépense · {date}</h3>
              <button onClick={() => setAjout(false)} className="text-slate-400"><X size={18} /></button>
            </div>
            <label className="text-xs text-slate-500">Montant (MAD)
              <input type="number" inputMode="decimal" autoFocus className="input mt-1 text-lg" value={dep.montant} onChange={(e) => setDep({ ...dep, montant: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {CATEGORIES_DEPENSE.map((k) => (
                <button key={k.cle} type="button" onClick={() => setDep({ ...dep, categorie: k.cle })}
                  className={`rounded-lg py-2 text-xs font-medium ${dep.categorie === k.cle ? "bg-amber-500 text-black" : "btn-secondary"}`}>{k.icone} {k.libelle}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-3">
              {([["especes", "💵 Espèces"], ["banque", "🏦 Banque"], ["cheque", "🧾 Chèque"]] as const).map(([m, l]) => (
                <button key={m} type="button" onClick={() => setDep({ ...dep, mode: m })}
                  className={`rounded-lg py-1.5 text-xs ${dep.mode === m ? "bg-slate-200 text-black" : "btn-secondary"}`}>{l}</button>
              ))}
            </div>
            <label className="text-xs text-slate-500 block mt-3">Note (facultatif)
              <input className="input mt-1" value={dep.note} onChange={(e) => setDep({ ...dep, note: e.target.value })} placeholder="ex. plein Casablanca" />
            </label>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setAjout(false)} className="btn-secondary">Annuler</button>
              <button onClick={ajouterDepense} className="btn-primary">Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
