// Remboursement « bon par bon » du fournisseur à crédit (dinoun) — utilisé par Ventes (camion) et Fournisseurs.
// Rembourser un bon = une avance (paiement) égale au COÛT d'achat de sa marchandise crédit, liée au bon (sale_id).
// Le paiement du garage est indépendant : il ne touche jamais la dette fournisseur.
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

export async function setBonRembourse(
  bon: { id: string; date: string; clientNom?: string },
  rembourse: boolean,
  creditIds: Set<string>,
): Promise<{ ok: boolean; montant: number; error?: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: false, montant: 0, error: "Impossible hors-ligne." };
  const { error } = await supabase.from("sales").update({ fournisseur_paye: rembourse }).eq("id", bon.id);
  if (error) return { ok: false, montant: 0, error: "Colle d'abord le SQL supabase/sale_fournisseur_paye.sql dans Supabase." };
  if (!rembourse) {
    await supabase.from("avances").delete().eq("sale_id", bon.id);
    return { ok: true, montant: 0 };
  }
  const { data } = await supabase.from("sale_items")
    .select("quantite, cout_unitaire, fournisseur_id, product:products(prix_achat)").eq("sale_id", bon.id);
  const parF = coutCreditParFournisseur((data ?? []) as unknown as ItemCout[], creditIds);
  const date = new Date().toISOString().split("T")[0];
  const rows = [...parF].filter(([, m]) => m > 0).map(([fid, m]) => ({
    fournisseur_id: fid, date, montant: m, note: `Bon ${bon.clientNom ?? ""} du ${bon.date} (remboursé)`, sale_id: bon.id,
  }));
  if (rows.length) await supabase.from("avances").insert(rows);
  return { ok: true, montant: rows.reduce((s, r) => s + r.montant, 0) };
}
