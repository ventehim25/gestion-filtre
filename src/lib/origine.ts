// Retrouver la pièce par un NUMÉRO D'ORIGINE (ou toute référence enregistrée en équivalence), espaces ignorés :
// « 5801317097 » trouve « IVECO 5801 317097 » = Filtron AP085/1 (BIBLE §8.39). Demande de l'utilisateur : une boîte
// Flag marquée 5801317097 ne doit pas devenir une « nouvelle pièce » inconnue, et l'historique / la vente doivent dire
// de quel filtre Filtron il s'agit. Cherche dans TOUTES les fiches (voitures et camions).
import { supabase } from "./supabase";
import type { Product } from "@/types/database";

export type ParOrigine = { code: string; marqueCode: string; produit: Product };

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const cache = new Map<string, Promise<ParOrigine[]>>();

export function chercherParOrigine(texte: string, limite = 8): Promise<ParOrigine[]> {
  const s = norm(texte);
  if (s.length < 5) return Promise.resolve([]);
  const deja = cache.get(s);
  if (deja) return deja;
  const p = (async () => {
    // Motif souple (« %5%8%0%1… ») pour accepter les espaces / tirets de la base, puis contrôle exact sans espaces
    const motif = "%" + s.split("").join("%") + "%";
    const { data, error } = await supabase.from("equivalences").select("marque, reference, products!inner(*)").ilike("reference", motif).limit(60);
    if (error) return [];
    const out: ParOrigine[] = [];
    for (const e of (data ?? []) as unknown as { marque: string; reference: string; products: Product }[]) {
      if (!norm(e.reference).includes(s) || out.some((o) => o.produit.id === e.products.id)) continue;
      out.push({ code: e.reference, marqueCode: e.marque, produit: e.products });
    }
    out.sort((a, b) => Number(norm(b.code) === s) - Number(norm(a.code) === s));
    return out.slice(0, limite);
  })();
  cache.set(s, p);
  return p;
}

/** « = Filtron AP085/1 » pour une fiche ajoutée à la main dont la référence est un numéro d'origine connu (sinon null). */
export async function filtronDeReference(reference: string, idFiche?: string): Promise<string | null> {
  const r = (await chercherParOrigine(reference, 3)).find((o) => o.produit.id !== idFiche && norm(o.code) === norm(reference));
  return r ? `${r.produit.marque || "Filtron"} ${r.produit.reference}` : null;
}
