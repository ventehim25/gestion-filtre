// Enrichissement Filtron robuste & reprenable :
//  - applications (véhicule/moteur/code/années) + équivalences OE + dimensions
//  - retries avec backoff, saute les réfs déjà complètes
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wehsvgoolozqzxsgwibb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaHN2Z29vbG96cXp4c2d3aWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNTA3NzYsImV4cCI6MjA5NTgyNjc3Nn0.8z624yNoX-CQirJM5VQvYyMdeOCj5jau_0BvTaMKj1c"
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toFiltron = (r) => r.replace(/^([A-Za-z]+)\s*/, "$1 ").trim();
const dec = (v) => { try { return decodeURIComponent((v ?? "").replace(/\+/g, " ")).trim(); } catch { return (v ?? "").replace(/\+/g, " ").trim(); } };

async function getText(url, headers) {
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
      throw new Error("HTTP " + res.status);
    } catch (e) {
      if (i === 3) throw e;
      await sleep(1200 * (i + 1));
    }
  }
}

function parseSubstitutes(html) {
  const out = []; const s = html.indexOf('id="accordion2"'); if (s < 0) return out;
  const region = html.slice(s);
  const re = /href="#interchange-collapse\d+">([^<]+)<\/a>[\s\S]*?<ul class="panel-list">([\s\S]*?)<\/ul>/g;
  let m; while ((m = re.exec(region))) { const marque = m[1].trim(); const li = /<li>([^<]+)<\/li>/g; let x; while ((x = li.exec(m[2]))) out.push({ marque, reference: x[1].trim() }); }
  return out;
}
function parseApps(html) {
  const out = []; const seen = new Set();
  const re = /action=showSubmodelFilters&(?:amp;)?([^'"]+)/g; let m;
  while ((m = re.exec(html))) {
    const p = new URLSearchParams(m[1].replace(/&amp;/g, "&"));
    const marque = dec(p.get("vehicleMake")), modele = dec(p.get("vehicleModel"));
    if (!marque || !modele) continue;
    const moteur = dec(p.get("vehicleSubmodel")), key = `${marque}|${modele}|${moteur}`;
    if (seen.has(key)) continue; seen.add(key);
    out.push({ marque, modele, moteur, code_moteur: dec(p.get("engType")), annee_debut: dec(p.get("prodFrom")), annee_fin: dec(p.get("prodTo")), puissance: dec(p.get("hp")) });
  }
  return out;
}
function parseDim(html) {
  const i = html.indexOf("cmp-product__summary"); if (i < 0) return null;
  const m = html.slice(i, i + 3000).match(/<li>([^<]*?(?:diameter|Height|Thread|mm)[^<]*)<\/li>/i);
  return m ? m[1].replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, 250) : null;
}

async function loadAll(table, cols, filter) {
  const out = [];
  for (let i = 0; i < 200; i++) {
    let q = supabase.from(table).select(cols).range(i * 1000, i * 1000 + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) { console.error(error.message); break; }
    if (!data || data.length === 0) break;
    out.push(...data); if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  const products = await loadAll("products", "id, reference, nom_fr, dimensions", (q) => q.ilike("nom_fr", "%filtron%"));
  const apps = await loadAll("applications", "product_id");
  const appSet = new Set(apps.map((a) => a.product_id));

  const seen = new Set(); const list = [];
  for (const p of products) { if (!seen.has(p.reference)) { seen.add(p.reference); list.push(p); } }

  // À traiter : pas encore d'applications OU pas de dimensions
  const todo = list.filter((p) => !appSet.has(p.id) || !p.dimensions);
  console.log(`>>> ${list.length} réfs Filtron | déjà OK: ${list.length - todo.length} | à traiter: ${todo.length}`);

  const CF = { "X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
  const WEB = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" };
  let okA = 0, okD = 0, fail = 0;

  for (let i = 0; i < todo.length; i++) {
    const p = todo[i];
    try {
      if (!appSet.has(p.id)) {
        const html = await getText(`https://filtron.eu/en/catalogue-frame?action=showFilter&partNumber=${encodeURIComponent(toFiltron(p.reference))}`, CF);
        if (html) {
          const subs = parseSubstitutes(html).slice(0, 80);
          if (subs.length) await supabase.from("equivalences").upsert(subs.map((s) => ({ product_id: p.id, marque: s.marque.slice(0, 60), reference: s.reference.slice(0, 80) })), { onConflict: "product_id,marque,reference", ignoreDuplicates: true });
          const ap = parseApps(html).slice(0, 250);
          if (ap.length) { await supabase.from("applications").upsert(ap.map((a) => ({ product_id: p.id, marque: a.marque.slice(0,80), modele: a.modele.slice(0,120), moteur: a.moteur.slice(0,120), code_moteur: a.code_moteur.slice(0,60), annee_debut: a.annee_debut.slice(0,20), annee_fin: a.annee_fin.slice(0,20), puissance: a.puissance.slice(0,20) })), { onConflict: "product_id,marque,modele,moteur", ignoreDuplicates: true }); okA++; }
        }
        await sleep(400);
      }
      if (!p.dimensions) {
        const h2 = await getText(`https://filtron.eu/en/catalog/search-results/product.html/${p.reference.toLowerCase()}_filtron.html`, WEB);
        const dim = h2 ? parseDim(h2) : null;
        if (dim) { await supabase.from("products").update({ dimensions: dim }).eq("id", p.id); okD++; }
        await sleep(300);
      }
      if ((i + 1) % 25 === 0 || i === todo.length - 1) console.log(`[${i + 1}/${todo.length}] ${p.reference} | apps+:${okA} dims+:${okD} fails:${fail}`);
    } catch (e) {
      fail++;
      if (fail % 10 === 1) console.log(`[${i + 1}/${todo.length}] ${p.reference} FAIL: ${e.message}`);
    }
  }
  console.log(`\n=== TERMINÉ === apps+:${okA} dims+:${okD} fails:${fail}`);
}
main();
