// Importe TOUT le catalogue Filtron depuis le sitemap (toutes les références réelles)
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const supabase = createClient(SUPABASE_URL, SUPABASE_CLE);

const CAT = {
  filtre_huile:      { fr: "Filtre à huile Filtron",    ar: "فلتر زيت فيلترون",   pa: 18, pv: 30 },
  filtre_air:        { fr: "Filtre à air Filtron",      ar: "فلتر هواء فيلترون",  pa: 14, pv: 24 },
  filtre_carburant:  { fr: "Filtre à carburant Filtron", ar: "فلتر وقود فيلترون",  pa: 20, pv: 35 },
  filtre_habitacle:  { fr: "Filtre habitacle Filtron",  ar: "فلتر مقصورة فيلترون", pa: 15, pv: 27 },
  autre:             { fr: "Filtre Filtron",            ar: "فلتر فيلترون",       pa: 15, pv: 25 },
};

function categorie(ref) {
  const pre = (ref.match(/^[A-Z]+/) || [""])[0];
  if (pre.startsWith("O")) return "filtre_huile";
  if (pre.startsWith("A")) return "filtre_air";
  if (pre.startsWith("P")) return "filtre_carburant";
  if (pre.startsWith("K")) return "filtre_habitacle";
  return "autre";
}

async function main() {
  console.log("Téléchargement du sitemap…");
  const xml = await (await fetch("https://filtron.eu/en.sitemap-commerce.xml", {
    headers: { "User-Agent": "Mozilla/5.0" },
  })).text();

  const refs = new Set();
  const re = /product\.html\/(.+?)_filtron\.html/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const ref = decodeURIComponent(m[1]).toUpperCase().trim();
    if (ref) refs.add(ref);
  }
  const all = [...refs];
  console.log(`Références trouvées dans le catalogue: ${all.length}`);

  // Quelles références existent déjà ?
  const existing = new Set();
  for (let i = 0; i < 100; i++) {
    const { data } = await supabase.from("products").select("reference").range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    data.forEach((p) => existing.add(p.reference));
    if (data.length < 1000) break;
  }
  console.log(`Déjà en base: ${existing.size}`);

  const toAdd = all.filter((r) => !existing.has(r));
  console.log(`À ajouter: ${toAdd.length}`);

  const rows = toAdd.map((ref) => {
    const cat = categorie(ref);
    const c = CAT[cat];
    return {
      nom_fr: `${c.fr} ${ref}`,
      nom_ar: `${c.ar} ${ref}`,
      reference: ref,
      categorie: cat,
      prix_achat: c.pa,
      prix_vente: c.pv,
      stock: 0,
      stock_min: 2,
    };
  });

  let added = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const batch = rows.slice(i, i + 400);
    const { error } = await supabase.from("products").upsert(batch, { onConflict: "reference", ignoreDuplicates: true });
    if (error) { console.log(`batch ${i} err: ${error.message}`); }
    else { added += batch.length; console.log(`  +${batch.length} (total ${added})`); }
  }

  // Répartition par catégorie
  const byCat = {};
  all.forEach((r) => { const c = categorie(r); byCat[c] = (byCat[c] || 0) + 1; });
  console.log("\n=== TERMINÉ ===");
  console.log(`Catalogue Filtron complet: ${all.length} réfs | ajoutées: ${added}`);
  console.log("Répartition:", JSON.stringify(byCat));
}

main();
