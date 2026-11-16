// Fournisseur à crédit (dinoun) : le PORTEFEUILLE (16/11/2026, façon de faire de l'utilisateur, BIBLE §8.29).
// 1. Un bon est payé par le garage → l'utilisateur met de côté le coût de la marchandise dinoun dans un portefeuille :
//    camion « 👛 Mettre de côté » (Ventes ou Fournisseurs). La dette « marchandise prise » NE BAISSE PAS.
// 2. Après un mois ou plus, il compte l'argent du portefeuille et le donne à dinoun : « Donner à dinoun » →
//    UNE avance (paiement) de la somme comptée → c'est là que la dette baisse, et le portefeuille se vide.
// Avant le 16/11, le camion créait tout de suite une avance par bon (avances.sale_id) : ces anciens bons restent
// « donnés » tels quels (leur annulation supprime toujours leur avance).
// Le portefeuille est gardé dans la table reglages (privée, équipe seulement) : clé « portefeuille_dinoun ».
// Le paiement du garage (client) est indépendant : il ne touche jamais la dette fournisseur.
import { supabase } from "./supabase";

type ItemCout = { quantite: number; cout_unitaire: number | null; fournisseur_id: string | null; product?: { prix_achat: number } | null };

// Coût de la marchandise crédit d'un bon, par fournisseur crédit
export function coutCreditParFournisseur(items: ItemCout[], creditIds: Set<string>): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of items) {
    if (!l.fournisseur_id || !creditIds.has(l.fournisseur_id)) continue; // capital = déjà ton argent
    m.set(l.fournisseur_id, (m.get(l.fournisseur_id) ?? 0) + l.quantite * (l.cout_unitaire ?? l.product?.prix_achat ?? 0));
  }
  return m;
}

// ---------- Le portefeuille ----------
// montant = coût de la marchandise dinoun du bon ; vendu = total du bon (l'argent ramassé chez le client)
export type BonPortefeuille = { sale_id: string; fournisseur_id: string; montant: number; vendu?: number; bon_date: string; client: string; le: string };

/** Totaux d'un portefeuille : vendu (un bon compté une seule fois) et coût dinoun. */
export function totauxPortefeuille(bons: BonPortefeuille[]): { vendu: number; cout: number; nb: number } {
  const vus = new Set<string>();
  let vendu = 0, cout = 0;
  for (const b of bons) { cout += b.montant; if (!vus.has(b.sale_id)) { vus.add(b.sale_id); vendu += b.vendu ?? 0; } }
  return { vendu, cout, nb: vus.size };
}
const CLE = "portefeuille_dinoun";
const CLE_DONNES = "portefeuille_dinoun_donnes"; // trace des versements : { le, fournisseur_id, montant, prevu, bons }

async function lire<T>(cle: string): Promise<T[]> {
  const { data } = await supabase.from("reglages").select("valeur").eq("cle", cle).maybeSingle();
  const v = (data as { valeur?: unknown } | null)?.valeur;
  return Array.isArray(v) ? (v as T[]) : [];
}
async function ecrire(cle: string, valeur: unknown[]): Promise<string | null> {
  const { error } = await supabase.from("reglages").upsert({ cle, valeur }, { onConflict: "cle" });
  return error ? error.message : null;
}

/** Les bons mis de côté et pas encore donnés à dinoun. */
export function lirePortefeuille(): Promise<BonPortefeuille[]> {
  return lire<BonPortefeuille>(CLE).catch(() => []);
}

/** Retire un bon du portefeuille (bon supprimé, ou mis de côté par erreur). */
export async function retirerDuPortefeuille(saleId: string): Promise<void> {
  const p = await lirePortefeuille();
  if (p.some((b) => b.sale_id === saleId)) await ecrire(CLE, p.filter((b) => b.sale_id !== saleId));
}

/**
 * Camion d'un bon. mettreDeCote = true : le coût dinoun du bon va dans le portefeuille (la dette ne bouge pas).
 * false : annule — le bon sort du portefeuille ; un ancien bon (avant le 16/11) perd son avance (la dette remonte).
 */
export async function setBonRembourse(
  bon: { id: string; date: string; clientNom?: string },
  mettreDeCote: boolean,
  creditIds: Set<string>,
): Promise<{ ok: boolean; montant: number; error?: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: false, montant: 0, error: "Impossible hors-ligne." };
  const { error } = await supabase.from("sales").update({ fournisseur_paye: mettreDeCote }).eq("id", bon.id);
  if (error) return { ok: false, montant: 0, error: "Colle d'abord le SQL supabase/sale_fournisseur_paye.sql dans Supabase." };
  if (!mettreDeCote) {
    await retirerDuPortefeuille(bon.id);
    await supabase.from("avances").delete().eq("sale_id", bon.id); // anciens bons seulement (avant le 16/11)
    return { ok: true, montant: 0 };
  }
  const [{ data }, { data: vente }] = await Promise.all([
    supabase.from("sale_items").select("quantite, cout_unitaire, fournisseur_id, product:products(prix_achat)").eq("sale_id", bon.id),
    supabase.from("sales").select("total").eq("id", bon.id).maybeSingle(),
  ]);
  const parF = coutCreditParFournisseur((data ?? []) as unknown as ItemCout[], creditIds);
  const le = new Date().toISOString();
  const vendu = Number((vente as { total?: number } | null)?.total ?? 0);
  const nouveaux: BonPortefeuille[] = [...parF].filter(([, m]) => m > 0)
    .map(([fid, m]) => ({ sale_id: bon.id, fournisseur_id: fid, montant: Math.round(m * 100) / 100, vendu, bon_date: bon.date, client: bon.clientNom ?? "", le }));
  const p = (await lirePortefeuille()).filter((b) => b.sale_id !== bon.id);
  const err = await ecrire(CLE, [...p, ...nouveaux]);
  if (err) {
    await supabase.from("sales").update({ fournisseur_paye: false }).eq("id", bon.id);
    return { ok: false, montant: 0, error: `Portefeuille non enregistré : ${err}` };
  }
  return { ok: true, montant: nouveaux.reduce((s, b) => s + b.montant, 0) };
}

/** L'argent compté du portefeuille est donné au fournisseur : UNE avance, puis le portefeuille de ce fournisseur se vide. */
export async function donnerPortefeuille(fournisseurId: string, montantCompte: number, date: string): Promise<{ ok: boolean; error?: string; prevu: number; nb: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: false, error: "Impossible hors-ligne.", prevu: 0, nb: 0 };
  const p = await lirePortefeuille();
  const bons = p.filter((b) => b.fournisseur_id === fournisseurId);
  const prevu = Math.round(bons.reduce((s, b) => s + b.montant, 0) * 100) / 100;
  if (!(montantCompte > 0)) return { ok: false, error: "Tape la somme comptée.", prevu, nb: bons.length };
  const dates = bons.map((b) => b.bon_date).sort();
  const { vendu } = totauxPortefeuille(bons);
  const note = `Portefeuille : ${bons.length} bon${bons.length > 1 ? "s" : ""}${dates.length ? ` du ${dates[0]} au ${dates[dates.length - 1]}` : ""} · vendu ${vendu.toFixed(0)} MAD · coût dinoun ${prevu.toFixed(0)} MAD${Math.abs(montantCompte - prevu) >= 1 ? ` · donné ${montantCompte.toFixed(0)} MAD` : ""}`;
  const { error } = await supabase.from("avances").insert({ fournisseur_id: fournisseurId, date, montant: montantCompte, note });
  if (error) return { ok: false, error: error.message, prevu, nb: bons.length };
  const donnes = await lire<unknown>(CLE_DONNES).catch(() => []);
  await ecrire(CLE_DONNES, [...donnes, { le: new Date().toISOString(), date, fournisseur_id: fournisseurId, montant: montantCompte, prevu, bons }]);
  await ecrire(CLE, p.filter((b) => b.fournisseur_id !== fournisseurId));
  return { ok: true, prevu, nb: bons.length };
}
