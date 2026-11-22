// Huile de BOÎTE par voiture (demande de l'utilisateur, 18/11/2026 : « huile boîte » — BIBLE §8.40) : relevé du guide des
// huiles Liqui Moly (données Olyslager, la même source que l'huile moteur §8.19-8.23) → table huiles_boites.
//
//   node scripts/huiles_boites.mjs collecte   → une lecture par modèle + moteur (≈ 10 000, reprenable) → backups/huiles/boites_brut.json
//   node scripts/huiles_boites.mjs lignes     → regroupe par clé (« ~DACIA|LOGAN|1.5|D|63 ») et par période → boites_lignes.json
//   node scripts/huiles_boites.mjs envoi      → écrit dans huiles_boites (supabase/huiles_boites.sql)
//
// Clé = la même que l'huile moteur par modèle (clesVoiture dans src/lib/huiles.ts : marque, famille du modèle, cylindrée,
// diesel/essence, kW) → l'appli la retrouve à partir de la voiture Filtron. Une voiture peut avoir plusieurs boîtes
// (ex. Logan 1.5 dCi : JH3 2,8 L ou JR5 2,5 L) : toutes sont gardées avec leur code. Rien n'est deviné.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = join(ROOT, "backups", "huiles");
const fichier = (n) => join(DOSSIER, n);
const lire = (n, defaut) => (existsSync(fichier(n)) ? JSON.parse(readFileSync(fichier(n), "utf8")) : defaut);
const ecrire = (n, v) => writeFileSync(fichier(n), JSON.stringify(v));
const aujourdhui = new Date().toLocaleDateString("fr-FR", { timeZone: "Africa/Casablanca" });
const SOURCE = `Guide des huiles Liqui Moly, consulté le ${aujourdhui}`;
const BASE = "https://www.liqui-moly.com/fr/fr";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", Accept: "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(p) {
  for (let e = 0; e < 4; e++) {
    // 30 s au plus par demande : le 19/11 une demande sans réponse a bloqué le relevé 3 jours
    try { const r = await fetch(BASE + p, { headers: UA, signal: AbortSignal.timeout(30000) }); if (r.ok) return await r.json(); if (r.status === 404) return null; throw new Error("HTTP " + r.status); }
    catch (err) { await sleep(3000 * (e + 1)); if (e === 3) throw err; }
  }
}

// Mêmes règles que scripts/huiles_releve.mjs et src/lib/huiles.ts (garder identiques)
const SECOND_MOT = /^(CONNECT|CUSTOM|COURIER)$/;
const familleModele = (m) => { const w = m.toUpperCase().replace(/[,/(|].*$/, "").replace(/^([A-Z]) (\d{2,3})\b/, "$1$2").split(/\s+/).map((x) => x.replace(/[^A-Z0-9-]/g, "")).filter(Boolean); return (w[0] ?? "") + (SECOND_MOT.test(w[1] ?? "") ? " " + w[1] : ""); };
const cleMarque = (m) => { const u = m.toUpperCase(); if (/CITRO/.test(u)) return "CITROEN"; if (/MERCEDES/.test(u)) return "MERCEDES"; if (/\bVW\b|VOLKSWAGEN/.test(u)) return "VW"; if (/LAND ROVER/.test(u)) return "LANDROVER"; return u.split(/[\s(]+/)[0]; };
const designation = (cm, texte, modele) => {
  let u = (texte ?? "").toUpperCase();
  if (cm === "MERCEDES" && /^\d{3}/.test(u) && modele) u = familleModele(modele).replace(/[^A-Z]/g, "") + " " + u;
  const m = cm === "MERCEDES" ? u.match(/^([A-Z]+)\s*(\d{3})\b/) : cm === "BMW" ? u.match(/^(\d{3})\s*([A-Z]{1,2})\b/) : null;
  return m ? m[1] + m[2] : null;
};
const NOM = { Citro: "Citroën", Mercedes: "Mercedes-Benz" };

// Versions du guide (relevées pour l'huile moteur) : backups/huiles/types_<Marque>.json
function versions() {
  const out = [];
  for (const f of readdirSync(DOSSIER).filter((f) => /^types_.*\.json$/.test(f))) {
    const marque = f.replace(/^types_|\.json$/g, "");
    for (const t of JSON.parse(readFileSync(fichier(f), "utf8"))) out.push({ ...t, marque });
  }
  return out;
}
const cleLecture = (t) => `${t.marque}|${familleModele(t.modele)}|${t.cc}|${t.kw}|${t.carb}|${t.ys}`;

// Les boîtes d'une version : composants « boîte », « boîte-pont », « transmission », « boîte de transfert », « pont / différentiel »
const EST_BOITE = /bo[iî]te|transaxle|transmission|transfert|diff[ée]rentiel|pont arri[eè]re|essieu/i;
// + les autres liquides (présentation inspirée de la page « lubrifiants » de HaynesPro / webdatabays, demande de
// l'utilisateur ; données = guide Liqui Moly, public) : liquide de frein, refroidissement, direction assistée, clim.
const EST_FLUIDE = /frein|refroidissement|direction|climatisation/i;
function fluide(c) {
  const produits = (Array.isArray(c.products) ? c.products : Object.values(c.products || {})).map((p) => (p.name || "").replace(/­/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const caps = Object.values(c.capacities || {}).flat().filter((k) => /Capacit/i.test(k.item ?? "") && !/filtre/i.test(k.item ?? ""));
  const quantites = caps.map((k) => `${String(k.value).trim()} L${k.condition ? " " + String(k.condition).trim() : ""}`.replace(/\s+/g, " "));
  const dot = [...new Set(produits.map((p) => p.match(/DOT\s?(\d(?:\.\d)?)/i)).filter(Boolean).map((x) => `DOT ${x[1]}`))];
  return { nom: c.name, produits: [...new Set(produits)].slice(0, 4), quantites: [...new Set(quantites)].slice(0, 3), dot };
}
async function lireFiche(ty) {
  const j = await json("/rest/V1/recommendations/" + ty); const r = Array.isArray(j) ? j[0] : j;
  if (!r) return { boites: [], fluides: [] };
  const comps = Array.isArray(r.components) ? r.components : Object.values(r.components || {});
  return { boites: lireBoites(comps), fluides: comps.filter((c) => EST_FLUIDE.test(c.name ?? "") && !EST_BOITE.test(c.name ?? "")).map(fluide) };
}
function lireBoites(comps) {
  return comps.filter((c) => EST_BOITE.test(c.name ?? "") && !/direction/i.test(c.name ?? "")).map((c) => {
    const produits = (Array.isArray(c.products) ? c.products : Object.values(c.products || {})).map((p) => (p.name || "").replace(/­/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
    const visc = [...new Set(produits.map((p) => p.match(/\b(\d{2})W-?(\d{2,3})\b/)).filter(Boolean).map((x) => `${x[1]}W-${x[2]}`))];
    const atf = [...new Set(produits.filter((p) => /\bATF\b|DSG|CVT|Dexron/i.test(p)))].slice(0, 3);
    const norme = [...new Set(produits.map((p) => p.match(/\bGL[- ]?(\d)\b/i)).filter(Boolean).map((x) => `GL${x[1]}`))].join(", ");
    const caps = Object.values(c.capacities || {}).flat().filter((k) => /Capacit/i.test(k.item ?? "") && !/filtre/i.test(k.item ?? ""));
    const vals = caps.flatMap((k) => String(k.value).split("-").map((x) => Number(String(x).replace(",", ".").trim()))).filter((n) => n > 0);
    return { nom: c.name, code: (c.code || "").trim(), viscosites: visc, atf, norme, produits: produits.slice(0, 4), litres: vals.length ? Math.max(...vals) : null };
  });
}

async function collecte() {
  const brut = lire("boites_brut.json", {});
  const vs = versions(); const vus = new Set(); let lus = 0, total = 0;
  for (const t of vs) { const k = cleLecture(t); if (!vus.has(k)) { vus.add(k); total++; } }
  vus.clear();
  // --filtre=Evasion : seulement les versions dont le modèle ou le nom contient ce texte (lecture rapide d'un modèle)
  const filtre = (process.argv.find((x) => x.startsWith("--filtre=")) ?? "").slice(9);
  for (const t of vs) {
    if (filtre && !new RegExp(filtre, "i").test(`${t.modele} ${t.nom}`)) continue;
    const k = cleLecture(t);
    if (vus.has(k)) continue; vus.add(k);
    if (brut[k] && brut[k].fluides) continue; // déjà lue (boîtes + liquides)
    try { brut[k] = { ty: t.ty, ...(await lireFiche(t.ty)) }; lus++; } catch (e) { console.log("  ⚠", t.nom, e.message); }
    if (lus % 100 === 0) { ecrire("boites_brut.json", brut); console.log(`  … ${Object.keys(brut).length} / ${total}`); }
    await sleep(350);
  }
  ecrire("boites_brut.json", brut);
  console.log(`Collecte : ${lus} lues maintenant · ${Object.keys(brut).length} / ${total} au total`);
}

// Viscosité relue dans le nom de l'huile : « 75W-80 », mais aussi « 75W » tout court (Top Tec MTF 5100 75W)
const viscDe = (produits) => [...new Set(produits.map((p) => p.match(/\b(\d{2})W(?:-?(\d{2,3})(W?))?\b/)).filter(Boolean).map((x) => x[2] ? `${x[1]}W-${x[2]}${x[3]}` : `${x[1]}W`))];
function lignes() {
  const brut = lire("boites_brut.json", {});
  for (const b of Object.values(brut)) for (const x of b.boites ?? []) x.viscosites = viscDe(x.produits ?? []);
  const parCle = new Map();
  for (const t of versions()) {
    const b = brut[cleLecture(t)]; if (!b || (!b.boites.length && !(b.fluides ?? []).length)) continue;
    const cm = cleMarque(t.marque);
    const lesCles = [`~${cm}|${familleModele(t.modele)}|${(Math.round(t.cc / 100) / 10).toFixed(1)}|${t.carb}|${t.kw}`];
    const des = designation(cm, t.nom, t.modele); if (des) lesCles.push(`~${cm}|=${des}|${t.carb}|${t.kw}`);
    for (const cle of lesCles) { const l = parCle.get(cle) ?? []; l.push({ ...t, boites: b.boites, fluides: b.fluides ?? [] }); parCle.set(cle, l); }
  }
  // Une signature = les boîtes possibles (code + huile + litres) ; versions consécutives de même signature = une période
  const sig = (bs) => bs.map((b) => `${b.nom}|${b.code}|${b.viscosites.join("/")}|${b.atf.join("/")}|${b.litres}`).sort().join(" ; ");
  const out = [];
  for (const [cle, vs] of parCle) {
    const gs = [];
    for (const v of [...vs].sort((a, b) => a.ys - b.ys)) {
      const g = gs.find((x) => x.sig === sig(v.boites));
      if (g) g.vs.push(v); else gs.push({ sig: sig(v.boites), vs: [v] });
    }
    if (gs.length > 4) continue; // trop de cas différents : on ne devine pas
    for (const g of gs) {
      const debut = Math.min(...g.vs.map((v) => v.ys)); const fin = g.vs.some((v) => !v.ye) ? "" : Math.max(...g.vs.map((v) => v.ye));
      const boites = []; // boîtes distinctes (code + type)
      for (const b of g.vs[0].boites) if (!boites.some((x) => x.nom === b.nom && x.code === b.code && x.litres === b.litres)) boites.push(b);
      const nomMarque = NOM[g.vs[0].marque] ?? g.vs[0].marque;
      const fluides = (g.vs[0].fluides ?? []).filter((f) => f.produits.length || f.quantites.length);
      out.push({ cle, variante: gs.length > 1 ? `${debut}-${fin}` : "", boites, fluides, description: `${nomMarque} ${g.vs[0].nom}${g.vs.length > 1 ? ` (+ ${g.vs.length - 1})` : ""}`, marques: [nomMarque], source: SOURCE });
    }
  }
  // même (clé, période) en double → on garde la première
  const vus = new Set(); const finales = out.filter((l) => { const k = `${l.cle}|${l.variante}`; if (vus.has(k)) return false; vus.add(k); return true; });
  ecrire("boites_lignes.json", finales);
  const avecBoite = finales.filter((l) => l.boites.some((b) => b.viscosites.length || b.atf.length)).length;
  console.log(`Lignes : ${finales.length} (clé + période), dont ${avecBoite} avec une huile de boîte · ex.`, JSON.stringify(finales.find((l) => /DACIA\|LOGAN\|1\.5\|D/.test(l.cle)) ?? finales[0]).slice(0, 400));
}

async function envoi() {
  const { createClient } = await import("@supabase/supabase-js");
  const { SUPABASE_URL, SUPABASE_CLE } = await import("./cle_supabase.mjs");
  const sb = createClient(SUPABASE_URL, SUPABASE_CLE);
  const ls = lire("boites_lignes.json", []);
  let n = 0;
  for (let i = 0; i < ls.length; i += 500) {
    const { error, count } = await sb.from("huiles_boites").upsert(ls.slice(i, i + 500), { onConflict: "cle,variante", count: "exact" });
    if (error) throw new Error(error.code === "PGRST205" || /huiles_boites/.test(error.message) ? "Table huiles_boites absente : colle supabase/huiles_boites.sql" : error.message);
    n += count ?? 0;
  }
  console.log(`Envoi : ${n} lignes écrites dans huiles_boites`);
}

const etape = process.argv[2];
if (etape === "collecte") await collecte();
else if (etape === "lignes") lignes();
else if (etape === "envoi") await envoi();
else console.log("Usage : node scripts/huiles_boites.mjs collecte | lignes | envoi");
