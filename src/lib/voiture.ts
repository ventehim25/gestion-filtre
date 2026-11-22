// Stock de la voiture + transferts (nouveauté n° 7, inspirée des « dépôts » du logiciel « GMP » de dinoun — BIBLE §8.41).
// Le stock de l'appli (products.stock / equivalences.stock) reste le stock TOTAL. stock_depots dit combien de ce total
// est chargé dans la voiture pour la tournée → charger / décharger ne change pas le total, une vente « sortie de la
// voiture » enlève du total (comme toute vente) ET de la voiture. Magasin = total − voiture.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Transfert } from "@/types/database";

export const DEPOT = "voiture";
export type LigneVoiture = { product_id: string; equivalence_id: string | null; ref: string; quantite: number };
export type ArticleVoiture = LigneVoiture & { id: string; prix: number; stockTotal: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

// ───────────── Un seul stock : la voiture (22/11/2026, BIBLE §8.54) ─────────────
// Demande : « pour simplifier, un seul stock voiture : tout ce que j'ai reçu et pas encore vendu est dans la voiture ».
// Réglage « stock_unique » (reglages) : vrai = la voiture EST le stock (page Stock voiture = tout le stock, sans
// charger / décharger ; plus rien à suivre à part) ; faux = magasin + voiture comme avant (dépôts).
export async function lireStockUnique(): Promise<boolean> {
  const { data } = await supabase.from("reglages").select("valeur").eq("cle", "stock_unique").maybeSingle();
  return (data as { valeur?: unknown } | null)?.valeur !== false; // vrai par défaut (choix de l'utilisateur)
}
export async function choisirStockUnique(v: boolean): Promise<void> {
  await supabase.from("reglages").upsert({ cle: "stock_unique", valeur: v, modifie_le: new Date().toISOString() }, { onConflict: "cle" });
}

/** Tout le stock (fiches + variantes de marque, quantité > 0) vu comme « dans la voiture ». */
async function toutLeStock(): Promise<ArticleVoiture[]> {
  const out: ArticleVoiture[] = [];
  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabase.from("products").select("id, reference, prix_vente, stock").gt("stock", 0).order("id").range(i * 1000, i * 1000 + 999);
    if (error || !data?.length) break;
    for (const p of data as { id: string; reference: string; prix_vente: number; stock: number }[]) out.push({ id: `p-${p.id}`, product_id: p.id, equivalence_id: null, ref: p.reference, quantite: p.stock, prix: Number(p.prix_vente ?? 0), stockTotal: p.stock });
    if (data.length < 1000) break;
  }
  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabase.from("equivalences").select("id, product_id, marque, reference, prix, stock, products(prix_vente)").gt("stock", 0).order("id").range(i * 1000, i * 1000 + 999);
    if (error || !data?.length) break;
    for (const e of data as unknown as { id: string; product_id: string; marque: string; reference: string; prix: number | null; stock: number; products: { prix_vente: number } | null }[])
      out.push({ id: `e-${e.id}`, product_id: e.product_id, equivalence_id: e.id, ref: `${e.reference} (${e.marque})`, quantite: e.stock, prix: Number(e.prix ?? e.products?.prix_vente ?? 0), stockTotal: e.stock });
    if (data.length < 1000) break;
  }
  return out.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
}

/** Ce qu'il y a dans la voiture (quantité > 0) : tout le stock si « un seul stock », sinon le dépôt « voiture ». */
export async function stockVoiture(): Promise<ArticleVoiture[]> {
  if (await lireStockUnique()) return toutLeStock();
  const out: ArticleVoiture[] = [];
  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabase.from("stock_depots")
      .select("id, product_id, equivalence_id, quantite, product:products(reference, prix_vente, stock), equivalence:equivalences(reference, marque, prix, stock)")
      .eq("depot", DEPOT).gt("quantite", 0).order("id").range(i * 1000, i * 1000 + 999);
    if (error || !data?.length) break;
    type R = { id: string; product_id: string; equivalence_id: string | null; quantite: number; product: { reference: string; prix_vente: number; stock: number } | null; equivalence: { reference: string; marque: string; prix: number | null; stock: number | null } | null };
    for (const r of data as unknown as R[]) out.push({
      id: r.id, product_id: r.product_id, equivalence_id: r.equivalence_id, quantite: r.quantite,
      ref: r.equivalence ? `${r.equivalence.reference} (${r.equivalence.marque})` : r.product?.reference ?? "?",
      prix: Number(r.equivalence?.prix ?? r.product?.prix_vente ?? 0),
      stockTotal: Number(r.equivalence ? r.equivalence.stock ?? 0 : r.product?.stock ?? 0),
    });
    if (data.length < 1000) break;
  }
  return out.sort((a, b) => a.ref.localeCompare(b.ref));
}

/** Ajoute (delta > 0) ou enlève (delta < 0) des pièces dans la voiture, jamais en dessous de 0. */
export async function ajusterVoiture(db: Db, l: { product_id: string; equivalence_id: string | null }, delta: number): Promise<void> {
  return ajusterDepot(db, l, delta, DEPOT);
}

// ───────────── Marchandise d'avant (notée dans le cahier, avant l'appli) — BIBLE §8.51 ─────────────
// Elle entre dans le stock SANS réception (motif « Stock d'avant (cahier) ») → ni la dette dinoun ni le capital ne bougent.
// Le dépôt « avant:<fournisseur> » compte combien il en reste par pièce ET à qui elle est (dinoun, déjà dans sa dette
// via le cahier ; « avant » seul = à moi) : tant qu'il en reste, une vente de cette pièce prend CE fournisseur comme
// source (le camion « mettre de côté » compte ce que je dois à dinoun) et le dépôt baisse ; ensuite la source redevient
// normale (dernière réception). Demande du 22/11 : « compte-la pour dinoun, je l'ai déjà notée, sinon double solde ».
export const DEPOT_AVANT = "avant";
export const depotAvant = (fournisseurId: string | null) => (fournisseurId ? `${DEPOT_AVANT}:${fournisseurId}` : DEPOT_AVANT);

/** Ajoute un dépôt (voiture, avant…) : jamais sous 0, une ligne par pièce et dépôt. */
export async function ajusterDepot(db: Db, l: { product_id: string; equivalence_id: string | null }, delta: number, depot: string): Promise<void> {
  let q = db.from("stock_depots").select("id, quantite").eq("product_id", l.product_id).eq("depot", depot);
  q = l.equivalence_id ? q.eq("equivalence_id", l.equivalence_id) : q.is("equivalence_id", null);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  const ligne = data as { id: string; quantite: number } | null;
  if (ligne) {
    const { error: e } = await db.from("stock_depots").update({ quantite: Math.max(0, ligne.quantite + delta), maj_le: new Date().toISOString() }).eq("id", ligne.id);
    if (e) throw e;
  } else if (delta > 0) {
    const { error: e } = await db.from("stock_depots").insert({ product_id: l.product_id, equivalence_id: l.equivalence_id, depot, quantite: delta });
    if (e) throw e;
  }
}

/** Charger (magasin → voiture) ou décharger (voiture → magasin) : une ligne « transferts » (trace) puis la voiture. */
export async function transferer(sens: "charger" | "decharger", lignes: LigneVoiture[], note?: string): Promise<void> {
  const ok = lignes.filter((l) => l.quantite > 0);
  if (!ok.length) throw new Error("Aucune pièce choisie.");
  const { error } = await supabase.from("transferts").insert({
    date: new Date().toISOString().slice(0, 10), depot_de: sens === "charger" ? "magasin" : DEPOT, depot_vers: sens === "charger" ? DEPOT : "magasin",
    lignes: ok, note: note || null,
  });
  if (error) throw error;
  for (const l of ok) await ajusterVoiture(supabase, l, sens === "charger" ? l.quantite : -l.quantite);
}

/** Entrée de la marchandise d'avant : stock + (motif « stock d'avant »), dépôt « avant » + et, si elle est dans la voiture,
 *  dépôt « voiture » +. Une ligne « transferts » cahier → voiture garde la trace. Aucune réception, aucun fournisseur. */
export async function ajouterStockAvant(lignes: LigneVoiture[], dansVoiture: boolean, fournisseurId: string | null): Promise<void> {
  const ok = lignes.filter((l) => l.quantite > 0);
  if (!ok.length) throw new Error("Aucune pièce comptée.");
  const { corrigerStock } = await import("./inventaire");
  for (const l of ok) {
    await corrigerStock({ product_id: l.product_id, equivalence_id: l.equivalence_id, delta: l.quantite, motif: "stock_avant", note: dansVoiture ? "marchandise d'avant (cahier), dans la voiture" : "marchandise d'avant (cahier)" });
    await ajusterDepot(supabase, l, l.quantite, depotAvant(fournisseurId));
    if (dansVoiture) await ajusterDepot(supabase, l, l.quantite, DEPOT);
  }
  if (dansVoiture) await supabase.from("transferts").insert({ date: new Date().toISOString().slice(0, 10), depot_de: "cahier", depot_vers: DEPOT, lignes: ok, note: "marchandise d'avant (cahier)" });
}

export type ResteAvant = { quantite: number; fournisseur_id: string | null; depot: string };
/** Ce qu'il reste de marchandise d'avant, par pièce (« product_id|equivalence_id » → quantité, à qui, dépôt). */
export async function resteStockAvant(): Promise<Map<string, ResteAvant>> {
  const m = new Map<string, ResteAvant>();
  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabase.from("stock_depots").select("id, product_id, equivalence_id, quantite, depot").like("depot", `${DEPOT_AVANT}%`).gt("quantite", 0).order("id").range(i * 1000, i * 1000 + 999);
    if (error || !data?.length) break;
    for (const r of data as { product_id: string; equivalence_id: string | null; quantite: number; depot: string }[]) {
      const k = `${r.product_id}|${r.equivalence_id ?? ""}`;
      if (!m.has(k)) m.set(k, { quantite: r.quantite, fournisseur_id: r.depot.includes(":") ? r.depot.split(":")[1] : null, depot: r.depot });
    }
    if (data.length < 1000) break;
  }
  return m;
}

export async function derniersTransferts(): Promise<Transfert[]> {
  const { data } = await supabase.from("transferts").select("*").order("created_at", { ascending: false }).limit(15);
  return (data ?? []) as Transfert[];
}

// Vente « sortie de la voiture » : choix gardé sur le téléphone le temps de la tournée
const CLE_VENTE = "filtropro_vente_voiture";
export const lireVenteVoiture = () => { try { return localStorage.getItem(CLE_VENTE) === "1"; } catch { return false; } };
export const choisirVenteVoiture = (v: boolean) => { try { localStorage.setItem(CLE_VENTE, v ? "1" : "0"); } catch { /* rien */ } };
