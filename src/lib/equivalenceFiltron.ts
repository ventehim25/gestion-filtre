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
