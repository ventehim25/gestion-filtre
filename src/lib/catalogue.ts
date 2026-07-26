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
  imageUrl?: string | null; aliases?: string[]; productId?: string;
};
export type PubItem = { reference: string; marque: string; categorie: string; imageUrl?: string | null; aliases?: string[]; productId?: string };

type ProdRow = { id: string; reference: string; marque: string | null; categorie: string; stock: number; image_url: string | null; prix_vente?: number; prix_promo?: number | null };
type ParentRow = { categorie: string | null; image_url: string | null; reference: string | null } | null;
type EqRow = { product_id: string; marque: string; reference: string; stock: number; prix?: number | null; products?: ParentRow };

// PERF — le catalogue n'affiche QUE les articles en stock (~120 lignes) alors que la
// base contient 3200+ produits et 23000+ équivalences. On ne chargeait tout ça que pour
// la recherche « par n'importe quelle référence équivalente ». Désormais :
//   1) on charge UNIQUEMENT le stock (2 requêtes) → affichage immédiat ;
//   2) les alias (recherche multi-réfs) sont enrichis ENSUITE, en fond, et seulement
//      pour les produits affichés (equivalences filtrées par product_id).

// Produits en stock (quelques centaines max → 1 page en général).
async function stockProducts(withPrice: boolean): Promise<ProdRow[]> {
  const cols = withPrice
    ? "id, reference, marque, categorie, stock, image_url, prix_vente, prix_promo"
    : "id, reference, marque, categorie, stock, image_url";
  const rows: ProdRow[] = [];
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.from("products").select(cols).gt("stock", 0).range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as ProdRow[]));
    if (data.length < 1000) break;
  }
  return rows;
}
// Variantes de marque en stock, avec les infos du produit parent (catégorie, photo, réf).
async function stockEquivs(withPrice: boolean): Promise<EqRow[]> {
  const cols = withPrice
    ? "product_id, marque, reference, stock, prix, products(categorie, image_url, reference)"
    : "product_id, marque, reference, stock, products(categorie, image_url, reference)";
  const rows: EqRow[] = [];
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.from("equivalences").select(cols).gt("stock", 0).range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as EqRow[]));
    if (data.length < 1000) break;
  }
  return rows;
}

// Alias = toutes les références connues des produits AFFICHÉS (pour retrouver le filtre
// en tapant n'importe quelle marque). Requête ciblée par product_id, découpée par lots
// pour ne pas dépasser la longueur d'URL.
async function aliasesFor(productIds: string[]): Promise<Map<string, string[]>> {
  const ids = [...new Set(productIds)];
  const m = new Map<string, string[]>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data } = await supabase.from("equivalences").select("product_id, reference").in("product_id", chunk);
    for (const e of (data ?? []) as { product_id: string; reference: string }[]) {
      const r = norm(e.reference); const a = m.get(e.product_id);
      if (a) a.push(r); else m.set(e.product_id, [r]);
    }
  }
  return m;
}
function mergeAliases<T extends { productId?: string; aliases?: string[] }>(items: T[], m: Map<string, string[]>): T[] {
  return items.map(i => {
    const extra = i.productId ? m.get(i.productId) : undefined;
    if (!extra) return i;
    return { ...i, aliases: [...new Set([...(i.aliases ?? []), ...extra])] };
  });
}

// ---- Catalogue PUBLIC (QR carte) : SANS prix ----
export async function loadPublicCatalogueItems(): Promise<PubItem[]> {
  const [prods, eqs] = await Promise.all([stockProducts(false), stockEquivs(false)]);
  const items: PubItem[] = [];
  for (const p of prods) items.push({ reference: p.reference, marque: p.marque || "Filtron", categorie: p.categorie, imageUrl: p.image_url, aliases: [norm(p.reference)], productId: p.id });
  for (const e of eqs) {
    const parentRef = e.products?.reference ? [norm(e.products.reference)] : [];
    items.push({ reference: e.reference, marque: e.marque, categorie: e.products?.categorie ?? "autre", imageUrl: e.products?.image_url ?? null, aliases: [norm(e.reference), ...parentRef], productId: e.product_id });
  }
  items.sort((a, b) => catOrder(a.categorie) - catOrder(b.categorie) || a.reference.localeCompare(b.reference, undefined, { numeric: true }));
  writeCache(PUB_CACHE, items);
  return items;
}
// Enrichit la recherche (alias) en fond, sans bloquer l'affichage. Met aussi le cache à jour.
export async function enrichPublicAliases(items: PubItem[]): Promise<PubItem[]> {
  const pids = items.map(i => i.productId).filter((x): x is string => !!x);
  if (pids.length === 0) return items;
  const out = mergeAliases(items, await aliasesFor(pids));
  writeCache(PUB_CACHE, out);
  return out;
}

// ---- Catalogue de PRIX (privé) : avec prix de vente (jamais le prix d'achat) ----
export async function loadCatalogueItems(): Promise<CatItem[]> {
  const [prods, eqs] = await Promise.all([stockProducts(true), stockEquivs(true)]);
  const items: CatItem[] = [];
  for (const p of prods) {
    if ((p.prix_vente ?? 0) > 0) {
      const promo = p.prix_promo != null && p.prix_promo > 0;
      items.push({
        reference: p.reference, marque: p.marque || "Filtron", categorie: p.categorie,
        prix: promo ? (p.prix_promo as number) : (p.prix_vente as number), promo,
        prixAvant: promo ? p.prix_vente : undefined, imageUrl: p.image_url, aliases: [norm(p.reference)], productId: p.id,
      });
    }
  }
  for (const e of eqs) {
    if (e.prix != null && e.prix > 0) {
      const parentRef = e.products?.reference ? [norm(e.products.reference)] : [];
      items.push({
        reference: e.reference, marque: e.marque, categorie: e.products?.categorie ?? "autre",
        prix: e.prix, promo: false, imageUrl: e.products?.image_url ?? null,
        aliases: [norm(e.reference), ...parentRef], productId: e.product_id,
      });
    }
  }
  items.sort((a, b) => catOrder(a.categorie) - catOrder(b.categorie) || a.reference.localeCompare(b.reference, undefined, { numeric: true }));
  writeCache(TARIF_CACHE, items);
  return items;
}
export async function enrichTarifAliases(items: CatItem[]): Promise<CatItem[]> {
  const pids = items.map(i => i.productId).filter((x): x is string => !!x);
  if (pids.length === 0) return items;
  const out = mergeAliases(items, await aliasesFor(pids));
  writeCache(TARIF_CACHE, out);
  return out;
}
