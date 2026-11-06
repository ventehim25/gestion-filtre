"use client";
export const dynamic = "force-dynamic";
// Résultats des robots de prospection (OSM + Google Places) — table `prospects`.
// Nombre collecté par jour, liste classée par intérêt probable /10 (scripts/prospect_score.mjs),
// fiche dépliable avec toutes les infos + suivi (à contacter / contacté / intéressé / client / refus).
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/whatsapp";
import { ChevronDown, ChevronUp, Phone, MessageCircle, Mail, Globe, MapPin, ExternalLink, RefreshCw, UserPlus } from "lucide-react";

type Prospect = {
  id: string; source: string; segment: string; nom: string | null; ville: string | null; adresse: string | null;
  telephone: string | null; whatsapp: string | null; email: string | null; email_type: string | null; site: string | null;
  categorie: string | null; note_google: number | null; nb_avis: number | null; horaires: string | null;
  maps_url: string | null; source_url: string | null; score: number; score_detail: string | null;
  statut_prospection: string; premiere_vue: string; derniere_vue: string; lat: number | null; lon: number | null;
};

const PAGE = 50;
const SEGMENTS = [
  "Magasin pièces auto / sous-grossiste", "Garage / centre de vidange", "Flotte livraison / logistique / transport",
  "Location de voitures", "Auto-école", "Poids lourds (garage/vente camion)", "Pneus", "Station-service", "Lavage auto",
];
const STATUTS: Record<string, string> = {
  a_contacter: "À contacter", contacte: "Contacté", interesse: "Intéressé", client: "Client", refus: "Ne plus contacter",
};
const MSG = "Salam 👋 Ici FiltroPro, grossiste en filtres (Filtron, Mann, Wix, Bosch) et huiles moteur, livraison partout au Maroc. Je peux vous envoyer notre catalogue avec les prix pros ?";

const scoreColor = (s: number) =>
  s >= 7 ? "bg-green-500/15 text-green-400 border-green-500/30"
  : s >= 5 ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
  : "bg-slate-500/15 text-slate-400 border-slate-500/30";
const fmtJour = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

export default function ProspectsPage() {
  const [list, setList] = useState<Prospect[]>([]);
  const [total, setTotal] = useState(0);
  const [parJour, setParJour] = useState<{ jour: string; nb: number }[]>([]);
  const [stats, setStats] = useState({ all: 0, today: 0, tel: 0, top: 0 });
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("");
  const [statut, setStatut] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [telOnly, setTelOnly] = useState(true);

  // Filtres appliqués côté Supabase (la table peut dépasser 1000 lignes)
  function filtered(sel: string, opts?: { count?: "exact"; head?: boolean }) {
    let query = supabase.from("prospects").select(sel, opts);
    if (segment) query = query.eq("segment", segment);
    if (statut) query = query.eq("statut_prospection", statut);
    if (minScore) query = query.gte("score", minScore);
    if (telOnly) query = query.not("telephone", "is", null);
    const s = q.trim().replace(/[%,()]/g, " ");
    if (s) query = query.or(`nom.ilike.%${s}%,ville.ilike.%${s}%,telephone.ilike.%${s}%,adresse.ilike.%${s}%`);
    return query;
  }

  async function loadPage(from: number) {
    const { data, error, count } = await filtered("*", { count: "exact" })
      .order("score", { ascending: false }).order("nom").range(from, from + PAGE - 1);
    if (error) { setMissing(/schema cache|does not exist/i.test(error.message)); return; }
    setTotal(count ?? 0);
    setList((prev) => (from === 0 ? (data as unknown as Prospect[]) : [...prev, ...(data as unknown as Prospect[])]));
  }

  async function loadStats() {
    const today = new Date().toISOString().slice(0, 10);
    const head = { count: "exact" as const, head: true };
    const [all, td, tel, top, jours] = await Promise.all([
      supabase.from("prospects").select("id", head),
      supabase.from("prospects").select("id", head).eq("premiere_vue", today),
      supabase.from("prospects").select("id", head).not("telephone", "is", null),
      supabase.from("prospects").select("id", head).gte("score", 7),
      supabase.from("prospects_par_jour").select("jour, nb").order("jour", { ascending: false }).limit(60),
    ]);
    setStats({ all: all.count ?? 0, today: td.count ?? 0, tel: tel.count ?? 0, top: top.count ?? 0 });
    const byDay = new Map<string, number>();
    for (const r of (jours.data ?? []) as { jour: string; nb: number }[]) byDay.set(r.jour, (byDay.get(r.jour) ?? 0) + r.nb);
    setParJour([...byDay].map(([jour, nb]) => ({ jour, nb })).slice(0, 14));
  }

  async function reload() {
    setLoading(true);
    setOpen(null);
    await Promise.all([loadPage(0), loadStats()]);
    setLoading(false);
  }
  useEffect(() => { const t = setTimeout(reload, 250); return () => clearTimeout(t); }, [q, segment, statut, minScore, telOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setSuivi(p: Prospect, v: string) {
    setList((prev) => prev.map((x) => (x.id === p.id ? { ...x, statut_prospection: v } : x)));
    await supabase.from("prospects").update({ statut_prospection: v }).eq("id", p.id);
  }

  // Prospect devenu client : fiche client pré-remplie (téléphone, ville, adresse, GPS) en un tap
  const [clientMsg, setClientMsg] = useState<Record<string, string>>({});
  async function creerClient(p: Prospect) {
    const tel = (p.telephone ?? "").split("/")[0].trim();
    const fin = tel.replace(/\D/g, "").slice(-9);
    if (fin.length === 9) {
      const { data } = await supabase.from("clients").select("id, nom, telephone").ilike("telephone", `%${fin.slice(-4)}%`).limit(50);
      const dup = (data ?? []).find((c) => (c.telephone ?? "").replace(/\D/g, "").endsWith(fin));
      if (dup) {
        setClientMsg((m) => ({ ...m, [p.id]: `Déjà client : « ${dup.nom} » a ce numéro.` }));
        await setSuivi(p, "client");
        return;
      }
    }
    const type = p.segment.startsWith("Magasin pièces") ? "gros" : /Garage|Poids lourds|Pneus/.test(p.segment) ? "garage" : "comptoir";
    const { error } = await supabase.from("clients").insert({
      nom: (p.nom ?? "").split(" · ")[0] || "(sans nom)", telephone: tel || null, ville: p.ville ?? "",
      adresse: p.adresse, notes: `Venu de la prospection (${p.segment}).`, solde_du: 0, type,
      latitude: p.lat, longitude: p.lon,
    });
    if (error) { setClientMsg((m) => ({ ...m, [p.id]: "Erreur : " + error.message })); return; }
    await setSuivi(p, "client");
    setClientMsg((m) => ({ ...m, [p.id]: "✓ Fiche client créée (voir Clients)." }));
  }

  function whatsapp(p: Prospect) {
    sendWhatsApp((p.whatsapp ?? "").replace(/\D/g, ""), MSG); // whatsapp = lien wa.me/212… (mobiles uniquement)
    if (p.statut_prospection === "a_contacter") setSuivi(p, "contacte");
  }

  return (
    <div>
      <Header title="prospects" action={
        <button onClick={reload} className="btn-secondary flex items-center gap-2"><RefreshCw size={15} /> <span className="hidden sm:inline">Rafraîchir</span></button>
      } />

      {missing ? (
        <div className="card p-6 text-sm text-slate-400">
          La table <b>prospects</b> n&apos;existe pas encore : colle <code>supabase/prospects.sql</code> dans l&apos;éditeur SQL Supabase, puis lance un robot.
        </div>
      ) : (<>
        {/* Chiffres */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            ["Prospects", stats.all], ["Nouveaux aujourd'hui", stats.today],
            ["Avec téléphone", stats.tel], ["Intérêt ≥ 7/10", stats.top],
          ].map(([label, n]) => (
            <div key={label as string} className="card p-4">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="text-2xl font-bold text-slate-100">{(n as number).toLocaleString("fr-FR")}</div>
            </div>
          ))}
        </div>

        {/* Collectés par jour */}
        <div className="card p-4 mb-4">
          <div className="text-sm font-semibold text-slate-300 mb-2">Collectés par jour</div>
          {parJour.length === 0 ? <p className="text-xs text-slate-500">Aucun passage de robot pour l&apos;instant.</p> : (
            <div className="flex flex-wrap gap-2">
              {parJour.map((d) => (
                <div key={d.jour} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs">
                  <span className="text-slate-500">{fmtJour(d.jour)}</span>{" "}
                  <span className="font-semibold text-amber-400">+{d.nb.toLocaleString("fr-FR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filtres (grille avec libellés : .input est w-full) */}
        <div className="card p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="col-span-2 md:col-span-1 text-xs text-slate-500">Recherche
            <input className="input mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, ville, tél…" />
          </label>
          <label className="text-xs text-slate-500">Segment
            <select className="input mt-1" value={segment} onChange={(e) => setSegment(e.target.value)}>
              <option value="">Tous</option>
              {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">Suivi
            <select className="input mt-1" value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="">Tous</option>
              {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500">Intérêt minimum
            <select className="input mt-1" value={minScore} onChange={(e) => setMinScore(+e.target.value)}>
              {[0, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n ? `≥ ${n}/10` : "Tous"}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-500 flex items-end gap-2 pb-2">
            <input type="checkbox" checked={telOnly} onChange={(e) => setTelOnly(e.target.checked)} /> Avec téléphone
          </label>
        </div>

        <p className="text-xs text-slate-500 mb-2">{total.toLocaleString("fr-FR")} résultat(s) · classés par intérêt probable</p>

        {loading ? <p className="text-slate-400 p-6 text-center">Chargement…</p> : (
          <div className="space-y-2">
            {list.map((p) => {
              const isOpen = open === p.id;
              return (
                <div key={p.id} className="card">
                  <button onClick={() => setOpen(isOpen ? null : p.id)} className="w-full p-3 flex items-center gap-3 text-start">
                    <span className={`shrink-0 w-12 text-center rounded-lg border py-1 text-sm font-bold ${scoreColor(p.score)}`}>{p.score}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-100 truncate">{p.nom || "(sans nom)"}</div>
                      <div className="text-xs text-slate-500 truncate">{p.segment} · {p.ville || "?"}{p.telephone && ` · ${p.telephone}`}</div>
                    </div>
                    {p.statut_prospection !== "a_contacter" && <span className="badge-pending hidden sm:inline">{STATUTS[p.statut_prospection]}</span>}
                    {isOpen ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-800 p-4 space-y-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {p.whatsapp && <button onClick={() => whatsapp(p)} className="btn-primary flex items-center gap-2"><MessageCircle size={15} /> WhatsApp</button>}
                        {p.telephone && <a href={`tel:${p.telephone.split("/")[0].replace(/\s/g, "")}`} className="btn-secondary flex items-center gap-2"><Phone size={15} /> Appeler</a>}
                        {p.email && <a href={`mailto:${p.email}`} className="btn-secondary flex items-center gap-2"><Mail size={15} /> E-mail</a>}
                        {p.maps_url && <a href={p.maps_url} target="_blank" rel="noreferrer" className="btn-secondary flex items-center gap-2"><MapPin size={15} /> Carte</a>}
                        {p.site && <a href={p.site} target="_blank" rel="noreferrer" className="btn-secondary flex items-center gap-2"><Globe size={15} /> Site</a>}
                      </div>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                        {([
                          ["Adresse", p.adresse], ["Ville", p.ville], ["Téléphone", p.telephone],
                          ["E-mail", p.email && `${p.email}${p.email_type ? ` (${p.email_type})` : ""}`],
                          ["Catégorie", p.categorie], ["Note Google", p.note_google != null ? `${p.note_google} ★ (${p.nb_avis ?? 0} avis)` : null],
                          ["Horaires", p.horaires], ["Source", p.source === "gmaps" ? "Google Maps (API)" : "OpenStreetMap"],
                          ["Collecté le", `${fmtJour(p.premiere_vue)} · vu le ${fmtJour(p.derniere_vue)}`],
                        ] as [string, string | null][]).filter(([, v]) => v).map(([k, v]) => (
                          <div key={k}><dt className="inline text-slate-500">{k} : </dt><dd className="inline text-slate-200 break-words">{v}</dd></div>
                        ))}
                      </dl>
                      {p.score_detail && <p className="text-xs text-slate-500">Note {p.score}/10 : {p.score_detail}</p>}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <label className="text-xs text-slate-500">Suivi
                          <select className="input mt-1" value={p.statut_prospection} onChange={(e) => setSuivi(p, e.target.value)}>
                            {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                        </label>
                        {!clientMsg[p.id] && (
                          <button onClick={() => creerClient(p)} className="btn-secondary flex items-center justify-center gap-2 text-xs"><UserPlus size={14} /> Devenu client : créer sa fiche</button>
                        )}
                        {p.source_url && <a href={p.source_url} target="_blank" rel="noreferrer" className="text-xs text-slate-500 flex items-center gap-1 pb-2"><ExternalLink size={12} /> Fiche source</a>}
                      </div>
                      {clientMsg[p.id] && <p className="text-xs text-amber-400">{clientMsg[p.id]}</p>}
                    </div>
                  )}
                </div>
              );
            })}
            {list.length < total && (
              <button onClick={() => loadPage(list.length)} className="btn-secondary w-full">Afficher plus ({total - list.length} restants)</button>
            )}
          </div>
        )}
      </>)}
    </div>
  );
}
