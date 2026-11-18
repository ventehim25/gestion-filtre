"use client";
// Factures et avoirs (nouveauté n° 5, BIBLE §8.41). Une facture se crée depuis Ventes (bouton « Facture » sur un bon) ;
// ici : la liste, la réimpression, l'avoir (annulation) et les informations de la société imprimées sur chaque facture.
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { loadAll } from "@/lib/pagedFetch";
import { avoirDeFacture, chargerSociete, enregistrerSociete, manquesSociete, SOCIETE_VIDE, type Societe } from "@/lib/factures";
import { ecrireFacture, ouvrirFenetre } from "@/lib/imprimerFacture";
import type { Facture } from "@/types/database";
import { Printer, Undo2, X, Building2, ChevronDown, ChevronUp } from "lucide-react";

const mad = (n: number) => `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
const CHAMPS: { k: keyof Societe; l: string; aide?: string; large?: boolean }[] = [
  { k: "nom", l: "Raison sociale" }, { k: "activite", l: "Activité" },
  { k: "adresse", l: "Adresse", large: true }, { k: "ville", l: "Ville" }, { k: "telephone", l: "Téléphone" },
  { k: "email", l: "E-mail" }, { k: "ice", l: "ICE", aide: "15 chiffres" }, { k: "rc", l: "RC (registre de commerce)" },
  { k: "if_fiscal", l: "IF (identifiant fiscal)" }, { k: "patente", l: "Patente / TP" }, { k: "cnss", l: "CNSS (facultatif)" },
  { k: "rib", l: "RIB (facultatif)", large: true }, { k: "pied", l: "Mention en bas (facultatif)", large: true, aide: "ex. Merci pour votre confiance" },
];

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[] | null>(null);
  const [soc, setSoc] = useState<Societe>(SOCIETE_VIDE);
  const [ouvertSoc, setOuvertSoc] = useState(false);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [absent, setAbsent] = useState(false);

  async function charger() {
    try {
      setFactures(await loadAll<Facture>("factures", "*", { filter: (x) => x.order("created_at", { ascending: false }) }));
    } catch (e) {
      setAbsent(/schema cache|does not exist/i.test(String((e as Error)?.message)));
      setFactures([]);
    }
  }
  useEffect(() => {
    charger();
    chargerSociete().then((s) => { setSoc(s); if (manquesSociete(s).length) setOuvertSoc(true); });
  }, []);

  const numeroDe = useMemo(() => new Map((factures ?? []).map((f) => [f.id, f.numero])), [factures]);
  const avoirDe = useMemo(() => new Map((factures ?? []).filter((f) => f.type === "avoir" && f.facture_origine).map((f) => [f.facture_origine!, f])), [factures]);
  const visibles = (factures ?? []).filter((f) => {
    const t = q.trim().toLowerCase();
    return !t || [f.numero, f.client_nom, f.client_ice].some((v) => (v ?? "").toLowerCase().includes(t));
  });
  const annee = new Date().getFullYear().toString();
  const totalAnnee = (factures ?? []).filter((f) => f.date.startsWith(annee)).reduce((s, f) => s + (f.type === "avoir" ? -1 : 1) * Number(f.total_ttc), 0);

  function imprimer(f: Facture) {
    const w = ouvrirFenetre();
    if (!w) { setMsg("Le navigateur a bloqué la fenêtre : autorise les fenêtres (pop-up) pour FiltroPro."); return; }
    ecrireFacture(w, f, soc, f.facture_origine ? numeroDe.get(f.facture_origine) : null);
  }
  async function faireAvoir(f: Facture) {
    const motif = prompt(`Avoir sur la facture ${f.numero} (${mad(f.total_ttc)}) : elle sera annulée.\n\nRaison (facultatif) :`, "");
    if (motif === null) return;
    const w = ouvrirFenetre();
    try {
      const a = await avoirDeFacture(f, motif.trim());
      if (w) ecrireFacture(w, a, soc, f.numero);
      setMsg(`Avoir ${a.numero} créé : la facture ${f.numero} est annulée.`);
      charger();
    } catch (e) {
      w?.close();
      setMsg("Erreur : " + String((e as Error)?.message ?? e));
    }
  }
  async function sauverSoc() {
    const e = await enregistrerSociete(soc);
    setMsg(e ? "Erreur : " + e : "Informations de la société enregistrées ✓ (imprimées sur chaque facture)");
    if (!e) setOuvertSoc(false);
  }
  const manques = manquesSociete(soc);

  return (
    <div>
      <Header title="invoices" />
      {absent && <div className="card p-4 mb-4 text-sm text-amber-300">Les factures ne sont pas encore activées : colle <b>supabase/gestion_magasin.sql</b> dans Supabase (une seule fois).</div>}
      {msg && <div className="card p-3 mb-4 text-sm text-slate-200 flex justify-between gap-2">{msg}<button onClick={() => setMsg(null)}><X size={14} /></button></div>}

      {/* Infos de la société */}
      <div className="card p-4 mb-4">
        <button onClick={() => setOuvertSoc(!ouvertSoc)} className="w-full flex items-center justify-between gap-2 text-start">
          <span className="flex items-center gap-2 font-semibold text-slate-200"><Building2 size={16} className="text-amber-400" /> Mes informations (sur chaque facture)</span>
          <span className="flex items-center gap-2 text-xs">{manques.length > 0 && <span className="text-amber-300">à compléter : {manques.join(", ")}</span>}{ouvertSoc ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </button>
        {ouvertSoc && (
          <div className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHAMPS.map((c) => (
                <label key={c.k} className={`text-xs text-slate-500 ${c.large ? "sm:col-span-2" : ""}`}>{c.l}
                  <input className="input mt-1" placeholder={c.aide ?? ""} value={String(soc[c.k] ?? "")} onChange={(e) => setSoc({ ...soc, [c.k]: e.target.value })} />
                </label>
              ))}
              <label className="text-xs text-slate-500">TVA (%)
                <input type="number" className="input mt-1" value={soc.taux_tva} onChange={(e) => setSoc({ ...soc, taux_tva: Number(e.target.value) || 0 })} />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Tes prix de vente sont pris comme <b>TTC</b> : la facture calcule le HT et la TVA. Au Maroc, une facture doit porter ICE, RC, IF et l&apos;adresse.</p>
            <div className="flex justify-end mt-3"><button onClick={sauverSoc} className="btn-primary">Enregistrer</button></div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input className="input max-w-xs" placeholder="Chercher : numéro, client, ICE…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-xs text-slate-500 ms-auto">Facturé en {annee} (avoirs déduits) : <b className="text-amber-300">{mad(totalAnnee)}</b></span>
      </div>
      <p className="text-xs text-slate-500 mb-3">Pour faire une facture : <b>Ventes</b> → sur le bon, bouton <b>Facture</b>. Une facture ne se supprime jamais : pour l&apos;annuler, fais un <b>avoir</b>.</p>

      {!factures ? <p className="text-sm text-slate-400">Chargement…</p> : visibles.length === 0 ? (
        <p className="card p-4 text-sm text-slate-400">Aucune facture pour l&apos;instant.</p>
      ) : (
        <div className="space-y-2">
          {visibles.map((f) => {
            const avoir = f.type === "avoir";
            const annulee = !avoir && avoirDe.has(f.id);
            return (
              <div key={f.id} className={`card p-3 ${annulee ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100">
                      <span className={avoir ? "text-red-300" : "text-amber-300"}>{avoir ? "Avoir" : "Facture"} {f.numero}</span>
                      {annulee && <span className="ms-2 text-[11px] text-red-300">annulée par {avoirDe.get(f.id)!.numero}</span>}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{f.date.slice(8, 10)}/{f.date.slice(5, 7)}/{f.date.slice(0, 4)} · {f.client_nom ?? "?"}{f.client_ice ? ` · ICE ${f.client_ice}` : ""}</p>
                    {avoir && f.facture_origine && <p className="text-[11px] text-slate-500">sur facture {numeroDe.get(f.facture_origine) ?? "?"}</p>}
                  </div>
                  <div className="text-end shrink-0">
                    <p className={`font-bold ${avoir ? "text-red-300" : "text-slate-100"}`}>{avoir ? "−" : ""}{mad(f.total_ttc)}</p>
                    <p className="text-[11px] text-slate-500">HT {mad(f.total_ht)}</p>
                    <div className="flex gap-1.5 justify-end mt-1.5">
                      <button onClick={() => imprimer(f)} className="flex items-center gap-1 rounded-lg btn-secondary px-2 py-1 text-xs"><Printer size={13} /> Imprimer</button>
                      {!avoir && !annulee && <button onClick={() => faireAvoir(f)} className="flex items-center gap-1 rounded-lg bg-red-500/10 text-red-300 px-2 py-1 text-xs hover:bg-red-500/20"><Undo2 size={13} /> Avoir</button>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
