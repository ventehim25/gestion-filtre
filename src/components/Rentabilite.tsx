"use client";
// Rentabilité (nouveauté n° 4, inspirée du logiciel « GMP » de dinoun — BIBLE §8.41) : ce qui RAPPORTE vraiment,
// pas seulement ce qui se vend. Par article, client, marque ou famille, sur une période :
// ventes − coût (coût figé à la vente, sinon prix d'achat) − pièces rendues = bénéfice, et la marge en %.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FAMILLES, familleDe } from "@/lib/categories";
import type { LigneRetour } from "@/types/database";

type Axe = "article" | "client" | "marque" | "famille";
type Periode = "mois" | "3mois" | "annee" | "tout";
type Ligne = { cle: string; qte: number; ventes: number; cout: number };
type Item = {
  product_id: string; equivalence_id: string | null; quantite: number; prix_unitaire: number; cout_unitaire: number | null;
  sale: { date: string; client_id: string | null; client: { nom: string } | null } | null;
  product: { reference: string; marque: string | null; categorie: string | null; prix_achat: number } | null;
  equivalence: { reference: string; marque: string; prix_achat: number | null } | null;
};

const debutDe = (p: Periode) => {
  const d = new Date();
  if (p === "mois") return d.toISOString().slice(0, 8) + "01";
  if (p === "3mois") { d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); }
  if (p === "annee") return d.toISOString().slice(0, 4) + "-01-01";
  return "2000-01-01";
};
const nomFamille = (c: string | null | undefined) => FAMILLES.find((f) => f.k === familleDe(c))?.court ?? "Autre";

export default function Rentabilite() {
  const [axe, setAxe] = useState<Axe>("article");
  const [periode, setPeriode] = useState<Periode>("mois");
  const [items, setItems] = useState<Item[] | null>(null);
  const [retours, setRetours] = useState<{ client: string; lignes: LigneRetour[] }[]>([]);
  const [infos, setInfos] = useState<Map<string, { marque: string | null; categorie: string | null }>>(new Map());
  const [tri, setTri] = useState<"benef" | "ventes" | "marge">("benef");
  const [tout, setTout] = useState(false);

  useEffect(() => {
    let annule = false;
    (async () => {
      setItems(null);
      const debut = debutDe(periode);
      const out: Item[] = [];
      for (let i = 0; i < 100; i++) {
        const { data, error } = await supabase.from("sale_items")
          .select("product_id, equivalence_id, quantite, prix_unitaire, cout_unitaire, sale:sales!inner(date, client_id, client:clients(nom)), product:products(reference, marque, categorie, prix_achat), equivalence:equivalences(reference, marque, prix_achat)")
          .gte("sales.date", debut).order("id").range(i * 1000, i * 1000 + 999);
        if (error || !data?.length) break;
        out.push(...(data as unknown as Item[]));
        if (data.length < 1000) break;
      }
      // Pièces rendues pendant la période (enlevées de la ligne de la même pièce)
      const rets: { client: string; lignes: LigneRetour[] }[] = [];
      const { data: rr } = await supabase.from("retours_clients").select("id, lignes, client:clients(nom)").gte("date", debut).order("id").range(0, 4999);
      for (const r of (rr ?? []) as unknown as { lignes: LigneRetour[]; client: { nom: string } | null }[]) rets.push({ client: r.client?.nom ?? "?", lignes: r.lignes ?? [] });
      // Marque / famille des pièces rendues
      const ids = [...new Set(rets.flatMap((r) => r.lignes.map((l) => l.product_id)))];
      const inf = new Map<string, { marque: string | null; categorie: string | null }>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await supabase.from("products").select("id, marque, categorie").in("id", ids.slice(i, i + 200));
        for (const p of (data ?? []) as { id: string; marque: string | null; categorie: string | null }[]) inf.set(p.id, p);
      }
      if (!annule) { setItems(out); setRetours(rets); setInfos(inf); }
    })();
    return () => { annule = true; };
  }, [periode]);

  const lignes = useMemo(() => {
    if (!items) return [];
    const m = new Map<string, Ligne>();
    const ajoute = (cle: string, qte: number, ventes: number, cout: number) => {
      const g = m.get(cle) ?? { cle, qte: 0, ventes: 0, cout: 0 };
      g.qte += qte; g.ventes += ventes; g.cout += cout; m.set(cle, g);
    };
    for (const it of items) {
      const ref = it.equivalence ? `${it.equivalence.reference} (${it.equivalence.marque})` : it.product?.reference ?? "?";
      const marque = it.equivalence?.marque ?? it.product?.marque ?? "?";
      const cle = axe === "article" ? ref : axe === "client" ? it.sale?.client?.nom ?? "?" : axe === "marque" ? marque : nomFamille(it.product?.categorie);
      const cu = it.cout_unitaire ?? it.equivalence?.prix_achat ?? it.product?.prix_achat ?? 0;
      ajoute(cle, it.quantite, it.quantite * Number(it.prix_unitaire), it.quantite * Number(cu));
    }
    for (const r of retours) for (const l of r.lignes) {
      const inf = infos.get(l.product_id);
      const marque = /\(([^)]+)\)\s*$/.exec(l.ref)?.[1] ?? inf?.marque ?? "?";
      const cle = axe === "article" ? l.ref : axe === "client" ? r.client : axe === "marque" ? marque : nomFamille(inf?.categorie);
      ajoute(cle, -l.quantite, -l.quantite * l.prix_unitaire, -l.quantite * l.cout_unitaire);
    }
    const marge = (g: Ligne) => (g.ventes > 0 ? (g.ventes - g.cout) / g.ventes : 0);
    return [...m.values()].filter((g) => g.qte !== 0 || g.ventes !== 0)
      .sort((a, b) => tri === "ventes" ? b.ventes - a.ventes : tri === "marge" ? marge(b) - marge(a) : (b.ventes - b.cout) - (a.ventes - a.cout));
  }, [items, retours, infos, axe, tri]);

  const tot = lignes.reduce((s, g) => ({ ventes: s.ventes + g.ventes, cout: s.cout + g.cout }), { ventes: 0, cout: 0 });
  const benefTot = tot.ventes - tot.cout;
  const affichees = tout ? lignes : lignes.slice(0, 15);
  const sansCout = (items ?? []).filter((it) => (it.cout_unitaire ?? it.equivalence?.prix_achat ?? it.product?.prix_achat ?? 0) <= 0).length;

  const Bouton = <T extends string>({ v, cur, set, children }: { v: T; cur: T; set: (x: T) => void; children: React.ReactNode }) => (
    <button onClick={() => set(v)} className={`text-xs px-3 py-1.5 rounded-md transition-colors ${cur === v ? "bg-amber-500 text-black font-medium" : "text-slate-400 hover:text-slate-200"}`}>{children}</button>
  );

  return (
    <div className="card p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-slate-700">💹 Rentabilité — ce qui rapporte</h3>
        <div className="flex rounded-lg bg-slate-800/60 p-0.5">
          <Bouton v="mois" cur={periode} set={setPeriode}>Ce mois</Bouton>
          <Bouton v="3mois" cur={periode} set={setPeriode}>3 mois</Bouton>
          <Bouton v="annee" cur={periode} set={setPeriode}>Cette année</Bouton>
          <Bouton v="tout" cur={periode} set={setPeriode}>Tout</Bouton>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg bg-slate-800/60 p-0.5">
          <Bouton v="article" cur={axe} set={setAxe}>Par article</Bouton>
          <Bouton v="client" cur={axe} set={setAxe}>Par client</Bouton>
          <Bouton v="marque" cur={axe} set={setAxe}>Par marque</Bouton>
          <Bouton v="famille" cur={axe} set={setAxe}>Par famille</Bouton>
        </div>
        <label className="text-[11px] text-slate-500 flex items-center gap-1 ms-auto">Trier par
          <select className="bg-transparent text-slate-300 text-xs border border-slate-700 rounded px-1 py-0.5" value={tri} onChange={(e) => setTri(e.target.value as typeof tri)}>
            <option value="benef">bénéfice</option><option value="ventes">ventes</option><option value="marge">marge %</option>
          </select>
        </label>
      </div>

      {!items ? <p className="text-slate-400 text-sm text-center py-6">Calcul…</p> : lignes.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">Aucune vente sur la période.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="rounded-lg bg-slate-800/50 p-2"><div className="text-[11px] text-slate-500">Ventes</div><div className="font-bold text-sky-400">{tot.ventes.toFixed(0)}</div></div>
            <div className="rounded-lg bg-slate-800/50 p-2"><div className="text-[11px] text-slate-500">Bénéfice</div><div className="font-bold text-emerald-400">{benefTot.toFixed(0)}</div></div>
            <div className="rounded-lg bg-slate-800/50 p-2"><div className="text-[11px] text-slate-500">Marge</div><div className="font-bold text-amber-300">{tot.ventes > 0 ? Math.round((benefTot / tot.ventes) * 100) : 0} %</div></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-slate-500 uppercase">{axe === "article" ? "Article" : axe === "client" ? "Client" : axe === "marque" ? "Marque" : "Famille"}</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500 uppercase">Qté</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500 uppercase">Ventes</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500 uppercase">Bénéfice</th>
                  <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500 uppercase">Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {affichees.map((g) => {
                  const b = g.ventes - g.cout;
                  const marge = g.ventes > 0 ? Math.round((b / g.ventes) * 100) : 0;
                  const part = benefTot > 0 ? Math.max(0, b / benefTot) : 0;
                  return (
                    <tr key={g.cle}>
                      <td className="px-2 py-2 text-slate-300 max-w-[12rem]">
                        <div className="truncate font-mono text-xs">{g.cle}</div>
                        <div className="h-1 rounded bg-slate-800 mt-1"><div className="h-1 rounded bg-emerald-500/70" style={{ width: `${Math.round(part * 100)}%` }} /></div>
                      </td>
                      <td className="px-2 py-2 text-right text-slate-400">{g.qte}</td>
                      <td className="px-2 py-2 text-right text-sky-400">{g.ventes.toFixed(0)}</td>
                      <td className={`px-2 py-2 text-right font-semibold ${b >= 0 ? "text-emerald-400" : "text-red-400"}`}>{b.toFixed(0)}</td>
                      <td className={`px-2 py-2 text-right ${marge < 10 ? "text-red-400" : marge < 20 ? "text-amber-300" : "text-slate-300"}`}>{marge} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {lignes.length > 15 && (
            <button onClick={() => setTout(!tout)} className="text-xs text-blue-400 underline mt-2">{tout ? "Voir moins" : `Voir les ${lignes.length}`}</button>
          )}
          <p className="text-[11px] text-slate-500 mt-2">Montants en MAD. Bénéfice = ventes − coût d&apos;achat (figé à la vente) − pièces rendues. Marge rouge = moins de 10 %.{sansCout > 0 ? ` ⚠ ${sansCout} ligne(s) vendue(s) sans prix d'achat : bénéfice surestimé.` : ""}</p>
        </>
      )}
    </div>
  );
}
