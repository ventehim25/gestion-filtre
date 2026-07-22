// Catalogue de prix (privé, envoyé aux garages) — construit EN DIRECT depuis les produits
// que le commerçant gère dans /produits. Change un prix / un stock → le catalogue change tout seul.
import { supabase } from "./supabase";
import { ProductCategory } from "@/types/database";

// Clé du lien privé. Le catalogue de prix ne s'ouvre qu'avec ?k=<clé>.
// Pour changer la clé : modifie cette valeur (partage ensuite le nouveau lien).
export const TARIF_KEY = "garages2026";

export const CAT_FR: Record<string, string> = {
  filtre_huile: "Filtres à huile",
  filtre_air: "Filtres à air",
  filtre_carburant: "Filtres à carburant",
  filtre_habitacle: "Filtres d'habitacle",
  filtre_refroidissement: "Filtres de refroidissement",
  huile_moteur: "Huile moteur",
  autre: "Autres pièces",
};

// Ordre d'affichage des catégories
export const CAT_ORDER: ProductCategory[] = [
  "filtre_huile", "filtre_air", "filtre_carburant", "filtre_habitacle",
  "filtre_refroidissement", "huile_moteur", "autre",
];

export type CatItem = {
  reference: string;
  marque: string;
  categorie: string;
  prix: number;        // prix de vente (promo si présente) — JAMAIS le prix d'achat
  promo: boolean;
  prixAvant?: number;  // prix barré si promo
};

// Tous les articles DISPONIBLES (stock > 0) avec un prix : produits Filtron + variantes de marque.
export async function loadCatalogueItems(): Promise<CatItem[]> {
  // 1) Produits (paginés)
  type P = { id: string; reference: string; marque: string | null; categorie: string; prix_vente: number; prix_promo: number | null; stock: number };
  const prods: P[] = [];
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.from("products")
      .select("id, reference, marque, categorie, prix_vente, prix_promo, stock")
      .range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    prods.push(...(data as P[]));
    if (data.length < 1000) break;
  }
  const catById = new Map(prods.map(p => [p.id, p.categorie]));

  const items: CatItem[] = [];
  for (const p of prods) {
    if (p.stock > 0 && p.prix_vente > 0) {
      const promo = p.prix_promo != null && p.prix_promo > 0;
      items.push({
        reference: p.reference, marque: p.marque || "Filtron", categorie: p.categorie,
        prix: promo ? (p.prix_promo as number) : p.prix_vente, promo,
        prixAvant: promo ? p.prix_vente : undefined,
      });
    }
  }

  // 2) Variantes de marque (paginées) — dispo avec un prix
  type E = { product_id: string; marque: string; reference: string; prix: number | null; stock: number };
  for (let i = 0; i < 30; i++) {
    const { data } = await supabase.from("equivalences")
      .select("product_id, marque, reference, prix, stock").range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    for (const e of data as E[]) {
      if (e.stock > 0 && e.prix != null && e.prix > 0) {
        items.push({
          reference: e.reference, marque: e.marque,
          categorie: catById.get(e.product_id) ?? "autre",
          prix: e.prix, promo: false,
        });
      }
    }
    if (data.length < 1000) break;
  }

  // Tri : par catégorie (ordre défini) puis par référence
  const order = (c: string) => { const i = CAT_ORDER.indexOf(c as ProductCategory); return i < 0 ? 99 : i; };
  items.sort((a, b) => order(a.categorie) - order(b.categorie) || a.reference.localeCompare(b.reference, undefined, { numeric: true }));
  return items;
}
