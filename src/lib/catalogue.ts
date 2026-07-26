// Catalogue de prix (privé, envoyé aux garages) + catalogue public (QR carte), construits
// EN DIRECT depuis les produits gérés dans /produits. Change un prix / un stock → ça suit.
import { supabase } from "./supabase";
import { ProductCategory } from "@/types/database";

// Clé du lien privé. Le catalogue de prix ne s'ouvre qu'avec ?k=<clé>.
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

export const CAT_ORDER: ProductCategory[] = [
  "filtre_huile", "filtre_air", "filtre_carburant", "filtre_habitacle",
  "filtre_refroidissement", "huile_moteur", "autre",
];

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, "");
const catOrder = (c: string) => { const i = CAT_ORDER.indexOf(c as ProductCategory); return i < 0 ? 99 : i; };

// Cache local (perf) : le catalogue re-télécharge tous les produits + équivalences à
// chaque ouverture. On garde la dernière liste construite en localStorage pour un
// affichage INSTANTANÉ (puis rafraîchissement réseau en arrière-plan côté page).
const PUB_CACHE = "fp_cat_public_v1";
const TARIF_CACHE = "fp_cat_tarif_v1";
function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try { const s = localStorage.getItem(key); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
}
function writeCache(key: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}
export function cachedPublicItems(): PubItem[] | null { return readCache<PubItem[]>(PUB_CACHE); }
export function cachedTarifItems(): CatItem[] | null { return readCache<CatItem[]>(TARIF_CACHE); }

// aliases = toutes les références connues du MÊME produit (Filtron + Mann + Bosch + OE…),
// pour qu'un garage retrouve ton filtre en tapant n'importe laquelle.
export type CatItem = {
  reference: string; marque: string; categorie: string;
  prix: number; promo: boolean; prixAvant?: number;
  imageUrl?: string | null; aliases?: string[];
};
export type PubItem = { reference: string; marque: string; categorie: string; imageUrl?: string | null; aliases?: string[] };

type ProdRow = { id: string; reference: string; marque: string | null; categorie: string; stock: number; image_url: string | null; prix_vente?: number; prix_promo?: number | null };
type EqRow = { product_id: string; marque: string; reference: string; stock: number; prix?: number | null };

async function loadProducts(withPrice: boolean): Promise<ProdRow[]> {
  const cols = withPrice
    ? "id, reference, marque, categorie, stock, image_url, prix_vente, prix_promo"
    : "id, reference, marque, categorie, stock, image_url";
  const rows: ProdRow[] = [];
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.from("products").select(cols).range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as ProdRow[]));
    if (data.length < 1000) break;
  }
  return rows;
}
async function loadEquivs(withPrice: boolean): Promise<EqRow[]> {
  const cols = withPrice ? "product_id, marque, reference, stock, prix" : "product_id, marque, reference, stock";
  const rows: EqRow[] = [];
  for (let i = 0; i < 30; i++) {
    const { data } = await supabase.from("equivalences").select(cols).range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as EqRow[]));
    if (data.length < 1000) break;
  }
  return rows;
}

// Toutes les références connues par produit (réf du produit + toutes ses équivalences)
function buildAliases(prods: ProdRow[], eqs: EqRow[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const p of prods) m.set(p.id, [norm(p.reference)]);
  for (const e of eqs) { const a = m.get(e.product_id); if (a) a.push(norm(e.reference)); else m.set(e.product_id, [norm(e.reference)]); }
  return m;
}

// ---- Catalogue PUBLIC (QR carte) : SANS prix ----
export async function loadPublicCatalogueItems(): Promise<PubItem[]> {
  const [prods, eqs] = await Promise.all([loadProducts(false), loadEquivs(false)]);
  const catById = new Map(prods.map(p => [p.id, p.categorie]));
  const imgById = new Map(prods.map(p => [p.id, p.image_url]));
  const aliases = buildAliases(prods, eqs);

  const items: PubItem[] = [];
  for (const p of prods) if (p.stock > 0) items.push({ reference: p.reference, marque: p.marque || "Filtron", categorie: p.categorie, imageUrl: p.image_url, aliases: aliases.get(p.id) });
  for (const e of eqs) if (e.stock > 0) items.push({ reference: e.reference, marque: e.marque, categorie: catById.get(e.product_id) ?? "autre", imageUrl: imgById.get(e.product_id) ?? null, aliases: aliases.get(e.product_id) });

  items.sort((a, b) => catOrder(a.categorie) - catOrder(b.categorie) || a.reference.localeCompare(b.reference, undefined, { numeric: true }));
  writeCache(PUB_CACHE, items);
  return items;
}

// ---- Catalogue de PRIX (privé) : avec prix de vente (jamais le prix d'achat) ----
export async function loadCatalogueItems(): Promise<CatItem[]> {
  const [prods, eqs] = await Promise.all([loadProducts(true), loadEquivs(true)]);
  const catById = new Map(prods.map(p => [p.id, p.categorie]));
  const imgById = new Map(prods.map(p => [p.id, p.image_url]));
  const aliases = buildAliases(prods, eqs);

  const items: CatItem[] = [];
  for (const p of prods) {
    if (p.stock > 0 && (p.prix_vente ?? 0) > 0) {
      const promo = p.prix_promo != null && p.prix_promo > 0;
      items.push({
        reference: p.reference, marque: p.marque || "Filtron", categorie: p.categorie,
        prix: promo ? (p.prix_promo as number) : (p.prix_vente as number), promo,
        prixAvant: promo ? p.prix_vente : undefined, imageUrl: p.image_url, aliases: aliases.get(p.id),
      });
    }
  }
  for (const e of eqs) {
    if (e.stock > 0 && e.prix != null && e.prix > 0) {
      items.push({
        reference: e.reference, marque: e.marque, categorie: catById.get(e.product_id) ?? "autre",
        prix: e.prix, promo: false, imageUrl: imgById.get(e.product_id) ?? null, aliases: aliases.get(e.product_id),
      });
    }
  }
  items.sort((a, b) => catOrder(a.categorie) - catOrder(b.categorie) || a.reference.localeCompare(b.reference, undefined, { numeric: true }));
  writeCache(TARIF_CACHE, items);
  return items;
}
