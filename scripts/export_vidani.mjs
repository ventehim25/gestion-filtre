// Copie des voitures de FiltroPro pour Vidani (assistant WhatsApp des garages), BIBLE §8.25.
// Pour chaque version de voiture Filtron (marque, modèle, moteur, puissance, années) : les filtres (huile, air,
// habitacle, gasoil) et l'huile du guide Liqui Moly (viscosités + litres), avec les MÊMES règles que l'appli
// (src/lib/huiles.ts : par code moteur, sinon par modèle + cylindrée + puissance + années).
// Vidani calcule ensuite le prix avec les prix du garage (sa fiche Excel) : aucun prix ne vient d'ici.
//
//   node scripts/export_vidani.mjs [fichier.json]
//   par défaut : Bureau\Assistant WhatsApp Garages\vidani-bot\donnees\filtropro-voitures.json
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const SORTIE = process.argv[2] || "C:/Users/deux/Desktop/Assistant WhatsApp Garages/vidani-bot/donnees/filtropro-voitures.json";
const sb = createClient(SUPABASE_URL, SUPABASE_CLE);

// Voitures et utilitaires courants au Maroc (noms des marques chez Filtron)
const MARQUES = ["DACIA (RENAULT GROUP)", "RENAULT", "PEUGEOT", "CITROEN", "FIAT", "VW (VOLKSWAGEN)", "SKODA", "SEAT", "AUDI", "HYUNDAI", "KIA MOTORS", "TOYOTA", "MERCEDES-BENZ", "BMW", "OPEL", "NISSAN", "MITSUBISHI", "SUZUKI", "HONDA", "MAZDA", "ISUZU", "LAND ROVER", "JEEP", "MG", "CHERY", "CHEVROLET", "SSANGYONG", "VOLVO CARS", "FORD"];

// ---------- Huile : mêmes règles que src/lib/huiles.ts (garder identiques) ----------
function familleMarque(marque) {
  const u = (marque ?? "").toUpperCase();
  if (/MERCEDES|EVOBUS/.test(u)) return "MERCEDES";
  if (/VOLKSWAGEN|\bVW\b|SKODA|ŠKODA|\bSEAT\b|\bAUDI\b|CUPRA|\bMAN\b/.test(u)) return "VAG";
  if (/RENAULT|DACIA|NISSAN|ALPINE/.test(u)) return "RN";
  if (/PEUGEOT|CITRO|^DS\b/.test(u)) return "PSA";
  if (/HYUNDAI|\bKIA\b/.test(u)) return "HK";
  if (/FORD|MAZDA|VOLVO/.test(u)) return "FM";
  if (/OPEL|CHEVROLET|VAUXHALL|DAEWOO/.test(u)) return "GM";
  return u.split(/[\s(/-]+/)[0] ?? "";
}
function morceaux(code) { const b = (code ?? "").toUpperCase(); if (!b.trim()) return []; return [...new Set([b.replace(/[^A-Z0-9]/g, ""), ...b.split(/[\s/,()]+/).map((p) => p.replace(/[^A-Z0-9]/g, "")).filter(Boolean)])]; }
const normCode = (c) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
function ressemblance(c, x, sure) {
  if (x === c) return 100 + c.length;
  if (c.length >= 3 && x.startsWith(c) && (c.length >= 4 || /\d/.test(x[c.length] ?? ""))) return 50 + c.length;
  if (sure && c.length === 3 && x.startsWith(c)) return 40 + c.length;
  if (x.length >= 6 && c.length > x.length && c.startsWith(x)) return 10 + x.length;
  return 0;
}
const SECOND_MOT = /^(CONNECT|CUSTOM|COURIER)$/;
const familleModele = (m) => { const w = m.toUpperCase().replace(/[,/(|].*$/, "").replace(/^([A-Z]) (\d{2,3})\b/, "$1$2").split(/\s+/).map((x) => x.replace(/[^A-Z0-9-]/g, "")).filter(Boolean); return (w[0] ?? "") + (SECOND_MOT.test(w[1] ?? "") ? " " + w[1] : ""); };
const cleMarque = (m) => { const u = m.toUpperCase(); if (/CITRO/.test(u)) return "CITROEN"; if (/MERCEDES/.test(u)) return "MERCEDES"; if (/\bVW\b|VOLKSWAGEN/.test(u)) return "VW"; if (/LAND ROVER/.test(u)) return "LANDROVER"; return u.split(/[\s(]+/)[0]; };
const ESSENCE = /GTDI|T-?GDI|\bGDI\b|TFSI|\bTSI\b|\bFSI\b|ECOBOOST|PURETECH|\bTHP\b|\bVTI\b|\bTCE\b|\bSCE\b|\bMPI\b|VVT|DIG-T|MULTIAIR|TWINAIR|DUALJET|\bGTI\b|\bLPG\b|\bCNG\b|\bGPL\b|HYBRID/i;
const DIESEL = /TDCI|TDDI|TDE|TDI|SDI|\bDI\b|\bD\b|\bTD\b|\bDT\b|DIESEL|ECOBLUE|DURATORQ|ECOTORQ|CRDI|DCI|HDI|CDTI|CDI|DTI|JTD|MULTIJET|MJET|D-?4D|DI-?D|\bCRD\b|DTEC|D-CAT|\bD\d\b|XDI|DDIS|BLUETEC|\bTDS\b/i;
const estDiesel = (t) => !ESSENCE.test(t) && DIESEL.test(t);
const designation = (cm, texte, modele) => { let u = (texte ?? "").toUpperCase(); if (cm === "MERCEDES" && /^\d{3}/.test(u) && modele) u = familleModele(modele).replace(/[^A-Z]/g, "") + " " + u; const m = cm === "MERCEDES" ? u.match(/^([A-Z]+)\s*(\d{3})\b/) : cm === "BMW" ? u.match(/^(\d{3})\s*([A-Z]{1,2})\b/) : null; return m ? m[1] + m[2] : null; };
function clesVoiture(v) {
  const ch = Number((String(v.puissance ?? "").match(/\d+(?:[.,]\d+)?/) ?? [""])[0].replace(",", "."));
  if (!ch) return [];
  const carb = estDiesel(`${v.moteur} ${v.code_moteur ?? ""}`) ? "D" : "E";
  const kw = Math.round(ch * 0.7355); const cm = cleMarque(v.marque);
  const cyl = (v.moteur ?? "").match(/(\d)[.,](\d)/); const des = designation(cm, v.moteur, v.modele);
  const bases = [...(des ? [`~${cm}|=${des}|${carb}|`] : []), ...(cyl ? [`~${cm}|${familleModele(v.modele)}|${cyl[1]}.${cyl[2]}|${carb}|`] : [])];
  return bases.flatMap((b) => [0, -1, 1, -2, 2].map((d) => b + (kw + d)));
}
const anneeDe = (s) => { const m = (s ?? "").match(/(\d{4})/); return m ? Number(m[1]) : null; };
const dansPeriode = (variante, annee) => { const m = variante.match(/^(\d{4})-(\d{4})?/); if (!m || annee == null) return true; return annee >= Number(m[1]) - 1 && annee <= (m[2] ? Number(m[2]) : 9999) + 1; };

// ---------- Lecture ----------
console.log("Huiles…");
const huiles = [];
for (let a = 0; ; a += 1000) {
  const { data, error } = await sb.from("huiles_moteurs").select("code, variante, viscosites, litres_min, litres_max, marques, description").order("code").order("variante").range(a, a + 999);
  if (error) throw error; huiles.push(...data); if (data.length < 1000) break;
}
const cles = new Map(); const codes = []; const parPrefixe = new Map();
for (const h of huiles) {
  if (h.code.startsWith("~")) { const l = cles.get(h.code) ?? []; l.push(h); cles.set(h.code, l); continue; }
  codes.push(h);
  const n = normCode(h.code); const p = n.slice(0, 3); const l = parPrefixe.get(p) ?? []; l.push({ h, n }); parPrefixe.set(p, l);
}
const memo = new Map();
function parCode(code, marque) {
  const m = morceaux(code); if (!m.length) return [];
  const f = familleMarque(marque); const cle = `${f}§${code}`;
  if (memo.has(cle)) return memo.get(cle);
  const cand = new Map();
  for (const x of m) for (const c of parPrefixe.get(x.slice(0, 3)) ?? []) cand.set(c.h, c.n);
  const notes = [...cand].filter(([h]) => !h.marques?.length || h.marques.some((x) => familleMarque(x) === f))
    .map(([h, n]) => ({ h, n: Math.max(0, ...m.map((x) => ressemblance(n, x, !!h.marques?.length))) })).filter((x) => x.n > 0);
  let res = [];
  if (notes.length) {
    const best = Math.max(...notes.map((x) => x.n)); const top = notes.filter((x) => x.n === best);
    if (!(best < 40 && new Set(top.map((x) => [...x.h.viscosites].sort().join(","))).size > 1)) res = top.filter((x) => x.h.code === top[0].h.code).map((x) => x.h);
  }
  memo.set(cle, res); return res;
}
function huileDe(v) {
  const p = parCode(v.code_moteur, v.marque); if (p.length) return p;
  const annee = anneeDe(v.annee_debut);
  for (const c of clesVoiture(v)) { const l = (cles.get(c) ?? []).filter((h) => dansPeriode(h.variante, annee)); if (l.length) return l; }
  return [];
}

const CAT = { filtre_huile: "huile", filtre_air: "air", filtre_habitacle: "habitacle", filtre_carburant: "gasoil" };
const ROMAINS = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
const versions = new Map();
for (const marque of MARQUES) {
  let n = 0;
  for (let a = 0; ; a += 1000) {
    const { data, error } = await sb.from("applications").select("marque, modele, moteur, code_moteur, puissance, annee_debut, annee_fin, product:products(reference, categorie)").eq("marque", marque).order("id").range(a, a + 999);
    if (error) throw error;
    for (const r of data) {
      const k = [r.marque, r.modele, r.moteur, r.code_moteur, r.puissance, r.annee_debut].join("|");
      let v = versions.get(k);
      if (!v) { v = { r, filtres: {} }; versions.set(k, v); }
      const cat = CAT[r.product?.categorie];
      if (cat && r.product?.reference) (v.filtres[cat] ??= new Set()).add(r.product.reference);
    }
    n += data.length; if (data.length < 1000) break;
  }
  process.stdout.write(`${marque} ${n} · `);
}
console.log(`\n${versions.size} versions`);

const sortie = [];
let avecHuile = 0;
for (const { r, filtres } of versions.values()) {
  const nomModele = (r.modele ?? "").split("|")[0].trim();               // « Golf VII (5G1, BQ1, BE2) »
  const court = nomModele.replace(/\s*\(.*$/, "").split(/\s*\/\s*/)[0].trim(); // « Golf VI/Cabrio VI (5K1) » → « Golf VI »
  const mots = court.split(/\s+/);
  const fam = (mots[0] ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const gen = ROMAINS[(mots[1] ?? "").split("/")[0].toUpperCase()] ?? null; // « Golf VI/Cabrio VI » → 6
  const h = huileDe(r);
  if (h.length) avecHuile++;
  const ch = Number((String(r.puissance ?? "").match(/\d+/) ?? [""])[0]) || null;
  sortie.push({
    ma: cleMarque(r.marque), mo: court, fam, gen,
    mot: (r.moteur ?? "").replace(/\s*\(.*$/, "").split(",")[0].trim(), ch, // « 1.6 TDI, 1.6 TDI Blue Motion (5K1. AJ5) » → « 1.6 TDI »
    code: (r.code_moteur ?? "").trim(),
    carb: estDiesel(`${r.moteur} ${r.code_moteur ?? ""}`) ? "diesel" : "essence",
    ans: [anneeDe(r.annee_debut), anneeDe(r.annee_fin)].filter(Boolean).join("-") || "",
    f: Object.fromEntries(Object.entries(filtres).map(([c, s]) => [c, [...s].slice(0, 2)])),
    h: h.map((x) => ({ v: x.variante || "", visc: x.viscosites, l: [x.litres_min, x.litres_max], d: x.description || "" })),
  });
}
mkdirSync(dirname(SORTIE), { recursive: true });
const json = JSON.stringify({ source: "FiltroPro (Filtron + guide des huiles Liqui Moly)", genere_le: new Date().toISOString(), versions: sortie });
writeFileSync(SORTIE, json);
console.log(`→ ${SORTIE} : ${sortie.length} versions (${Math.round(avecHuile / sortie.length * 100)} % avec l'huile) · ${(json.length / 1e6).toFixed(1)} Mo`);
const golf = sortie.filter((v) => v.ma === "VW" && v.fam === "golf" && (v.gen === 6 || v.gen === 7) && /1\.6/.test(v.mot) && v.carb === "diesel");
for (const v of golf.slice(0, 6)) console.log(`  ${v.mo} ${v.mot} ${v.ch} ch ${v.code} ${v.ans} · huile ${v.f.huile?.join("/") ?? "?"} · ${v.h.map((x) => `${x.v || "-"} ${x.visc.join("/")} ${x.l[1]} L`).join(" | ") || "huile ?"}`);
