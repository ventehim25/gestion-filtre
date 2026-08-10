// Chargement paginé PARALLÈLE (perf mobile).
// Supabase limite à 1000 lignes/requête → une grosse table (23 000 équivalences…) se
// charge en ~24 requêtes. Les faire UNE PAR UNE en série empile les allers-retours
// réseau (très lent sur mobile). Ici : on compte d'abord le total (requête légère
// head:true), puis on récupère toutes les pages en parallèle, par lots limités pour ne
// pas saturer les connexions du plan gratuit. Résultat identique, bien plus rapide.
import { supabase } from "./supabase";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Q = { range: (from: number, to: number) => PromiseLike<{ data: any[] | null }> };

export async function loadAll<T>(
  table: string,
  select: string,
  opts?: {
    filter?: (q: any) => any;   // filtres/tri appliqués À LA FOIS au comptage et aux pages
    countSelect?: string;       // colonnes du comptage (pour un filtre sur jointure : ex. "sales!inner(date)")
    pageSize?: number;
    concurrency?: number;
  },
): Promise<T[]> {
  const pageSize = opts?.pageSize ?? 1000;
  const concurrency = opts?.concurrency ?? 6;
  const applyFilter = opts?.filter ?? ((q: any) => q);

  const page = (n: number) => (applyFilter(supabase.from(table).select(select)) as Q).range(n * pageSize, n * pageSize + pageSize - 1);

  const { count } = await applyFilter(
    supabase.from(table).select(opts?.countSelect ?? "*", { count: "exact", head: true }),
  );
  const known = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  const out: T[] = [];
  let lastFull = false;
  // Pages connues (d'après le comptage) en parallèle, par lots.
  for (let i = 0; i < known; i += concurrency) {
    const batch: PromiseLike<{ data: any[] | null }>[] = [];
    for (let j = i; j < Math.min(i + concurrency, known); j++) batch.push(page(j));
    const res = await Promise.all(batch);
    for (const r of res) if (r.data) out.push(...(r.data as T[]));
    lastFull = (res[res.length - 1]?.data?.length ?? 0) === pageSize;
  }
  // Filet de sécurité : si le comptage a échoué (count=null → 1 page) ou sous-estimé,
  // et que la dernière page était PLEINE, on continue en série jusqu'à une page partielle.
  // (Réplique l'ancien comportement auto-terminant, robuste aux pannes réseau.)
  for (let n = known; lastFull; n++) {
    const { data } = await page(n);
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    lastFull = data.length === pageSize;
  }
  return out;
}
