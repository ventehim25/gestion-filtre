// « À reprendre » (22/11/2026, demande : « les références que j'ai vendues, je dois les reprendre à nouveau : comment gérer
// plus facilement ») — BIBLE §8.56. Part de CE QUI A ÉTÉ VENDU (pas du catalogue entier) : chaque article vendu sur la
// période (fiche Filtron… ou variante de marque Flag, Wix…), ce qu'il en reste, et une quantité proposée = ce qui a été
// vendu − ce qui reste. Rangé par fournisseur (celui de la dernière réception de l'article, sinon le fournisseur à crédit).
import { supabase } from "./supabase";

export type ARepr = {
  cle: string; product_id: string; equivalence_id: string | null; ref: string; marque: string; filtron: string | null;
  vendu: number; stock: number; derniere: string; prix_achat: number; prix_vente: number; fournisseur_id: string | null; suggestion: number;
};

export async function articlesAReprendre(depuis: string): Promise<ARepr[]> {
  type L = {
    product_id: string; equivalence_id: string | null; quantite: number;
    sale: { date: string } | null;
    product: { reference: string; marque: string | null; stock: number; prix_achat: number; prix_vente: number } | null;
    equivalence: { reference: string; marque: string; stock: number | null; prix_achat: number | null; prix: number | null } | null;
  };
  const lignes: L[] = [];
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.from("sale_items")
      .select("id, product_id, equivalence_id, quantite, sale:sales!inner(date), product:products(reference, marque, stock, prix_achat, prix_vente), equivalence:equivalences(reference, marque, stock, prix_achat, prix)")
      .gte("sales.date", depuis).order("id").range(i * 1000, i * 1000 + 999);
    if (error || !data?.length) break;
    lignes.push(...(data as unknown as L[]));
    if (data.length < 1000) break;
  }
  // Fournisseur de la dernière réception de chaque article (ordre des dates : la plus récente gagne)
  const source = new Map<string, string>();
  const { data: recs } = await supabase.from("receptions").select("fournisseur_id, lignes, type").order("date").order("created_at").range(0, 9999);
  for (const r of (recs ?? []) as { fournisseur_id: string; type?: string; lignes: { product_id: string; equivalence_id: string | null; quantite: number }[] | null }[]) {
    if (r.type === "retour") continue;
    for (const l of r.lignes ?? []) if (l.quantite > 0) source.set(`${l.product_id}|${l.equivalence_id ?? ""}`, r.fournisseur_id);
  }
  const { data: fs } = await supabase.from("fournisseurs").select("id, type").order("nom");
  const parDefaut = ((fs ?? []) as { id: string; type: string | null }[]).find((f) => (f.type ?? "credit") === "credit")?.id ?? null;

  const m = new Map<string, ARepr>();
  for (const l of lignes) {
    if (!l.product) continue;
    const k = `${l.product_id}|${l.equivalence_id ?? ""}`;
    const g = m.get(k) ?? {
      cle: k, product_id: l.product_id, equivalence_id: l.equivalence_id,
      ref: l.equivalence ? l.equivalence.reference : l.product.reference,
      marque: l.equivalence ? l.equivalence.marque : l.product.marque ?? "",
      filtron: l.equivalence ? `${l.product.marque ?? "Filtron"} ${l.product.reference}` : null,
      vendu: 0, stock: Number(l.equivalence ? l.equivalence.stock ?? 0 : l.product.stock),
      derniere: "", prix_achat: Number(l.equivalence?.prix_achat ?? l.product.prix_achat ?? 0), prix_vente: Number(l.equivalence?.prix ?? l.product.prix_vente ?? 0),
      fournisseur_id: source.get(k) ?? parDefaut, suggestion: 0,
    };
    g.vendu += l.quantite;
    if ((l.sale?.date ?? "") > g.derniere) g.derniere = l.sale?.date ?? "";
    m.set(k, g);
  }
  for (const g of m.values()) g.suggestion = Math.max(0, g.vendu - Math.max(0, g.stock));
  return [...m.values()].sort((a, b) => (b.suggestion - a.suggestion) || a.ref.localeCompare(b.ref, undefined, { numeric: true }));
}

// Passage à la Réception : les lignes cochées sont gardées sur le téléphone, la Réception s'ouvre déjà remplie
export const CLE_PREREMPLI = "fp_reception_prefill";
export type Prerempli = { fournisseur_id: string; lignes: { product_id: string; equivalence_id: string | null; marque: string; reference: string; quantite: number; prix_achat: number; prix_vente: number }[] };
