// ⚠️ 13/11/2026 : l'adresse Filtron « catalogue-frame?action=showFilter » répond 404 (site refait) et ce robot gardait 250 voitures max.
// Pour les applications, utiliser scripts/completer_filtron.mjs (nouvelle page produit, liste complète, sans doublons).
// Enrichit UNE référence Filtron passée en argument : node scrape_one.mjs "AP026/2"
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const supabase = createClient(SUPABASE_URL, SUPABASE_CLE);

const ref = process.argv[2];
if (!ref) { console.error("usage: node scrape_one.mjs <reference>"); process.exit(1); }

const toFiltron = (r) => r.replace(/^([A-Za-z]+)\s*/, "$1 ").trim();
const dec = (v) => { try { return decodeURIComponent((v ?? "").replace(/\+/g, " ")).trim(); } catch { return (v ?? "").replace(/\+/g, " ").trim(); } };

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

const { data: prods } = await supabase.from("products").select("id, reference").eq("reference", ref);
if (!prods?.length) { console.error("produit introuvable:", ref); process.exit(1); }
const p = prods[0];
const url = `https://filtron.eu/en/catalogue-frame?action=showFilter&partNumber=${encodeURIComponent(toFiltron(ref))}`;
const html = await (await fetch(url, { headers: { "X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0" } })).text();

const subs = parseSubstitutes(html).slice(0, 80);
if (subs.length) await supabase.from("equivalences").upsert(subs.map(x => ({ product_id: p.id, marque: x.marque.slice(0, 60), reference: x.reference.slice(0, 80) })), { onConflict: "product_id,marque,reference", ignoreDuplicates: true });
const apps = parseApps(html).slice(0, 250);
if (apps.length) await supabase.from("applications").upsert(apps.map(a => ({ product_id: p.id, marque: a.marque.slice(0,80), modele: a.modele.slice(0,120), moteur: a.moteur.slice(0,120), code_moteur: a.code_moteur.slice(0,60), annee_debut: a.annee_debut.slice(0,20), annee_fin: a.annee_fin.slice(0,20), puissance: a.puissance.slice(0,20) })), { onConflict: "product_id,marque,modele,moteur", ignoreDuplicates: true });

console.log(`${ref} -> équivalences:${subs.length} applications:${apps.length}`);
