// N'importe quelle référence → l'équivalent Filtron, comme sur filtron.eu (BIBLE §8.42).
// Demande de l'utilisateur : « je tape la référence que le client me donne (Mann, Bosch…) et je trouve l'équivalent
// Filtron et les autres ». La base ne contient les marques concurrentes que pour quelques fiches ; le catalogue
// officiel Filtron les contient toutes → on lui demande (relais /api/equivalence), puis on retrouve la fiche Filtron
// dans l'appli (stock, prix, voitures, autres équivalences).
import { supabase } from "./supabase";
import type { Product } from "@/types/database";

export type EquivFiltron = { numero: string; marque: string; filtron: string };
export type EquivTrouve = EquivFiltron & { produit: Product | null; marqueApp: string | null };

// Nom de la marque chez Filtron → nom de la marque dans l'appli (pour créer la bonne variante en Réception)
const MARQUES: Record<string, string> = {
  "MANN-FILTER": "Mann", MANN: "Mann", KNECHT: "Mahle", MAHLE: "Mahle", "KNECHT/MAHLE": "Mahle", PURFLUX: "Purflux",
  WIX: "Wix", "WIX FILTERS": "Wix", MECAFILTER: "Mecafilter", BOSCH: "Bosch", UFI: "UFI", FRAM: "Fram", HENGST: "Hengst",
  CHAMPION: "Champion", MISFAT: "Misfat", FILTRON: "Filtron", SOFIMA: "UFI",
};
export const marqueApp = (m: string) => {
  const u = m.trim().toUpperCase();
  if (MARQUES[u]) return MARQUES[u];
  // Filtron écrit parfois « MAHLE (KNECHT/MAHLE) », « BOSCH USA », « WIX FILTERS »…
  if (/\bMANN\b/.test(u)) return "Mann";
  if (/MAHLE|KNECHT/.test(u)) return "Mahle";
  if (/^WIX\b/.test(u)) return "Wix";
  if (/^BOSCH\b/.test(u)) return "Bosch";
  if (/^PURFLUX\b/.test(u)) return "Purflux";
  if (/^HENGST\b/.test(u)) return "Hengst";
  return null;
};
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

const cache = new Map<string, Promise<EquivFiltron[]>>();
/** Réponses brutes du catalogue Filtron (« contient » : « W 712 » ramène W 712, W 712/75…). */
export function chercherChezFiltron(texte: string): Promise<EquivFiltron[]> {
  const q = texte.trim();
  const k = norm(q);
  if (k.length < 3) return Promise.resolve([]);
  const deja = cache.get(k);
  if (deja) return deja;
  const p = fetch(`/api/equivalence?q=${encodeURIComponent(q)}`)
    .then((r) => r.json())
    .then((d: { items?: EquivFiltron[] }) => d.items ?? [])
    .catch(() => { cache.delete(k); return []; });
  cache.set(k, p);
  return p;
}

export type Croisee = { product_id: string | null; marque: string; reference: string; filtron: string };

/** Copie du catalogue Filtron dans la base (table references_croisees, BIBLE §8.42) : réf. qui COMMENCE par la saisie,
 *  espaces ignorés. Marche même si le site Filtron est lent ou en panne. Table absente = []. */
export async function croiseesLocales(texte: string, limite = 40): Promise<EquivTrouve[]> {
  const k = norm(texte);
  if (k.length < 3) return [];
  const { data, error } = await supabase.from("references_croisees").select("product_id, marque, reference, filtron").like("ref_norm", k + "%").order("ref_norm").limit(limite);
  if (error || !data?.length) return [];
  const lignes = data as Croisee[];
  const ids = [...new Set(lignes.map((l) => l.product_id).filter(Boolean) as string[])];
  const { data: fiches } = ids.length ? await supabase.from("products").select("*").in("id", ids) : { data: [] };
  const parId = new Map(((fiches ?? []) as Product[]).map((p) => [p.id, p]));
  return lignes.map((l) => ({ numero: l.reference, marque: l.marque, filtron: l.filtron, produit: l.product_id ? parId.get(l.product_id) ?? null : null, marqueApp: marqueApp(l.marque) }));
}

/** Toutes les autres marques des fiches affichées (Mann, Mahle, Purflux…), par fiche. */
export async function autresMarques(productIds: string[]): Promise<Map<string, Croisee[]>> {
  const m = new Map<string, Croisee[]>();
  if (!productIds.length) return m;
  for (let i = 0; i < productIds.length; i += 50) {
    const { data, error } = await supabase.from("references_croisees").select("product_id, marque, reference, filtron").in("product_id", productIds.slice(i, i + 50)).order("marque").order("ref_norm").limit(5000);
    if (error) break;
    for (const c of (data ?? []) as Croisee[]) (m.get(c.product_id!) ?? m.set(c.product_id!, []).get(c.product_id!)!).push(c);
  }
  return m;
}

/** Copie locale + catalogue en direct, sans doublon (même réf. sans espaces, même Filtron), réf. exacte en premier. */
export async function equivalencesToutes(texte: string, limite = 30): Promise<EquivTrouve[]> {
  const [loc, dir] = await Promise.all([croiseesLocales(texte, limite).catch(() => []), equivalentsFiltron(texte, limite).catch(() => [])]);
  const k = norm(texte);
  const vus = new Set<string>();
  const out: EquivTrouve[] = [];
  for (const e of [...loc, ...dir]) {
    const c = norm(e.numero) + "|" + e.filtron.toUpperCase();
    if (vus.has(c)) continue;
    vus.add(c); out.push(e);
  }
  return out.sort((a, b) => Number(norm(b.numero) === k) - Number(norm(a.numero) === k) || Number(norm(b.numero).startsWith(k)) - Number(norm(a.numero).startsWith(k))).slice(0, limite);
}

/** Équivalents avec la fiche Filtron de l'appli (null si Filtron l'a mais pas encore l'appli). Référence exacte en premier. */
export async function equivalentsFiltron(texte: string, limite = 20): Promise<EquivTrouve[]> {
  const items = await chercherChezFiltron(texte);
  if (!items.length) return [];
  const k = norm(texte);
  const tries = [...items].sort((a, b) => Number(norm(b.numero) === k) - Number(norm(a.numero) === k)
    || Number(norm(b.numero).startsWith(k)) - Number(norm(a.numero).startsWith(k))).slice(0, limite);
  const refs = [...new Set(tries.map((i) => i.filtron))];
  const { data } = await supabase.from("products").select("*").in("reference", refs);
  const fiches = new Map(((data ?? []) as Product[]).map((p) => [p.reference.toUpperCase(), p]));
  return tries.map((i) => ({ ...i, produit: fiches.get(i.filtron.toUpperCase()) ?? null, marqueApp: marqueApp(i.marque) }));
}
