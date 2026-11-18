// Équivalent Filtron d'une référence quelconque (Mann, Bosch, Purflux, UFI, Fram, numéro d'origine…), demandé au
// catalogue officiel filtron.eu (recherche « référence correspondante », la même que sur leur site) — BIBLE §8.42.
// Relais côté serveur (le navigateur ne peut pas appeler filtron.eu directement) ; réponse gardée 1 jour par Vercel
// pour ne pas redemander la même référence. Une seule requête par recherche, comme une personne sur leur site.
export const runtime = "nodejs";

const QUERY = `query($s:String!,$p:Int,$n:Int){ search_crossreference_no(search:$s, currentPage:$p, pageSize:$n){ total_count items{ external_number int_product_identifier ext_brand_name } } }`;

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 40);
  if (q.replace(/[^A-Za-z0-9]/g, "").length < 3) return Response.json({ items: [] });
  try {
    const r = await fetch("https://filtron.eu/api/graphql/catalog-prod", {
      method: "POST",
      headers: { "Content-Type": "application/json", Store: "pcat_ft_fr_store_fr" },
      body: JSON.stringify({ query: QUERY, variables: { s: q, p: 1, n: 40 } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return Response.json({ items: [], erreur: `catalogue Filtron : ${r.status}` });
    const d = (await r.json())?.data?.search_crossreference_no;
    const vus = new Set<string>();
    const items: { numero: string; marque: string; filtron: string }[] = [];
    for (const i of (d?.items ?? []) as { external_number: string | null; int_product_identifier: string | null; ext_brand_name: string | null }[]) {
      if (!i.external_number || !i.int_product_identifier) continue;
      const filtron = i.int_product_identifier.replace(/_FILTRON$/i, "");
      const cle = `${i.external_number}|${i.ext_brand_name}|${filtron}`;
      if (vus.has(cle)) continue;
      vus.add(cle);
      items.push({ numero: i.external_number, marque: i.ext_brand_name ?? "?", filtron });
    }
    return Response.json({ items, total: d?.total_count ?? items.length }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch (e) {
    return Response.json({ items: [], erreur: String((e as Error)?.message ?? e) });
  }
}
