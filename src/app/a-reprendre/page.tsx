"use client";
// « À reprendre » (22/11/2026, BIBLE §8.56) : ce que j'ai vendu et que je dois racheter, rangé par fournisseur.
// 1) choisir la période · 2) cocher / corriger les quantités · 3) « Commande WhatsApp » au fournisseur
// · 4) à l'arrivée : « J'ai reçu → Réception » (la réception s'ouvre déjà remplie : vérifier, Enregistrer).
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { sendWhatsApp } from "@/lib/whatsapp";
import { articlesAReprendre, CLE_PREREMPLI, type ARepr, type Prerempli } from "@/lib/aReprendre";
import type { Fournisseur } from "@/types/database";
import { MessageCircle, PackagePlus, Search } from "lucide-react";

const PERIODES = [{ j: 7, l: "7 jours" }, { j: 14, l: "14 jours" }, { j: 30, l: "30 jours" }, { j: 3650, l: "Depuis le début" }];
const ilYa = (j: number) => new Date(Date.now() - j * 864e5).toISOString().slice(0, 10);

export default function AReprendrePage() {
  const router = useRouter();
  const [jours, setJours] = useState(14);
  const [lignes, setLignes] = useState<ARepr[] | null>(null);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [qte, setQte] = useState<Record<string, number>>({});
  const [coche, setCoche] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [toutes, setToutes] = useState(false); // aussi celles qu'il n'est pas besoin de reprendre (encore assez de stock)

  useEffect(() => { supabase.from("fournisseurs").select("*").order("nom").then(({ data }) => setFournisseurs((data ?? []) as Fournisseur[])); }, []);
  useEffect(() => {
    setLignes(null);
    articlesAReprendre(ilYa(jours)).then((l) => {
      setLignes(l);
      setQte(Object.fromEntries(l.map((x) => [x.cle, x.suggestion])));
      setCoche(Object.fromEntries(l.map((x) => [x.cle, x.suggestion > 0])));
    }).catch(() => setLignes([]));
  }, [jours]);

  const visibles = useMemo(() => {
    const t = q.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    return (lignes ?? []).filter((l) => (toutes || l.suggestion > 0) && (!t || `${l.ref} ${l.marque} ${l.filtron ?? ""}`.toUpperCase().replace(/[^A-Z0-9]/g, "").includes(t)));
  }, [lignes, q, toutes]);
  const groupes = useMemo(() => {
    const g = new Map<string, ARepr[]>();
    for (const l of visibles) { const k = l.fournisseur_id ?? "aucun"; g.set(k, [...(g.get(k) ?? []), l]); }
    return [...g.entries()];
  }, [visibles]);
  const nomF = (id: string) => fournisseurs.find((f) => f.id === id)?.nom ?? "Sans fournisseur";
  const choisies = (liste: ARepr[]) => liste.filter((l) => coche[l.cle] && (qte[l.cle] ?? 0) > 0);

  // Commande WhatsApp : TOUJOURS à Reda (dinoun) — demande du 22/11 (BIBLE §8.56) : numéro de la fiche du fournisseur à
  // crédit (dinoun auto), quelle que soit la source de la dernière réception
  const dinoun = fournisseurs.find((f) => (f.type ?? "credit") === "credit") ?? null;
  function commande(_fid: string, liste: ARepr[]) {
    const c = choisies(liste);
    if (!c.length) { alert("Coche au moins une référence avec une quantité."); return; }
    const texte = ["Salam Reda 👋", "🧾 *Commande FiltroPro*", `📅 ${new Date().toLocaleDateString("fr-FR")}`, "————————————",
      // Réf. Filtron d'abord (Reda travaille avec les réf. Filtron, demande du 22/11), puis la marque de la boîte
      ...c.map((l) => l.filtron ? `• ${l.filtron.replace(/^Filtron /, "")} (Filtron) = ${l.marque} ${l.ref} × ${qte[l.cle]}` : `• ${l.ref}${l.marque && l.marque !== "Filtron" ? ` (${l.marque})` : ""} × ${qte[l.cle]}`),
      "————————————", `${c.reduce((s, l) => s + (qte[l.cle] ?? 0), 0)} pièce(s), ${c.length} référence(s). Merci 🙏`].join("\n");
    sendWhatsApp(dinoun?.telephone ?? null, texte);
  }
  // Tout ce qui est coché, tous fournisseurs confondus, en un seul message à Reda
  const toutCoche = () => visibles;
  function jaiRecu(fid: string, liste: ARepr[]) {
    const c = choisies(liste);
    if (!c.length) { alert("Coche les références reçues."); return; }
    const p: Prerempli = { fournisseur_id: fid, lignes: c.map((l) => ({ product_id: l.product_id, equivalence_id: l.equivalence_id, marque: l.equivalence_id ? l.marque : "Filtron", reference: l.ref, quantite: qte[l.cle] ?? 0, prix_achat: l.prix_achat, prix_vente: l.prix_vente })) };
    try { localStorage.setItem(CLE_PREREMPLI, JSON.stringify(p)); } catch { /* rien */ }
    router.push("/fournisseurs?reception=prefill");
  }

  const total = (lignes ?? []).filter((l) => l.suggestion > 0).length;

  return (
    <div>
      <Header title="toRestock" />
      <div className="card p-4 mb-4">
        <p className="text-sm text-slate-300 mb-3">Ce que tu as <b>vendu</b> et qu&apos;il faut <b>reprendre</b>. Quantité proposée = vendu − ce qui reste (tu peux la changer).</p>
        <div className="flex flex-wrap gap-1.5">
          {PERIODES.map((p) => (
            <button key={p.j} onClick={() => setJours(p.j)} className={`text-xs rounded-full px-3 py-1 ${jours === p.j ? "bg-amber-500 text-black font-medium" : "btn-secondary"}`}>Vendu sur {p.l}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <label className="relative flex-1 min-w-[12rem]">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input ps-8" placeholder="Chercher une réf." value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="text-xs text-slate-400 flex items-center gap-2"><input type="checkbox" checked={toutes} onChange={(e) => setToutes(e.target.checked)} /> Voir aussi celles qui ont encore du stock</label>
        </div>
        {lignes && <p className="text-xs text-slate-500 mt-2">{total} référence(s) à reprendre · {lignes.length} vendue(s) sur la période</p>}
        {lignes && total > 0 && (
          <button onClick={() => commande("tout", toutCoche())} className="mt-3 flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white px-4 py-2 text-sm font-medium">
            <MessageCircle size={16} /> Tout commander à Reda (dinoun){dinoun?.telephone ? ` · ${dinoun.telephone}` : ""}
          </button>
        )}
      </div>

      {!lignes ? <p className="text-sm text-slate-400">Calcul…</p> : groupes.length === 0 ? (
        <p className="card p-4 text-sm text-slate-400">Rien à reprendre sur cette période 🎉</p>
      ) : groupes.map(([fid, liste]) => {
        const c = choisies(liste);
        const montant = c.reduce((s, l) => s + (qte[l.cle] ?? 0) * l.prix_achat, 0);
        return (
          <div key={fid} className="card p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-slate-100">Chez {nomF(fid)} <span className="text-xs text-slate-500 font-normal">· {c.length} réf. · {c.reduce((s, l) => s + (qte[l.cle] ?? 0), 0)} pièces{montant > 0 ? ` · ≈ ${Math.round(montant)} MAD` : ""}</span></h3>
              <div className="flex gap-2">
                <button onClick={() => commande(fid, liste)} className="flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 text-xs font-medium"><MessageCircle size={14} /> Commande à Reda</button>
                {fid !== "aucun" && <button onClick={() => jaiRecu(fid, liste)} className="flex items-center gap-1.5 btn-primary text-xs"><PackagePlus size={14} /> J&apos;ai reçu → Réception</button>}
              </div>
            </div>
            <div className="grid grid-cols-[auto_1fr_auto] gap-3 pb-1 text-[11px] uppercase text-slate-500"><span className="w-4" /><span>Référence · vendu · reste</span><span className="w-20 text-center">À reprendre</span></div>
            <div className="divide-y divide-slate-800">
              {liste.map((l) => (
                <div key={l.cle} className="grid grid-cols-[auto_1fr_auto] gap-3 py-2 items-center">
                  <input type="checkbox" checked={!!coche[l.cle]} onChange={(e) => setCoche({ ...coche, [l.cle]: e.target.checked })} />
                  <span className="min-w-0">
                    <span className="block font-mono text-sm text-slate-100 truncate">{l.ref} <span className="font-sans text-xs text-indigo-300">{l.marque}</span>{l.filtron && <span className="font-sans text-xs text-amber-300"> = {l.filtron}</span>}</span>
                    <span className="block text-[11px] text-slate-500 truncate">vendu <b className="text-slate-300">{l.vendu}</b> · reste <b className={l.stock <= 0 ? "text-red-400" : "text-slate-300"}>{l.stock}</b> · dernière vente {l.derniere.slice(8, 10)}/{l.derniere.slice(5, 7)}</span>
                  </span>
                  <input type="number" inputMode="numeric" min={0} className="input !w-20 py-1 text-center" value={qte[l.cle] ?? 0}
                    onChange={(e) => setQte({ ...qte, [l.cle]: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
