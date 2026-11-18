"use client";
// Échéancier (nouveauté n° 3, BIBLE §8.41) : « qui doit me payer, quand, et quel chèque dois-je couvrir ? »
// 1) chèques reçus des clients à encaisser (✓ encaissé / ❌ rejeté) · 2) chèques donnés aux fournisseurs (✓ débité)
// · 3) crédits clients du plus ancien au plus récent (relance WhatsApp 1 tap).
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/whatsapp";
import { marquerChequeEncaisse } from "@/lib/dinoun";
import {
  aujourdhui, chequesClients, chequesFournisseurs, creditsClients, encaisserCheque, etatEcheance, joursEntre, rejeterCheque,
  type ChequeClient, type ChequeFournisseur, type CreditClient,
} from "@/lib/echeancier";
import { Check, MessageCircle, X, Landmark, Users, FileText } from "lucide-react";

const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} MAD`;
const COULEUR = ["text-slate-400", "text-slate-300", "text-amber-300", "text-red-400"];
const FOND = ["", "", "border-amber-500/40", "border-red-500/50"];

export default function EcheancierPage() {
  const [cc, setCc] = useState<ChequeClient[] | null>(null);
  const [cf, setCf] = useState<ChequeFournisseur[] | null>(null);
  const [credits, setCredits] = useState<CreditClient[] | null>(null);
  const [onglet, setOnglet] = useState<"cheques" | "fournisseurs" | "credits">("cheques");
  const [msg, setMsg] = useState<string | null>(null);
  const [absent, setAbsent] = useState(false);
  const today = aujourdhui();

  async function charger() {
    const { error } = await supabase.from("paiements_clients").select("id", { head: true, count: "exact" });
    setAbsent(!!error && /schema cache|does not exist|PGRST205/i.test(error.message + (error.code ?? "")));
    const [a, b, c] = await Promise.all([chequesClients().catch(() => []), chequesFournisseurs().catch(() => []), creditsClients().catch(() => [])]);
    setCc(a); setCf(b); setCredits(c);
  }
  useEffect(() => { charger(); }, []);

  async function encaisse(p: ChequeClient) {
    const e = await encaisserCheque(p.id);
    if (e) { setMsg("Erreur : " + e); return; }
    setMsg(`Chèque de ${p.client_nom} (${money(Number(p.montant))}) noté encaissé ✓`);
    setCc((prev) => prev?.filter((x) => x.id !== p.id) ?? null);
  }
  async function rejete(p: ChequeClient) {
    if (!confirm(`Chèque de ${p.client_nom} (${money(Number(p.montant))}) REJETÉ par la banque ?\n\n→ le client redoit cet argent : son bon redevient « à payer ».`)) return;
    const e = await rejeterCheque(p);
    if (e) { setMsg("Erreur : " + e); return; }
    setMsg(`Chèque rejeté noté : ${p.client_nom} redoit ${money(Number(p.montant))}.`);
    charger();
  }
  async function debite(a: ChequeFournisseur) {
    const e = await marquerChequeEncaisse(a.id, true);
    if (e) { setMsg("Erreur : " + e); return; }
    setMsg(`Chèque n° ${a.numero_cheque ?? ""} à ${a.fournisseur_nom} noté débité ✓`);
    setCf((prev) => prev?.filter((x) => x.id !== a.id) ?? null);
  }
  async function relancer(c: CreditClient) {
    sendWhatsApp(c.telephone, `Salam ${c.nom} 🙏 Petit rappel : il reste ${c.solde.toFixed(0)} MAD chez FiltroPro. Merci !`);
    await supabase.from("clients").update({ derniere_relance: today }).eq("id", c.client_id);
    setCredits((prev) => prev?.map((x) => x.client_id === c.client_id ? { ...x, derniere_relance: today } : x) ?? null);
  }

  const totCc = (cc ?? []).reduce((s, p) => s + Number(p.montant), 0);
  const totCf = (cf ?? []).reduce((s, a) => s + Number(a.montant), 0);
  const totCr = (credits ?? []).reduce((s, c) => s + c.solde, 0);
  const vieux = (credits ?? []).filter((c) => joursEntre(c.plusAncien, today) > 30).length;
  const urgentsCc = (cc ?? []).filter((p) => etatEcheance(p.date_echeance, today).urgence === 3).length;
  const urgentsCf = (cf ?? []).filter((a) => etatEcheance(a.date_cheque, today).urgence >= 2).length;

  const Tuile = ({ id, icone, titre, total, detail, alerte }: { id: typeof onglet; icone: React.ReactNode; titre: string; total: number; detail: string; alerte: number }) => (
    <button onClick={() => setOnglet(id)} className={`card p-3 text-start transition-colors ${onglet === id ? "ring-2 ring-amber-500" : "hover:bg-slate-800/60"}`}>
      <div className="flex items-center gap-1.5 text-xs text-slate-400">{icone} {titre}</div>
      <div className="text-lg font-bold text-amber-300 mt-1">{money(total)}</div>
      <div className="text-[11px] text-slate-500">{detail}{alerte > 0 && <span className="text-red-400 font-medium"> · {alerte} urgent{alerte > 1 ? "s" : ""}</span>}</div>
    </button>
  );

  return (
    <div>
      <Header title="schedule" />
      {absent && <div className="card p-4 mb-4 text-sm text-amber-300">L&apos;échéancier n&apos;est pas encore activé : colle <b>supabase/gestion_magasin.sql</b> dans Supabase (une seule fois).</div>}
      {msg && <div className="card p-3 mb-4 text-sm text-slate-200 flex justify-between gap-2">{msg}<button onClick={() => setMsg(null)}><X size={14} /></button></div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <Tuile id="cheques" icone={<FileText size={13} />} titre="Chèques à encaisser" total={totCc} detail={`${cc?.length ?? "…"} chèque(s) reçus`} alerte={urgentsCc} />
        <Tuile id="fournisseurs" icone={<Landmark size={13} />} titre="Chèques donnés à couvrir" total={totCf} detail={`${cf?.length ?? "…"} chèque(s) aux fournisseurs`} alerte={urgentsCf} />
        <Tuile id="credits" icone={<Users size={13} />} titre="Crédits clients" total={totCr} detail={`${credits?.length ?? "…"} client(s)${vieux ? ` · ${vieux} depuis + de 30 j` : ""}`} alerte={0} />
      </div>

      {onglet === "cheques" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Chèques reçus en encaissant un bon (Ventes → 💰 → « Chèque »). Dépose-les à la banque à la date prévue, puis touche ✓.</p>
          {cc?.length === 0 && <p className="card p-4 text-sm text-slate-400">Aucun chèque en attente 🎉</p>}
          {cc?.map((p) => {
            const e = etatEcheance(p.date_echeance, today);
            return (
              <div key={p.id} className={`card p-3 border ${FOND[e.urgence]}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-100">{p.client_nom}</p>
                    <p className="text-[11px] text-slate-400">n° {p.numero_cheque || "?"}{p.banque ? ` · ${p.banque}` : ""} · reçu le {p.date.slice(8, 10)}/{p.date.slice(5, 7)}</p>
                    <p className={`text-xs font-medium mt-0.5 ${COULEUR[e.urgence]}`}>À encaisser {e.texte}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-bold text-amber-300">{money(Number(p.montant))}</p>
                    <div className="flex gap-1.5 mt-1.5 justify-end">
                      <button onClick={() => encaisse(p)} className="flex items-center gap-1 rounded-lg bg-emerald-500/15 text-emerald-300 px-2 py-1 text-xs hover:bg-emerald-500/25"><Check size={13} /> Encaissé</button>
                      <button onClick={() => rejete(p)} className="rounded-lg bg-red-500/10 text-red-300 px-2 py-1 text-xs hover:bg-red-500/20" title="La banque a refusé le chèque">❌ Rejeté</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onglet === "fournisseurs" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Chèques donnés aux fournisseurs (Fournisseurs → Avance → « Chèque »). Il faut l&apos;argent sur le compte avant la date du chèque.</p>
          {cf?.length === 0 && <p className="card p-4 text-sm text-slate-400">Aucun chèque à couvrir 🎉</p>}
          {cf?.map((a) => {
            const e = etatEcheance(a.date_cheque, today);
            return (
              <div key={a.id} className={`card p-3 border ${FOND[e.urgence]}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-100">{a.fournisseur_nom}</p>
                    <p className="text-[11px] text-slate-400">n° {a.numero_cheque || "?"}{a.personne ? ` · à ${a.personne}` : ""} · donné le {a.date.slice(8, 10)}/{a.date.slice(5, 7)}</p>
                    <p className={`text-xs font-medium mt-0.5 ${COULEUR[e.urgence]}`}>Débité {e.texte}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-bold text-amber-300">{money(Number(a.montant))}</p>
                    <button onClick={() => debite(a)} className="mt-1.5 flex items-center gap-1 rounded-lg bg-emerald-500/15 text-emerald-300 px-2 py-1 text-xs hover:bg-emerald-500/25"><Check size={13} /> Débité</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onglet === "credits" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">Clients qui doivent encore de l&apos;argent, le plus ancien en haut. Rouge = plus de 30 jours.</p>
          {credits?.length === 0 && <p className="card p-4 text-sm text-slate-400">Aucun crédit client 🎉</p>}
          {credits?.map((c) => {
            const j = joursEntre(c.plusAncien, today);
            const relanceRecente = c.derniere_relance && joursEntre(c.derniere_relance, today) < 7;
            return (
              <div key={c.client_id} className={`card p-3 border ${j > 30 ? "border-red-500/50" : j > 15 ? "border-amber-500/40" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-100">{c.nom}{c.ville ? <span className="text-slate-500 font-normal"> · {c.ville}</span> : null}</p>
                    <p className="text-[11px] text-slate-400">{c.bons} bon(s) · le plus ancien du {c.plusAncien.slice(8, 10)}/{c.plusAncien.slice(5, 7)}</p>
                    <p className={`text-xs font-medium mt-0.5 ${j > 30 ? "text-red-400" : j > 15 ? "text-amber-300" : "text-slate-400"}`}>depuis {j} j{relanceRecente ? ` · relancé le ${c.derniere_relance!.slice(8, 10)}/${c.derniere_relance!.slice(5, 7)}` : ""}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-bold text-amber-300">{money(c.solde)}</p>
                    <div className="flex gap-1.5 mt-1.5 justify-end">
                      <button onClick={() => relancer(c)} className="flex items-center gap-1 rounded-lg bg-green-500/15 text-green-300 px-2 py-1 text-xs hover:bg-green-500/25"><MessageCircle size={13} /> Relancer</button>
                      <Link href="/ventes?impayes=1" className="rounded-lg btn-secondary px-2 py-1 text-xs">💰 Encaisser</Link>
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
