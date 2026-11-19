// Import du catalogue PDF OFFICIEL Airtex « Water Pumps & Timing Belt Kit » (airtexautomotive.it → Support → Catalogues,
// édité par Metelli S.p.A., janvier 2026 : WATER-PUMPS-AIRTEX-GENNAIO-2026.pdf) → fiches Airtex (stock 0) :
//   WPA-… = pompe à eau (catégorie pompe_eau) · WPK-… = kit de distribution + pompe à eau (kit_distribution_pompe)
// + les voitures de chaque pièce, reliées aux voitures Filtron (même règle que Gates / Metelli : code moteur, puissance,
// années, scripts/lib_voitures.mjs) + la remarque du catalogue (dates, roulement renforcé, courroie dents × largeur…).
// Demande de l'utilisateur (19/11/2026) : « rajouter la référence pompe à eau, la référence Airtex ». BIBLE §8.45. Rien d'inventé.
// Le catalogue n'a pas de table d'équivalences (page « Adaptable to » vide dans cette édition).
//
//   node scripts/import_airtex_pompes.mjs "<PDF>"                       (lecture + essai à blanc)
//   node scripts/import_airtex_pompes.mjs "<PDF>" --ecrire [--remplacer]
import { createClient } from "@supabase/supabase-js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";
import * as lib from "./lib_voitures.mjs";
import { sansAccent, codes, ecrireDate, ch } from "./lib_voitures.mjs";

const args = process.argv.slice(2);
const [PDF] = args.filter((a) => !a.startsWith("--"));
const ECRIRE = args.includes("--ecrire");
const REMPLACER = args.includes("--remplacer");
if (!PDF) { console.error('Usage : node scripts/import_airtex_pompes.mjs "<PDF>" [--ecrire] [--remplacer]'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_CLE, { global: { fetch: lib.fetchAvecReprise } });
const DOSSIER = join(process.cwd(), "backups", "airtex");
mkdirSync(DOSSIER, { recursive: true });

const REF = /^WP[AK]-[A-Z]?\d{3,6}[A-Z0-9]*(-[A-Z0-9]{1,2})?$/; // WPA-1741, WPA-1958A, WPA-E3835, WPA-1164-C, WPA-2131A-8, WPK-2131A01
const RE_MOTEUR = /^(.*?)\s*\(\s*(\d+)\s*kW\)\s*(?:Eng\.\s*(.*?))?\s+(\.\/\.-|\d{1,2}\/\d{2}\s*-\s*(?:\d{1,2}\/\d{2})?)\s*$/;
const RE_MODELE = /^(.*?)\s+(\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{2})\s*$/;

// ───────────── 1. Lecture ─────────────
// Pages voitures : marque en haut à droite (taille 15, police du titre), modèle (taille 15, avec dates), ligne moteur
// à gauche (x ≈ 31) « 1.2 16V ( 55 kW) Eng.D4F 732, D4F 734 2/06-1/70 », puis les réf. Airtex (x ≈ 39-45), une
// restriction de dates (x ≈ 130 : « 01/09- », « -10/12 »), une puce (x ≈ 223) et la note (x ≥ 240).
async function lire(fichier) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(fichier)), verbosity: 0 }).promise;
  const lignes = [], inconnus = {};
  let marque = null, modele = null, mDe = null, mA = null, moteur = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const its = (await page.getTextContent()).items.filter((i) => i.str?.trim())
      .map((i) => ({ x: i.transform[4], y: i.transform[5], h: i.transform[0], f: i.fontName, s: i.str.trim() }));
    page.cleanup();
    if (!its.some((i) => /ref$/i.test(i.s) && i.y > 760) || !its.some((i) => i.s === "NOTE")) continue;
    const corps = its.filter((i) => i.y > 30 && i.y < 765 && i.h < 14).sort((a, b) => b.y - a.y || a.x - b.x);
    const grandes = [];
    for (const i of its.filter((i) => i.h >= 14 && i.y > 30).sort((a, b) => b.y - a.y || a.x - b.x)) {
      const l = grandes.find((g) => Math.abs(g.y - i.y) < 2.5);
      if (l) { l.s += " " + i.s; l.polices.add(i.f); } else grandes.push({ y: i.y, x: i.x, s: i.s, polices: new Set([i.f]), titre: true });
    }
    const policeMarque = new Set(its.filter((i) => i.h >= 14 && i.y > 785).map((i) => i.f));
    const flux = [...grandes, ...corps].sort((a, b) => b.y - a.y || a.x - b.x);
    for (const i of flux) {
      if (i.titre) {
        const m = i.s.match(RE_MODELE);
        const estMarque = !m && (policeMarque.size ? [...i.polices].every((f) => policeMarque.has(f)) : i.s === i.s.toUpperCase());
        if (m) { modele = m[1].trim(); mDe = m[2]; mA = m[3]; moteur = null; }
        else if (estMarque) { if (i.s !== marque) { marque = i.s; modele = null; moteur = null; } }
        else { modele = i.s.trim(); mDe = null; mA = null; moteur = null; }
        continue;
      }
      if (i.x < 36 && /kW\)/.test(i.s)) {
        const m = i.s.match(RE_MOTEUR);
        if (!m) { inconnus["moteur illisible"] = (inconnus["moteur illisible"] ?? 0) + 1; moteur = null; continue; }
        const dates = m[4].match(/(\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{2})?/);
        moteur = { label: m[1].trim(), kw: Number(m[2]), codes: (m[3] ?? "").trim().replace(/^-$/, ""), de: dates?.[1] ?? mDe, a: dates ? (dates[2] ?? "1/70") : mA };
        continue;
      }
      if (i.x >= 34 && i.x < 100 && REF.test(i.s)) {
        const meme = corps.filter((j) => Math.abs(j.y - i.y) < 2.6 && j !== i);
        const quand = meme.filter((j) => j.x >= 100 && j.x < 215).map((j) => j.s).join(" ");
        const note = meme.filter((j) => j.x >= 238).map((j) => j.s).join(" ");
        if (!marque || !modele || !moteur) { inconnus["pièce sans voiture"] = (inconnus["pièce sans voiture"] ?? 0) + 1; continue; }
        lignes.push({ page: p, marque, modele, ...moteur, ref: i.s, quand, note });
      } else if (i.x >= 34 && i.x < 100 && /^WP/.test(i.s)) inconnus[`réf. inhabituelle ${i.s}`] = (inconnus[`réf. inhabituelle ${i.s}`] ?? 0) + 1;
    }
  }
  return { pages: doc.numPages, lignes, inconnus };
}
const cache = join(DOSSIER, `lecture-${basename(PDF).replace(/\.pdf$/i, "").replace(/\s+/g, "_")}.json`);
let X;
if (existsSync(cache) && statSync(cache).mtimeMs > statSync(PDF).mtimeMs) X = JSON.parse(readFileSync(cache, "utf8"));
else { console.log(`Lecture de ${basename(PDF)} (≈ 5 000 pages, quelques minutes)…`); X = await lire(PDF); writeFileSync(cache, JSON.stringify(X)); }
const refsLues = new Set(X.lignes.map((l) => l.ref));
console.log(`${X.pages} pages · ${X.lignes.length} lignes voiture → pièce · ${refsLues.size} réf. (${[...refsLues].filter((r) => r.startsWith("WPA")).length} pompes WPA, ${[...refsLues].filter((r) => r.startsWith("WPK")).length} kits WPK) · écartés`, X.inconnus);

// ───────────── 2. Fiches ─────────────
const normDents = (s) => s.trim().replace(/\s*[x×X]\s*/, "/").replace(/\s+/g, "").replace(",", ".");
const dentsValides = (s) => /^\d{2,3}\/\d{1,2}(\.\d)?$/.test(s);
const plusFrequent = (arr) => { const m = new Map(); for (const x of arr) if (x) m.set(x, (m.get(x) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""; };
const fiches = new Map();
for (const r of refsLues) {
  const kit = r.startsWith("WPK");
  const dents = kit ? plusFrequent(X.lignes.filter((l) => l.ref === r).map((l) => { const m = l.note.match(/^(\d{2,3}\s*[x×]\s*\d{1,2}(?:,\d)?)/); return m ? normDents(m[1]) : ""; }).filter(dentsValides)) : "";
  fiches.set(r, { reference: r, marque: "Airtex", categorie: kit ? "kit_distribution_pompe" : "pompe_eau", dimensions: dents || null });
}
console.log(`Fiches : ${fiches.size} (${[...fiches.values()].filter((f) => f.dimensions).length} kits avec dents/largeur)`);

// ───────────── 3. Voitures ↔ Filtron ─────────────
const dateK = (s) => { const m = (s ?? "").match(/^(\d{1,2})\/(\d{2})$/); if (!m) return null; const a = Number(m[2]); if (a === 70 && Number(m[1]) === 1) return null; return (a >= 50 ? 1900 + a : 2000 + a) * 100 + Number(m[1]); };
const marqueCatalogue = (m) => m.replace(/\s+(LCV|HCV|TRUCK|BUS)$/i, "").replace(/\s*\((DF-PSA|CHANGAN|SAIC|FAW|BRILLIANCE)\)\s*$/i, "").trim();
const CAMIONS = { VOLVO: "VOLVO CARS" };
const filtron = new Map();
for (const mc of new Set(X.lignes.map((l) => marqueCatalogue(l.marque)))) {
  try {
    const mf = CAMIONS[mc] ?? await lib.marqueFiltron(sb, mc);
    const voitures = mf ? (await lib.voituresFiltron(sb, mf, ["Gates", "Metelli", "Graf", "Airtex"])).voitures : [];
    for (const a of lib.AUSSI[sansAccent(mc)] ?? []) voitures.push(...(await lib.voituresFiltron(sb, a, ["Gates", "Metelli", "Graf", "Airtex"])).voitures);
    filtron.set(mc, { marque: mf ?? mc, voitures });
  } catch { filtron.set(mc, { marque: mc, voitures: [] }); }
}
// Remarque en français clair
function remarque(l) {
  const n = [];
  const q = l.quand.trim();
  if (/^\d{1,2}\/\d{2}\s*-$/.test(q)) n.push(`à partir de ${q.replace(/\s*-$/, "")}`);
  else if (/^-\s*\d{1,2}\/\d{2}$/.test(q)) n.push(`jusqu'à ${q.replace(/^-\s*/, "")}`);
  else if (q) n.push(q);
  let t = l.note.replace(/^•\s*/, "").trim();
  const dents = t.match(/^(\d{2,3})\s*[x×]\s*(\d{1,2}(?:,\d)?)\s*,?\s*/);
  if (dents) { n.push(`courroie ${dents[1]} dents × ${dents[2]} mm`); t = t.slice(dents[0].length); }
  t = t.replace(/\+Reinforced Bearing/gi, "roulement renforcé").replace(/\+Belt\/Cinghia/gi, "avec courroie")
    .replace(/-Back Housing/gi, "sans carter arrière").replace(/\+Back Housing/gi, "avec carter arrière")
    .replace(/Not Switchable/gi, "non pilotée").replace(/Switchable/gi, "pilotée").replace(/thermostat with opening temperature/gi, "thermostat ouverture")
    .replace(/\bVersion\b/gi, "version").replace(/\bEng\./g, "moteur ").replace(/\s+/g, " ").replace(/^,\s*|,\s*$/g, "").trim();
  if (t) n.push(t.replace(/\b(24-\d{4}[A-Z0-9-]*)/g, "réf. $1"));
  return n.join(" · ");
}
const apps = new Map();
let exactes = 0, famille = 0, catalogue = 0;
function ajouter(ref, c, rem) {
  const k = [ref, c.marque, c.modele, c.moteur ?? "", c.code_moteur ?? "", c.annee_debut ?? ""].join("|");
  const ex = apps.get(k);
  if (ex) { if (rem && !ex.remarques.includes(rem)) ex.remarques.push(rem); return; }
  apps.set(k, { ref, ...c, remarques: rem ? [rem] : [] });
}
for (const l of X.lignes) {
  const mc = marqueCatalogue(l.marque);
  const { marque: mf, voitures } = filtron.get(mc);
  const d = dateK(l.de) ?? 0, f = dateK(l.a) ?? 999912, cv = ch(l.kw);
  const { trouvees, famille: parFamille } = voitures.length ? lib.memesVoitures(voitures, { modele: l.modele, codesMoteur: codes(l.codes), cv, d, f }) : { trouvees: [], famille: false };
  const rem = [parFamille ? `moteur ${l.codes}` : "", remarque(l)].filter(Boolean).join(" · ");
  if (trouvees.length) {
    if (parFamille) famille++; else exactes++;
    for (const v of trouvees) ajouter(l.ref, { marque: v.marque, modele: v.modele, moteur: v.moteur, code_moteur: v.code_moteur, annee_debut: v.annee_debut, annee_fin: v.annee_fin, puissance: v.puissance }, rem);
  } else {
    catalogue++;
    ajouter(l.ref, { marque: mf, modele: l.modele, moteur: l.label, code_moteur: l.codes || null, annee_debut: ecrireDate(d || null), annee_fin: f === 999912 ? "" : ecrireDate(f), puissance: String(cv) }, rem);
  }
}
const tot = exactes + famille + catalogue;
console.log(`Voitures : ${exactes} reliées (code exact), ${famille} par la famille, ${catalogue} avec le nom du catalogue (${Math.round((exactes + famille) * 100 / tot)} % reliées) → ${apps.size} liens`);
console.log("Exemples Logan :", [...apps.values()].filter((a) => /Logan/i.test(a.modele) && /K9K|K7J|K7M/.test(a.code_moteur ?? "")).slice(0, 6).map((a) => `${a.ref} → ${a.modele} · ${a.moteur} · ${a.code_moteur} · ${a.puissance} ch${a.remarques.length ? " · " + a.remarques.join(" / ") : ""}`));

if (!ECRIRE) { console.log("\nEssai à blanc : rien n'est écrit. Ajouter --ecrire pour enregistrer."); process.exit(0); }

// ───────────── 4. Écriture ─────────────
const refs = [...fiches.keys()];
const existantes = new Map();
for (let i = 0; i < refs.length; i += 100) {
  const { data, error } = await sb.from("products").select("id, reference, marque").in("reference", refs.slice(i, i + 100));
  if (error) throw error;
  for (const p of data) existantes.set(p.reference, p);
}
const nouvelles = [], conflits = [];
for (const f of fiches.values()) {
  const p = existantes.get(f.reference);
  if (p) { if (sansAccent(p.marque) === sansAccent(f.marque)) f.id = p.id; else conflits.push(f.reference); continue; }
  nouvelles.push(f);
}
const NOMS = { pompe_eau: ["Pompe à eau Airtex", "مضخة الماء Airtex"], kit_distribution_pompe: ["Kit de distribution + pompe à eau Airtex", "طقم التوزيع مع مضخة الماء Airtex"] };
const creees = [];
for (let i = 0; i < nouvelles.length; i += 200) {
  const { data, error } = await sb.from("products").insert(nouvelles.slice(i, i + 200).map((f) => ({
    reference: f.reference, marque: f.marque, categorie: f.categorie, nom_fr: NOMS[f.categorie][0], nom_ar: NOMS[f.categorie][1],
    dimensions: f.dimensions, prix_achat: 0, prix_vente: 0, stock: 0, stock_min: 1,
    notes: `Catalogue officiel Airtex (PDF « ${basename(PDF)} », airtexautomotive.it)`,
  }))).select("id, reference");
  if (error) throw new Error(`fiches : ${error.message}`);
  for (const p of data) { fiches.get(p.reference).id = p.id; creees.push(p); }
}
console.log(`Fiches : ${creees.length} créées, ${fiches.size - creees.length - conflits.length} déjà là, ${conflits.length} laissées (autre marque)`);
const ids = [...fiches.values()].filter((f) => f.id).map((f) => f.id);
if (REMPLACER) {
  let n = 0;
  for (let i = 0; i < ids.length; i += 150) { const { error, count } = await sb.from("applications").delete({ count: "exact" }).in("product_id", ids.slice(i, i + 150)); if (error) throw error; n += count ?? 0; }
  console.log(`--remplacer : ${n} anciens liens effacés`);
}
const aEcrire = [...apps.values()].filter((a) => fiches.get(a.ref)?.id).map((a) => ({
  product_id: fiches.get(a.ref).id, marque: a.marque, modele: a.modele, moteur: a.moteur, code_moteur: a.code_moteur,
  annee_debut: a.annee_debut, annee_fin: a.annee_fin, puissance: a.puissance, remarque: a.remarques.join(" — ou — ") || null,
}));
let ecrites = 0;
for (let i = 0; i < aEcrire.length; i += 500) {
  const { error, count } = await sb.from("applications").upsert(aEcrire.slice(i, i + 500), { onConflict: "product_id,marque,modele,moteur,code_moteur,annee_debut", ignoreDuplicates: true, count: "exact" });
  if (error) throw new Error(`voitures : ${error.message}`);
  ecrites += count ?? 0;
}
console.log(`Voitures : ${ecrites} liens écrits (sur ${aEcrire.length})`);
writeFileSync(join(DOSSIER, `${new Date().toISOString().slice(0, 10)}-airtex.json`), JSON.stringify({ creees: creees.length, conflits, liens: aEcrire.length, ecrites }, null, 1));
