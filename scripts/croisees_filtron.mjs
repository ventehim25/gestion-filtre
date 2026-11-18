// Références croisées toutes marques ↔ Filtron, depuis le catalogue officiel filtron.eu (BIBLE §8.42).
//   node scripts/croisees_filtron.mjs collecte   → relevé reprenable (une page de 1000 toutes les 8 s) → backups/croisees/brut.json
//   node scripts/croisees_filtron.mjs envoi      → table references_croisees (supabase/references_croisees.sql), sans doublon
// Le catalogue plafonne chaque recherche à 10 000 réponses et cherche « contient » dans le numéro OU la marque :
// on cherche par NOM DE MARQUE (Mann, Knecht…), et par débuts de numéros pour les marques trop grosses (Bosch).
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = join(ROOT, "backups", "croisees");
mkdirSync(DOSSIER, { recursive: true });
const BRUT = join(DOSSIER, "brut.json");
const ETAT = join(DOSSIER, "etat.json");

const RECHERCHES = [
  "MANN-FILTER", "KNECHT", "PURFLUX", "MECAFILTER", "UFI", "FRAM", "HENGST", "CHAMPION", "MISFAT", "SAKURA", "COOPERS",
  "DELPHI", "VALEO", "BLUE PRINT", "ALCO", "TECNOCAR", "HIFI", "SOFIMA", "DONALDSON", "FLEETGUARD", "BALDWIN", "WIX",
  "MAHLE", "FEBI", "JAPANPARTS", "ASHIKA", "NIPPARTS", "HERTH", "MEYLE", "KAVO", "AMC", "STARK", "RIDEX",
  // Bosch : trop de réponses pour une seule recherche → par débuts de numéros
  "0 986", "F 026", "0 450", "0 451", "1 457", "1 987", "F 000", "BOSCH",
];
const QUERY = `query($s:String!,$p:Int,$n:Int){ search_crossreference_no(search:$s, currentPage:$p, pageSize:$n){ total_count page_info{ total_pages } items{ external_number int_product_identifier ext_brand_name } } }`;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(s, p) {
  for (let essai = 1; essai <= 4; essai++) {
    try {
      const r = await fetch("https://filtron.eu/api/graphql/catalog-prod", {
        method: "POST", headers: { "Content-Type": "application/json", Store: "pcat_ft_fr_store_fr" },
        body: JSON.stringify({ query: QUERY, variables: { s, p, n: 1000 } }), signal: AbortSignal.timeout(60000),
      });
      if (r.status === 429 || r.status >= 500) throw new Error("HTTP " + r.status);
      const d = (await r.json())?.data?.search_crossreference_no;
      if (!d) throw new Error("réponse vide");
      return d;
    } catch (e) {
      console.log(`  ${s} p${p} : ${e.message} → pause ${essai * 30} s`);
      await pause(essai * 30000);
    }
  }
  throw new Error(`abandon ${s} p${p}`);
}

async function collecte() {
  const brut = existsSync(BRUT) ? JSON.parse(readFileSync(BRUT, "utf8")) : {};
  const etat = existsSync(ETAT) ? JSON.parse(readFileSync(ETAT, "utf8")) : {};
  for (const s of RECHERCHES) {
    if (etat[s]?.fini) continue;
    let p = (etat[s]?.page ?? 0) + 1;
    for (;;) {
      const d = await page(s, p);
      let n = 0;
      for (const i of d.items ?? []) {
        if (!i.external_number || !i.int_product_identifier) continue;
        const filtron = i.int_product_identifier.replace(/_FILTRON$/i, "");
        const cle = `${i.ext_brand_name}|${i.external_number}|${filtron}`;
        if (!brut[cle]) { brut[cle] = [i.ext_brand_name, i.external_number, filtron]; n++; }
      }
      const total = d.page_info?.total_pages ?? 1;
      etat[s] = { page: p, total_pages: total, total: d.total_count, fini: p >= total };
      writeFileSync(BRUT, JSON.stringify(brut));
      writeFileSync(ETAT, JSON.stringify(etat, null, 1));
      console.log(`${s.padEnd(12)} page ${p}/${total} (${d.total_count}${d.total_count >= 10000 ? " PLAFOND" : ""}) +${n} → ${Object.keys(brut).length} au total`);
      if (p >= total) break;
      p++;
      await pause(8000);
    }
    await pause(8000);
  }
  const marques = {};
  for (const [m] of Object.values(brut)) marques[m] = (marques[m] ?? 0) + 1;
  console.log("Fini :", Object.keys(brut).length, "correspondances.", Object.entries(marques).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([m, n]) => `${m}:${n}`).join(", "));
}

async function envoi() {
  const { createClient } = await import("@supabase/supabase-js");
  const { SUPABASE_URL, SUPABASE_CLE } = await import("./cle_supabase.mjs");
  const sb = createClient(SUPABASE_URL, SUPABASE_CLE);
  const brut = Object.values(JSON.parse(readFileSync(BRUT, "utf8")));
  // Fiches Filtron de l'appli (référence → id), lues par paquets triés
  const fiches = new Map();
  for (let i = 0; ; i++) {
    const { data, error } = await sb.from("products").select("id, reference").order("id").range(i * 1000, i * 1000 + 999);
    if (error) throw error;
    for (const p of data) fiches.set(p.reference.toUpperCase(), p.id);
    if (data.length < 1000) break;
  }
  const lignes = brut.map(([marque, reference, filtron]) => ({ marque, reference, filtron, product_id: fiches.get(filtron.toUpperCase()) ?? null }));
  const relies = lignes.filter((l) => l.product_id).length;
  console.log(`${lignes.length} correspondances, ${relies} reliées à une fiche de l'appli (${Math.round((relies / lignes.length) * 100)} %).`);
  if (!process.argv.includes("--ecrire")) { console.log("Essai à blanc : ajoute --ecrire pour envoyer."); return; }
  let faits = 0;
  for (let i = 0; i < lignes.length; i += 1000) {
    const { error } = await sb.from("references_croisees").upsert(lignes.slice(i, i + 1000), { onConflict: "marque,reference,filtron", ignoreDuplicates: true });
    if (error) throw error;
    faits += Math.min(1000, lignes.length - i);
    if (faits % 10000 < 1000) console.log(`  ${faits} / ${lignes.length}`);
  }
  const { count } = await sb.from("references_croisees").select("id", { count: "exact", head: true });
  console.log("En base :", count);
}

const cmd = process.argv[2];
if (cmd === "collecte") await collecte();
else if (cmd === "envoi") await envoi();
else console.log("node scripts/croisees_filtron.mjs collecte | envoi [--ecrire]");
