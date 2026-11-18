"use client";
// Équipe (nouveauté n° 8, BIBLE §8.41) : qui a accès à l'appli et avec quel rôle (patron / vendeur), les commerciaux,
// leurs ventes du mois et leur commission. Les comptes passent par les fonctions de supabase/equipe.sql (patron seulement).
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import type { Commercial } from "@/types/database";
import { UserPlus, Users, X, Briefcase } from "lucide-react";

type Membre = { email: string; nom: string | null; role: "admin" | "vendeur"; commercial_id: string | null; ajoute_le: string };
const mad = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} MAD`;

export default function EquipePage() {
  const [membres, setMembres] = useState<Membre[] | null>(null);
  const [sqlManquant, setSqlManquant] = useState(false);
  const [coms, setComs] = useState<Commercial[]>([]);
  const [ventesCom, setVentesCom] = useState<Map<string, { ca: number; nb: number }>>(new Map());
  const [form, setForm] = useState<{ email: string; nom: string; role: "admin" | "vendeur"; commercial_id: string } | null>(null);
  const [formCom, setFormCom] = useState<{ id?: string; nom: string; telephone: string; commission_pct: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function charger() {
    const { data, error } = await supabase.rpc("liste_equipe");
    if (error) { setSqlManquant(/liste_equipe|schema cache|Could not find|PGRST202/i.test(error.message + (error.code ?? ""))); setMembres([]); if (!/PGRST202|schema cache|Could not find/i.test(error.message + (error.code ?? ""))) setMsg(error.message); }
    else { setSqlManquant(false); setMembres((data ?? []) as Membre[]); }
    const { data: c } = await supabase.from("commerciaux").select("*").order("nom");
    setComs((c ?? []) as Commercial[]);
    const debut = new Date().toISOString().slice(0, 8) + "01";
    const { data: s } = await supabase.from("sales").select("id, commercial_id, total").gte("date", debut).not("commercial_id", "is", null).order("id").range(0, 9999);
    const m = new Map<string, { ca: number; nb: number }>();
    for (const v of (s ?? []) as { commercial_id: string; total: number }[]) { const g = m.get(v.commercial_id) ?? { ca: 0, nb: 0 }; g.ca += Number(v.total); g.nb++; m.set(v.commercial_id, g); }
    setVentesCom(m);
  }
  useEffect(() => { charger(); }, []);

  async function enregistrerMembre() {
    if (!form) return;
    const { error } = await supabase.rpc("enregistrer_membre", { p_email: form.email, p_nom: form.nom, p_role: form.role, p_commercial: form.commercial_id || null });
    if (error) { setMsg("Erreur : " + error.message); return; }
    setMsg(`${form.email} : accès enregistré (${form.role === "admin" ? "patron" : "vendeur"}). S'il n'a pas encore de compte, crée-le dans Supabase (voir l'aide en bas).`);
    setForm(null); charger();
  }
  async function retirer(m: Membre) {
    if (!confirm(`Retirer l'accès de ${m.email} ? Il ne pourra plus ouvrir l'appli.`)) return;
    const { error } = await supabase.rpc("retirer_membre", { p_email: m.email });
    setMsg(error ? "Erreur : " + error.message : `${m.email} n'a plus accès.`); charger();
  }
  async function enregistrerCom() {
    if (!formCom || !formCom.nom.trim()) { setMsg("Écris le nom du commercial."); return; }
    const ligne = { nom: formCom.nom.trim(), telephone: formCom.telephone.trim() || null, commission_pct: Number(formCom.commission_pct.replace(",", ".")) || 0 };
    const { error } = formCom.id ? await supabase.from("commerciaux").update(ligne).eq("id", formCom.id) : await supabase.from("commerciaux").insert(ligne);
    if (error) { setMsg("Erreur : " + error.message); return; }
    setFormCom(null); charger();
  }
  async function basculerActif(c: Commercial) {
    await supabase.from("commerciaux").update({ actif: !c.actif }).eq("id", c.id); charger();
  }

  return (
    <div>
      <Header title="team" />
      {msg && <div className="card p-3 mb-4 text-sm text-slate-200 flex justify-between gap-2">{msg}<button onClick={() => setMsg(null)}><X size={14} /></button></div>}

      {/* Comptes */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2"><Users size={16} className="text-amber-400" /> Qui a accès à l&apos;appli</h3>
          {!sqlManquant && <button onClick={() => setForm({ email: "", nom: "", role: "vendeur", commercial_id: "" })} className="btn-primary text-xs flex items-center gap-1"><UserPlus size={13} /> Ajouter</button>}
        </div>
        {sqlManquant ? (
          <p className="text-sm text-amber-300">Pour gérer l&apos;équipe ici, colle une fois <b>supabase/equipe.sql</b> dans l&apos;éditeur SQL de Supabase.</p>
        ) : !membres ? <p className="text-sm text-slate-400">Chargement…</p> : (
          <div className="divide-y divide-slate-800">
            {membres.map((m) => (
              <div key={m.email} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-100 truncate">{m.nom || m.email}</p>
                  <p className="text-[11px] text-slate-500 truncate">{m.email}{m.commercial_id ? ` · commercial : ${coms.find((c) => c.id === m.commercial_id)?.nom ?? "?"}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] rounded-full px-2 py-0.5 ${m.role === "admin" ? "bg-amber-500/15 text-amber-300" : "bg-sky-500/15 text-sky-300"}`}>{m.role === "admin" ? "👑 Patron" : "🧑‍💼 Vendeur"}</span>
                  <button onClick={() => setForm({ email: m.email, nom: m.nom ?? "", role: m.role, commercial_id: m.commercial_id ?? "" })} className="btn-secondary text-xs px-2 py-1">Modifier</button>
                  <button onClick={() => retirer(m)} className="text-xs text-red-300 hover:text-red-200">Retirer</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <details className="mt-3 text-xs text-slate-500">
          <summary className="cursor-pointer text-slate-400">Comment donner un compte à un vendeur ?</summary>
          <ol className="list-decimal ms-5 mt-2 space-y-1">
            <li>Ici : <b>Ajouter</b> → son e-mail, son nom, rôle <b>Vendeur</b> (et son commercial s&apos;il en est un).</li>
            <li>Dans Supabase → <b>Authentication → Users → Add user</b> : le même e-mail + un mot de passe (coche « Auto confirm »). Donne-lui le mot de passe de vive voix.</li>
            <li>Il ouvre l&apos;appli et se connecte. <b>Vendeur</b> = il vend, encaisse, cherche, fait des factures et des tournées, mais ne voit ni les prix d&apos;achat, ni les bénéfices, ni la caisse, ni les fournisseurs, ni la banque.</li>
          </ol>
        </details>
      </div>

      {/* Commerciaux */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2"><Briefcase size={16} className="text-amber-400" /> Commerciaux (ventes du mois)</h3>
          <button onClick={() => setFormCom({ nom: "", telephone: "", commission_pct: "0" })} className="btn-secondary text-xs">+ Commercial</button>
        </div>
        {coms.length === 0 ? <p className="text-xs text-slate-500">Aucun commercial. Un commercial = quelqu&apos;un qui vend pour toi et touche une commission (% des ventes). En Vente, on choisit le commercial du bon (le sien tout seul s&apos;il a un compte lié).</p> : (
          <div className="divide-y divide-slate-800">
            {coms.map((c) => {
              const v = ventesCom.get(c.id) ?? { ca: 0, nb: 0 };
              return (
                <div key={c.id} className={`flex flex-wrap items-center justify-between gap-2 py-2 ${c.actif ? "" : "opacity-50"}`}>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-100">{c.nom} <span className="text-[11px] text-slate-500">{c.telephone ?? ""} · {Number(c.commission_pct)} %</span></p>
                    <p className="text-[11px] text-slate-400">{v.nb} bon(s) · {mad(v.ca)} · commission <b className="text-amber-300">{mad(v.ca * Number(c.commission_pct) / 100)}</b></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFormCom({ id: c.id, nom: c.nom, telephone: c.telephone ?? "", commission_pct: String(c.commission_pct) })} className="btn-secondary text-xs px-2 py-1">Modifier</button>
                    <button onClick={() => basculerActif(c)} className="text-xs text-slate-400 hover:text-slate-200">{c.actif ? "Désactiver" : "Réactiver"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {form && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
          <div className="card p-5 w-full max-w-md my-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-100">Accès à l&apos;appli</h3>
              <button onClick={() => setForm(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-1 gap-3 mb-4">
              <label className="text-xs text-slate-500">E-mail<input type="email" className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label className="text-xs text-slate-500">Nom<input className="input mt-1" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setForm({ ...form, role: "vendeur" })} className={`rounded-lg py-2 text-sm ${form.role === "vendeur" ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500" : "btn-secondary"}`}>🧑‍💼 Vendeur</button>
                <button onClick={() => setForm({ ...form, role: "admin" })} className={`rounded-lg py-2 text-sm ${form.role === "admin" ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500" : "btn-secondary"}`}>👑 Patron (tout)</button>
              </div>
              <label className="text-xs text-slate-500">Commercial lié (facultatif)
                <select className="input mt-1" value={form.commercial_id} onChange={(e) => setForm({ ...form, commercial_id: e.target.value })}>
                  <option value="">—</option>
                  {coms.filter((c) => c.actif).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setForm(null)} className="btn-secondary">Annuler</button>
              <button onClick={enregistrerMembre} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {formCom && (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 flex items-start justify-center z-[60] p-4">
          <div className="card p-5 w-full max-w-md my-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-100">{formCom.id ? "Modifier le commercial" : "Nouveau commercial"}</h3>
              <button onClick={() => setFormCom(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="text-xs text-slate-500 col-span-2">Nom<input className="input mt-1" value={formCom.nom} onChange={(e) => setFormCom({ ...formCom, nom: e.target.value })} /></label>
              <label className="text-xs text-slate-500">Téléphone<input className="input mt-1" value={formCom.telephone} onChange={(e) => setFormCom({ ...formCom, telephone: e.target.value })} /></label>
              <label className="text-xs text-slate-500">Commission (% des ventes)<input type="number" className="input mt-1" value={formCom.commission_pct} onChange={(e) => setFormCom({ ...formCom, commission_pct: e.target.value })} /></label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setFormCom(null)} className="btn-secondary">Annuler</button>
              <button onClick={enregistrerCom} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
