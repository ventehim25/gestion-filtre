"use client";
// Stock détaillé (composant partagé) — à l'origine la page « Mon stock » (22/11/2026, BIBLE §8.50).
// Lecture seule, tout ce qui a du stock : les fiches (Filtron, Gates…) ET les
// variantes de marque (Wix, Mann, Flag…, qui ont leur propre stock), voitures et camions, avec ce qui est dans la voiture.
// Pour corriger un chiffre : Inventaire (comptage) ou « Corriger le stock » (motif) — jamais ici.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { FAMILLES, familleDe, libelleCategorie } from "@/lib/categories";
import { useRole } from "@/lib/role";
import { Boxes, Search, Printer, History } from "lucide-react";

type Ligne = {
  cle: string; product_id: string; equivalence_id: string | null; ref: string; marque: string; filtron: string | null;
  categorie: string; vehicule: string; stock: number; prix: number; prix_achat: number; voiture: number;
};
const mad = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} MAD`;

async function paquets<T>(f: (de: number, a: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < 100; i++) {
    const { data, error } = await f(i * 1000, i * 1000 + 999);
    if (error || !(data as T[] | null)?.length) break;
    out.push(...(data as T[]));
    if ((data as T[]).length < 1000) break;
  }
  return out;
}

async function charger(): Promise<Ligne[]> {
  type P = { id: string; reference: string; marque: string | null; categorie: string; vehicule: string | null; stock: number; prix_vente: number; prix_achat: number };
  type E = { id: string; product_id: string; marque: string; reference: string; stock: number | null; prix: number | null; prix_achat: number | null; products: P | null };
  const [fiches, variantes, voiture] = await Promise.all([
    paquets<P>((de, a) => supabase.from("products").select("id, reference, marque, categorie, vehicule, stock, prix_vente, prix_achat").neq("stock", 0).order("id").range(de, a)),
    paquets<E>((de, a) => supabase.from("equivalences").select("id, product_id, marque, reference, stock, prix, prix_achat, products(id, reference, marque, categorie, vehicule, stock, prix_vente, prix_achat)").neq("stock", 0).order("id").range(de, a)),
    paquets<{ product_id: string; equivalence_id: string | null; quantite: number }>((de, a) => supabase.from("stock_depots").select("id, product_id, equivalence_id, quantite").eq("depot", "voiture").gt("quantite", 0).order("id").range(de, a)),
  ]);
  const dansVoiture = new Map(voiture.map((v) => [`${v.product_id}|${v.equivalence_id ?? ""}`, v.quantite]));
  return [
    ...fiches.map((p) => ({
      cle: `${p.id}|`, product_id: p.id, equivalence_id: null, ref: p.reference, marque: p.marque ?? "", filtron: null,
      categorie: p.categorie, vehicule: p.vehicule ?? "voiture", stock: p.stock, prix: Number(p.prix_vente ?? 0), prix_achat: Number(p.prix_achat ?? 0),
      voiture: dansVoiture.get(`${p.id}|`) ?? 0,
    })),
    ...variantes.filter((e) => e.products).map((e) => ({
      cle: `${e.product_id}|${e.id}`, product_id: e.product_id, equivalence_id: e.id, ref: e.reference, marque: e.marque, filtron: `${e.products!.marque ?? ""} ${e.products!.reference}`.trim(),
      categorie: e.products!.categorie, vehicule: e.products!.vehicule ?? "voiture", stock: e.stock ?? 0,
      prix: Number(e.prix ?? e.products!.prix_vente ?? 0), prix_achat: Number(e.prix_achat ?? e.products!.prix_achat ?? 0),
      voiture: dansVoiture.get(`${e.product_id}|${e.id}`) ?? 0,
    })),
  ];
}

/** Le stock détaillé (familles, cases par type, liste, recherche, tri, impression) — utilisé par « Mon stock » ET « Stock voiture »
 *  (un seul stock, BIBLE §8.54 / §8.55 : « fais-moi ça pareil dans Stock voiture, ça me facilite les recherches »). */
export default function StockDetaille({ titre = "Il te reste en stock" }: { titre?: string }) {
  const patron = useRole() === "admin";
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [famille, setFamille] = useState<string>("tout");
  const [type, setType] = useState<string>("tout");
  const [q, setQ] = useState("");
  const [tri, setTri] = useState<"quantite" | "reference" | "valeur">("quantite");

  useEffect(() => { charger().then(setLignes).catch(() => setLignes([])); }, []);

  const positifs = (lignes ?? []).filter((l) => l.stock > 0);
  const negatifs = (lignes ?? []).filter((l) => l.stock < 0);
  const total = positifs.reduce((s, l) => s + l.stock, 0);
  const valeurVente = positifs.reduce((s, l) => s + l.stock * l.prix, 0);
  const valeurAchat = positifs.reduce((s, l) => s + l.stock * l.prix_achat, 0);
  const enVoiture = positifs.reduce((s, l) => s + l.voiture, 0);

  // Par famille, et par type de pièce dans la famille choisie (Filtres à huile 120, Filtres à air 64…)
  const parFamille = FAMILLES.map((f) => ({ f, n: positifs.filter((l) => familleDe(l.categorie) === f.k).reduce((s, l) => s + l.stock, 0) })).filter((x) => x.n > 0);
  const dansFamille = positifs.filter((l) => famille === "tout" || familleDe(l.categorie) === famille);
  const parType = [...new Set(dansFamille.map((l) => l.categorie))]
    .map((c) => ({ c, n: dansFamille.filter((l) => l.categorie === c).reduce((s, l) => s + l.stock, 0), refs: dansFamille.filter((l) => l.categorie === c).length }))
    .sort((a, b) => b.n - a.n);

  const visibles = useMemo(() => {
    const t = q.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    return [...dansFamille, ...(famille === "tout" ? negatifs : negatifs.filter((l) => familleDe(l.categorie) === famille))]
      .filter((l) => type === "tout" || l.categorie === type)
      .filter((l) => !t || `${l.ref} ${l.marque} ${l.filtron ?? ""}`.toUpperCase().replace(/[^A-Z0-9]/g, "").includes(t))
      .sort((a, b) => tri === "reference" ? a.ref.localeCompare(b.ref, undefined, { numeric: true })
        : tri === "valeur" ? b.stock * b.prix - a.stock * a.prix : b.stock - a.stock);
  }, [dansFamille, negatifs, famille, type, q, tri]);

  return (
    <div>
      {!lignes ? <p className="text-sm text-slate-400">Comptage…</p> : (
        <>
          {/* Le chiffre */}
          <div className="card p-5 mb-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm"><Boxes size={16} className="text-amber-400" /> {titre}</div>
            <div className="text-3xl font-bold text-amber-300 mt-1">{total.toLocaleString("fr-FR")} pièce{total > 1 ? "s" : ""}</div>
            <div className="text-xs text-slate-500 mt-1">
              {positifs.length} référence{positifs.length > 1 ? "s" : ""} · valeur {mad(valeurVente)} au prix de vente{patron ? ` · ${mad(valeurAchat)} au prix d'achat` : ""}
              {enVoiture > 0 && <> · dont <b className="text-slate-300">{enVoiture}</b> dans la voiture</>}
            </div>
            {negatifs.length > 0 && (
              <p className="text-xs text-red-400 mt-2">⚠ {negatifs.length} référence(s) en stock négatif (vendu plus que reçu) : à recompter → <Link href="/inventaire" className="underline">Inventaire</Link>.</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-4">
              <button onClick={() => { setFamille("tout"); setType("tout"); }} className={`text-xs rounded-full px-3 py-1 ${famille === "tout" ? "bg-amber-500 text-black font-medium" : "btn-secondary"}`}>Tout ({total})</button>
              {parFamille.map(({ f, n }) => (
                <button key={f.k} onClick={() => { setFamille(f.k); setType("tout"); }} className={`text-xs rounded-full px-3 py-1 ${famille === f.k ? "bg-amber-500 text-black font-medium" : "btn-secondary"}`}>{f.court} ({n})</button>
              ))}
            </div>
          </div>

          {/* Par type de pièce */}
          {parType.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {parType.map(({ c, n, refs }) => (
                <button key={c} onClick={() => setType(type === c ? "tout" : c)}
                  className={`card p-3 text-start transition-colors ${type === c ? "ring-2 ring-amber-500" : "hover:bg-slate-800/60"}`}>
                  <div className="text-[11px] text-slate-400 truncate">{libelleCategorie(c)}</div>
                  <div className="text-xl font-bold text-slate-100">{n}</div>
                  <div className="text-[11px] text-slate-500">{refs} réf.</div>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <label className="relative flex-1 min-w-[12rem]">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input ps-8" placeholder="Chercher une réf. (OP540, Wix, Flag…)" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <select className="bg-transparent text-slate-300 text-xs border border-slate-700 rounded px-2 py-2" value={tri} onChange={(e) => setTri(e.target.value as typeof tri)}>
              <option value="quantite">Plus grande quantité</option><option value="reference">Référence</option><option value="valeur">Plus grande valeur</option>
            </select>
            <button onClick={() => window.print()} className="btn-secondary flex items-center gap-1.5 text-xs"><Printer size={14} /> Imprimer</button>
            <select className="bg-transparent text-slate-300 text-xs border border-slate-700 rounded px-2 py-2" value={famille === "tout" ? type : type} onChange={(e) => setType(e.target.value)}>
              <option value="tout">Tous les types</option>
              {parType.map(({ c }) => <option key={c} value={c}>{libelleCategorie(c)}</option>)}
            </select>
          </div>

          <div className="card divide-y divide-slate-800">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 text-[11px] uppercase text-slate-500">
              <span>Référence</span><span className="text-end w-16">Stock</span><span className="text-end w-20">Valeur</span>
            </div>
            {visibles.slice(0, 400).map((l) => (
              <div key={l.cle} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 items-center">
                <span className="min-w-0">
                  <span className="block font-mono text-sm text-slate-100 truncate">{l.ref} <span className="font-sans text-xs text-indigo-300">{l.marque}</span>{l.vehicule === "camion" ? " 🚛" : ""}</span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {libelleCategorie(l.categorie)}{l.filtron ? ` · = ${l.filtron}` : ""}{l.voiture ? ` · ${l.voiture} dans la voiture` : ""}
                    <Link href={`/inventaire?article=${l.product_id}`} className="ms-2 inline-flex items-center gap-0.5 text-slate-500 hover:text-amber-300"><History size={11} /> historique</Link>
                  </span>
                </span>
                <span className={`text-end w-16 text-lg font-bold ${l.stock < 0 ? "text-red-400" : l.stock <= 2 ? "text-amber-300" : "text-emerald-400"}`}>{l.stock}</span>
                <span className="text-end w-20 text-xs text-slate-400">{l.prix > 0 ? mad(l.stock * l.prix) : "—"}</span>
              </div>
            ))}
            {visibles.length === 0 && <p className="p-4 text-sm text-slate-500">Rien en stock ici.</p>}
            {visibles.length > 400 && <p className="p-3 text-xs text-slate-500">400 premières lignes : cherche une réf. ou choisis un type pour voir les autres.</p>}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Vert = en stock · orange = 2 ou moins · rouge = négatif. Pour corriger un chiffre : <Link href="/inventaire" className="underline">Inventaire</Link> (compter) ou « Corriger le stock » avec un motif.</p>
        </>
      )}
    </div>
  );
}
