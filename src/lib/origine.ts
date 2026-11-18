// Retrouver la pièce par un NUMÉRO D'ORIGINE (ou toute référence enregistrée en équivalence), espaces ignorés :
// « 5801317097 » trouve « IVECO 5801 317097 » = Filtron AP085/1 (BIBLE §8.39). Demande de l'utilisateur : une boîte
// Flag marquée 5801317097 ne doit pas devenir une « nouvelle pièce » inconnue, et l'historique / la vente doivent dire
// de quel filtre Filtron il s'agit. Cherche dans TOUTES les fiches (voitures et camions).
import { supabase } from "./supabase";
import type { Product } from "@/types/database";
import { equivalentsFiltron } from "./equivalenceFiltron";

// source « filtron » = trouvé dans le catalogue officiel Filtron (pas encore dans la base), BIBLE §8.42
export type ParOrigine = { code: string; marqueCode: string; produit: Product; source?: "base" | "filtron"; marqueApp?: string | null };

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const cache = new Map<string, Promise<ParOrigine[]>>();

export function chercherParOrigine(texte: string, limite = 8, opts: { filtron?: boolean } = {}): Promise<ParOrigine[]> {
  const s = norm(texte);
  const avecFiltron = opts.filtron !== false;
  if (s.length < (avecFiltron ? 4 : 5)) return Promise.resolve([]);
  const cle = (avecFiltron ? "F|" : "B|") + s;
  const deja = cache.get(cle);
  if (deja) return deja;
  const p = (async () => {
    // Motif souple (« %5%8%0%1… ») pour accepter les espaces / tirets de la base, puis contrôle exact sans espaces
    const motif = "%" + s.split("").join("%") + "%";
    const [{ data, error }, filtron] = await Promise.all([
      s.length >= 5 ? supabase.from("equivalences").select("marque, reference, products!inner(*)").ilike("reference", motif).limit(60) : Promise.resolve({ data: [], error: null }),
      avecFiltron ? equivalentsFiltron(texte, 20).catch(() => []) : Promise.resolve([]),
    ]);
    const out: ParOrigine[] = [];
    if (!error) for (const e of (data ?? []) as unknown as { marque: string; reference: string; products: Product }[]) {
      if (!norm(e.reference).includes(s) || out.some((o) => o.produit.id === e.products.id)) continue;
      out.push({ code: e.reference, marqueCode: e.marque, produit: e.products, source: "base" });
    }
    // Catalogue officiel Filtron : toutes les marques et numéros d'origine, même ceux que la base n'a pas encore
    for (const f of filtron) {
      if (!f.produit || out.some((o) => o.produit.id === f.produit!.id && norm(o.code) === norm(f.numero))) continue;
      out.push({ code: f.numero, marqueCode: f.marque, produit: f.produit, source: "filtron", marqueApp: f.marqueApp });
    }
    out.sort((a, b) => Number(norm(b.code) === s) - Number(norm(a.code) === s) || Number(norm(b.code).startsWith(s)) - Number(norm(a.code).startsWith(s)));
    return out.slice(0, limite);
  })();
  cache.set(cle, p);
  return p;
}

/** « = Filtron AP085/1 » pour une fiche ajoutée à la main dont la référence est un numéro d'origine connu (sinon null). */
export async function filtronDeReference(reference: string, idFiche?: string): Promise<string | null> {
  const r = (await chercherParOrigine(reference, 3, { filtron: false })).find((o) => o.produit.id !== idFiche && norm(o.code) === norm(reference));
  return r ? `${r.produit.marque || "Filtron"} ${r.produit.reference}` : null;
}
