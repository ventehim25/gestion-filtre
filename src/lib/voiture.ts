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

/** Ce qu'il y a dans la voiture (quantité > 0). */
export async function stockVoiture(): Promise<ArticleVoiture[]> {
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
  let q = db.from("stock_depots").select("id, quantite").eq("product_id", l.product_id).eq("depot", DEPOT);
  q = l.equivalence_id ? q.eq("equivalence_id", l.equivalence_id) : q.is("equivalence_id", null);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  const ligne = data as { id: string; quantite: number } | null;
  if (ligne) {
    const { error: e } = await db.from("stock_depots").update({ quantite: Math.max(0, ligne.quantite + delta), maj_le: new Date().toISOString() }).eq("id", ligne.id);
    if (e) throw e;
  } else if (delta > 0) {
    const { error: e } = await db.from("stock_depots").insert({ product_id: l.product_id, equivalence_id: l.equivalence_id, depot: DEPOT, quantite: delta });
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

export async function derniersTransferts(): Promise<Transfert[]> {
  const { data } = await supabase.from("transferts").select("*").order("created_at", { ascending: false }).limit(15);
  return (data ?? []) as Transfert[];
}

// Vente « sortie de la voiture » : choix gardé sur le téléphone le temps de la tournée
const CLE_VENTE = "filtropro_vente_voiture";
export const lireVenteVoiture = () => { try { return localStorage.getItem(CLE_VENTE) === "1"; } catch { return false; } };
export const choisirVenteVoiture = (v: boolean) => { try { localStorage.setItem(CLE_VENTE, v ? "1" : "0"); } catch { /* rien */ } };
