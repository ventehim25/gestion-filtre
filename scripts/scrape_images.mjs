// Récupère l'URL d'image EXACTE (ld+json Scene7) de chaque référence Filtron.
// Reprenable : ne traite que les produits sans image_url. Léger (Range bytes).
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wehsvgoolozqzxsgwibb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaHN2Z29vbG96cXp4c2d3aWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTA3NzYsImV4cCI6MjA5NTgyNjc3Nn0.8z624yNoX-CQirJM5VQvYyMdeOCj5jau_0BvTaMKj1c"
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function extractImg(html) {
  // image produit dans le ld+json (exclut le fond VIN)
  const re = /https:\/\/s7g10\.scene7\.com\/is\/image\/mannhummel\/([A-Za-z0-9._\-]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const asset = m[1];
    if (/VIN|packshot-background/i.test(asset)) continue;
    return `https://s7g10.scene7.com/is/image/mannhummel/${asset}`;
  }
  return null;
}

async function getChunk(ref) {
  const u = `https://filtron.eu/en/catalog/search-results/product.html/${ref.toLowerCase()}_filtron.html`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0", Range: "bytes=0-200000" } });
      if (r.status === 404) return null;
      if (r.ok || r.status === 206) return await r.text();
      throw new Error("HTTP " + r.status);
    } catch (e) { if (i === 2) throw e; await sleep(1000 * (i + 1)); }
  }
}

async function loadProducts() {
  const out = [];
  for (let i = 0; i < 200; i++) {
    const { data } = await supabase.from("products").select("id, reference")
      .ilike("nom_fr", "%filtron%").is("image_url", null).range(i * 1000, i * 1000 + 999);
    if (!data || data.length === 0) break;
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  const list = await loadProducts();
  console.log(`>>> ${list.length} références sans image à traiter`);
  let ok = 0, none = 0, fail = 0;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    try {
      const html = await getChunk(p.reference);
      const img = html ? extractImg(html) : null;
      if (img) {
        await supabase.from("products").update({ image_url: img }).eq("id", p.id);
        ok++;
      } else none++;
    } catch (e) {
      fail++;
      if (fail % 15 === 1) console.log(`  ${p.reference} FAIL ${e.message}`);
    }
    if ((i + 1) % 25 === 0 || i === list.length - 1)
      console.log(`[${i + 1}/${list.length}] images:${ok} sans:${none} fails:${fail}`);
    await sleep(250);
  }
  console.log(`\n=== TERMINÉ === images:${ok} sans:${none} fails:${fail}`);
}
main();
