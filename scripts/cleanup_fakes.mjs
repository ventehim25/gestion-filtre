// Supprime les références Filtron FAUSSES (pas dans le catalogue officiel, sans données réelles)
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";
const supabase = createClient(SUPABASE_URL, SUPABASE_CLE);

async function loadAll(table, cols) {
  const out = [];
  for (let i = 0; i < 100; i++) {
    const { data, error } = await supabase.from(table).select(cols).range(i * 1000, i * 1000 + 999);
    if (error) { console.error(error.message); break; }
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  console.log("Sitemap…");
  const xml = await (await fetch("https://filtron.eu/en.sitemap-commerce.xml", { headers: { "User-Agent": "Mozilla/5.0" } })).text();
  const real = new Set();
  const re = /product\.html\/(.+?)_filtron\.html/g; let m;
  while ((m = re.exec(xml))) real.add(decodeURIComponent(m[1]).toUpperCase().trim());
  console.log("Réfs réelles (catalogue):", real.size);

  const products = await loadAll("products", "id, reference, nom_fr");
  const apps = await loadAll("applications", "product_id");
  const appSet = new Set(apps.map((a) => a.product_id));
  console.log("Produits totaux:", products.length, "| avec applications:", appSet.size);

  // Faux = nom contient Filtron, ref absente du catalogue, et aucune application réelle
  const toDelete = products.filter(
    (p) => /filtron/i.test(p.nom_fr) && !real.has(p.reference) && !appSet.has(p.id)
  );
  console.log("À supprimer (fausses réfs):", toDelete.length);

  let del = 0;
  for (let i = 0; i < toDelete.length; i += 200) {
    const ids = toDelete.slice(i, i + 200).map((p) => p.id);
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) console.log("del err:", error.message); else del += ids.length;
  }
  console.log(`Supprimées: ${del}`);

  const remaining = products.length - del;
  console.log(`Produits restants: ~${remaining}`);
}
main();
