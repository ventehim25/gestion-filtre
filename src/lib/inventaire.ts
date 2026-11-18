// Inventaire + régularisation + historique d'un article (nouveauté n° 6, inspirée du logiciel « GMP » de dinoun — BIBLE §8.41).
// • Inventaire : on compte les boîtes ; le brouillon est gardé (inventaires.lignes) ; à la validation, chaque écart
//   devient une régularisation « inventaire » et le stock prend le nombre compté. Ce qui n'est pas compté ne bouge pas.
// • Régularisation : toute correction de stock à la main a un MOTIF (casse, perte, vol, erreur…) et garde le stock
//   avant / après → plus jamais un stock qui change sans qu'on sache pourquoi.
// • Historique d'un article : réceptions, retours fournisseur, ventes, retours client, corrections, transferts — du plus
//   récent au plus ancien, fiche et variantes de marque (Wix, Mann…) séparées.
import { supabase } from "./supabase";
import { chargerMarques } from "./brands";
import type { Inventaire, Regularisation } from "@/types/database";
import type { TypeVehicule } from "./typeVehicule";

export const MOTIFS = [
  { cle: "casse", libelle: "💥 Casse / abîmé" },
  { cle: "perte", libelle: "❓ Perdu" },
  { cle: "vol", libelle: "🚨 Vol" },
  { cle: "erreur", libelle: "✏️ Erreur de saisie" },
  { cle: "echantillon", libelle: "🎁 Échantillon / cadeau" },
  { cle: "retrouve", libelle: "🔎 Retrouvé" },
  { cle: "inventaire", libelle: "📋 Inventaire" },
  { cle: "correction", libelle: "Correction" },
] as const;
export const libelleMotif = (m: string) => MOTIFS.find((x) => x.cle === m)?.libelle ?? m;

/** Un article qui a son propre stock : la fiche (Filtron…) ou une variante de marque (Wix, Mann…). */
export type Article = { product_id: string; equivalence_id: string | null; ref: string; stock: number; prix_achat: number };
export const cleArticle = (a: { product_id: string; equivalence_id: string | null }) => `${a.product_id}|${a.equivalence_id ?? ""}`;

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

/** Tout ce qui a du stock (≠ 0) dans le mode 🚗 / 🚛 : la feuille d'inventaire. */
export async function articlesEnStock(type: TypeVehicule): Promise<Article[]> {
  const [fiches, variantes] = await Promise.all([
    paquets<{ id: string; reference: string; marque: string | null; stock: number; prix_achat: number }>((de, a) =>
      supabase.from("products").select("id, reference, marque, stock, prix_achat").eq("vehicule", type).neq("stock", 0).order("id").range(de, a)),
    paquets<{ id: string; product_id: string; marque: string; reference: string; stock: number; prix_achat: number | null }>((de, a) =>
      supabase.from("equivalences").select("id, product_id, marque, reference, stock, prix_achat, products!inner(vehicule)").eq("products.vehicule", type).neq("stock", 0).order("id").range(de, a)),
  ]);
  return [
    ...fiches.map((p) => ({ product_id: p.id, equivalence_id: null, ref: p.marque && p.marque !== "Filtron" ? `${p.reference} (${p.marque})` : p.reference, stock: p.stock, prix_achat: Number(p.prix_achat ?? 0) })),
    ...variantes.map((v) => ({ product_id: v.product_id, equivalence_id: v.id, ref: `${v.reference} (${v.marque})`, stock: v.stock ?? 0, prix_achat: Number(v.prix_achat ?? 0) })),
  ].sort((x, y) => x.ref.localeCompare(y.ref));
}

async function stockActuel(a: { product_id: string; equivalence_id: string | null }): Promise<number> {
  const { data } = a.equivalence_id
    ? await supabase.from("equivalences").select("stock").eq("id", a.equivalence_id).single()
    : await supabase.from("products").select("stock").eq("id", a.product_id).single();
  return Number((data as { stock: number | null } | null)?.stock ?? 0);
}

/** Correction de stock avec motif : le stock change d'abord (fonction de la base, sans écraser une vente en cours),
 *  puis la trace est écrite avec le stock avant / après. */
export async function corrigerStock(p: {
  product_id: string; equivalence_id: string | null; delta: number; motif: string; note?: string; inventaire_id?: string | null;
}): Promise<Regularisation> {
  if (!p.delta) throw new Error("Rien à corriger.");
  const avant = await stockActuel(p);
  const { error: e } = p.equivalence_id
    ? await supabase.rpc("decrement_equiv_stock", { e_id: p.equivalence_id, qty: -p.delta })
    : await supabase.rpc("decrement_stock", { p_id: p.product_id, qty: -p.delta });
  if (e) throw new Error("Stock pas corrigé : " + e.message);
  const { data, error } = await supabase.from("regularisations").insert({
    date: new Date().toISOString().slice(0, 10), product_id: p.product_id, equivalence_id: p.equivalence_id, quantite: p.delta,
    stock_avant: avant, stock_apres: avant + p.delta, motif: p.motif, inventaire_id: p.inventaire_id ?? null, note: p.note || null,
  }).select("*").single();
  if (error) throw new Error("Stock corrigé mais trace non écrite : " + error.message);
  return data as Regularisation;
}

// ───────────── Inventaire ─────────────
export async function inventaireEnCours(): Promise<Inventaire | null> {
  const { data } = await supabase.from("inventaires").select("*").eq("statut", "en_cours").order("created_at", { ascending: false }).limit(1);
  return (data?.[0] as Inventaire | undefined) ?? null;
}
export async function inventairesPasses(): Promise<Inventaire[]> {
  const { data } = await supabase.from("inventaires").select("*").eq("statut", "valide").order("created_at", { ascending: false }).limit(20);
  return (data ?? []) as Inventaire[];
}
export async function demarrerInventaire(): Promise<Inventaire> {
  const deja = await inventaireEnCours();
  if (deja) return deja;
  const { data, error } = await supabase.from("inventaires").insert({ date: new Date().toISOString().slice(0, 10), lignes: [], note: null, valide_le: null }).select("*").single();
  if (error) throw error;
  return data as Inventaire;
}
export async function sauverComptage(id: string, lignes: Inventaire["lignes"]): Promise<void> {
  await supabase.from("inventaires").update({ lignes }).eq("id", id);
}
export async function abandonnerInventaire(id: string): Promise<void> {
  await supabase.from("inventaires").delete().eq("id", id).eq("statut", "en_cours");
}

/** Validation : chaque article compté prend le nombre compté (écart = compté − stock AU MOMENT de valider, pour ne pas
 *  effacer une vente faite pendant le comptage). Retourne le nombre de corrections et leur valeur au prix d'achat. */
export async function validerInventaire(inv: Inventaire, prix: Map<string, number>, onProgres?: (fait: number, total: number) => void) {
  let corrections = 0, valeur = 0;
  const lignes = inv.lignes ?? [];
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i];
    const delta = l.compte - (await stockActuel(l));
    if (delta !== 0) {
      await corrigerStock({ product_id: l.product_id, equivalence_id: l.equivalence_id, delta, motif: "inventaire", inventaire_id: inv.id });
      corrections++; valeur += delta * (prix.get(cleArticle(l)) ?? 0);
    }
    onProgres?.(i + 1, lignes.length);
  }
  await supabase.from("inventaires").update({ statut: "valide", valide_le: new Date().toISOString(), note: `${lignes.length} article(s) compté(s), ${corrections} corrigé(s), écart ${Math.round(valeur)} MAD` }).eq("id", inv.id);
  return { corrections, valeur };
}

// ───────────── Historique d'un article ─────────────
export type Mouvement = {
  date: string; quand: string; type: "reception" | "retour_fournisseur" | "vente" | "retour_client" | "correction" | "transfert";
  libelle: string; variante: string; equivalence_id: string | null; delta: number;
};

export async function historiqueArticle(productId: string): Promise<{ mouvements: Mouvement[]; variantes: { id: string | null; nom: string; stock: number }[] }> {
  const [marques, { data: fiche }, { data: eqs }] = await Promise.all([
    chargerMarques(),
    supabase.from("products").select("reference, marque, stock").eq("id", productId).single(),
    supabase.from("equivalences").select("id, marque, reference, stock").eq("product_id", productId).order("id").range(0, 4999),
  ]);
  const f = fiche as { reference: string; marque: string | null; stock: number } | null;
  const vars = ((eqs ?? []) as { id: string; marque: string; reference: string; stock: number | null }[]).filter((e) => marques.includes(e.marque) || (e.stock ?? 0) !== 0);
  const nomVar = new Map<string, string>(vars.map((v) => [v.id, `${v.reference} (${v.marque})`]));
  const nomFiche = f ? `${f.reference}${f.marque ? ` (${f.marque})` : ""}` : "fiche";
  const nom = (eq: string | null) => (eq ? nomVar.get(eq) ?? "variante" : nomFiche);
  const cible = JSON.stringify([{ product_id: productId }]); // jsonb « contient » : à passer en texte JSON (sinon « invalid input syntax for type json »)

  const [ventes, recs, retsC, regs, trs] = await Promise.all([
    paquets<{ quantite: number; equivalence_id: string | null; sale: { date: string; created_at: string; client: { nom: string } | null } | null }>((de, a) =>
      supabase.from("sale_items").select("quantite, equivalence_id, sale:sales(date, created_at, client:clients(nom))").eq("product_id", productId).order("id").range(de, a)),
    paquets<{ date: string; created_at: string; type?: string; lignes: { product_id: string; equivalence_id: string | null; quantite: number }[]; fournisseur: { nom: string } | null }>((de, a) =>
      supabase.from("receptions").select("date, created_at, type, lignes, fournisseur:fournisseurs(nom)").contains("lignes", cible).order("id").range(de, a)),
    paquets<{ date: string; created_at: string; mode: string; lignes: { product_id: string; equivalence_id: string | null; quantite: number }[]; client: { nom: string } | null }>((de, a) =>
      supabase.from("retours_clients").select("date, created_at, mode, lignes, client:clients(nom)").contains("lignes", cible).order("id").range(de, a)),
    paquets<Regularisation>((de, a) => supabase.from("regularisations").select("*").eq("product_id", productId).order("id").range(de, a)),
    paquets<{ date: string; created_at: string; depot_de: string; depot_vers: string; lignes: { product_id: string; equivalence_id: string | null; quantite: number }[] }>((de, a) =>
      supabase.from("transferts").select("date, created_at, depot_de, depot_vers, lignes").contains("lignes", cible).order("id").range(de, a)),
  ]);

  const m: Mouvement[] = [];
  for (const v of ventes) m.push({ date: v.sale?.date ?? "", quand: v.sale?.created_at ?? "", type: "vente", libelle: `Vente · ${v.sale?.client?.nom ?? "?"}`, variante: nom(v.equivalence_id), equivalence_id: v.equivalence_id, delta: -v.quantite });
  for (const r of recs) for (const l of r.lignes ?? []) {
    if (l.product_id !== productId) continue;
    const retour = r.type === "retour" || l.quantite < 0;
    m.push({ date: r.date, quand: r.created_at, type: retour ? "retour_fournisseur" : "reception", libelle: `${retour ? "Rendu à" : "Reçu de"} ${r.fournisseur?.nom ?? "?"}`, variante: nom(l.equivalence_id), equivalence_id: l.equivalence_id, delta: l.quantite });
  }
  for (const r of retsC) for (const l of r.lignes ?? []) {
    if (l.product_id !== productId) continue;
    m.push({ date: r.date, quand: r.created_at, type: "retour_client", libelle: `Rendu par ${r.client?.nom ?? "?"}`, variante: nom(l.equivalence_id), equivalence_id: l.equivalence_id, delta: l.quantite });
  }
  for (const g of regs) m.push({ date: g.date, quand: g.created_at, type: "correction", libelle: `${libelleMotif(g.motif)}${g.note ? ` · ${g.note}` : ""}${g.stock_avant != null ? ` (${g.stock_avant} → ${g.stock_apres})` : ""}`, variante: nom(g.equivalence_id), equivalence_id: g.equivalence_id, delta: g.quantite });
  for (const t of trs) for (const l of t.lignes ?? []) {
    if (l.product_id !== productId) continue;
    m.push({ date: t.date, quand: t.created_at, type: "transfert", libelle: `Transfert ${t.depot_de} → ${t.depot_vers}`, variante: nom(l.equivalence_id), equivalence_id: l.equivalence_id, delta: 0 });
  }
  m.sort((a, b) => b.date.localeCompare(a.date) || b.quand.localeCompare(a.quand));
  return {
    mouvements: m,
    variantes: [{ id: null, nom: nomFiche, stock: f?.stock ?? 0 }, ...vars.map((v) => ({ id: v.id, nom: `${v.reference} (${v.marque})`, stock: v.stock ?? 0 }))],
  };
}
