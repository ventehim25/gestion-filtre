// SAUVEGARDE COMPLÈTE de la base FiltroPro sur le PC (BIBLE §8.14, 14/11/2026).
// But : garder pour toujours les données Filtron (applications), les autres marques (equivalences),
// les produits, ventes, clients… même si Filtron change de site, bloque, ou si Supabase a un souci.
//
//   node scripts/sauvegarde.mjs            → backups/AAAA-MM-JJ/<table>.json.gz + manifeste.json
//
// - Trouve TOUTES les tables tout seul (une nouvelle table est sauvegardée sans rien changer ici).
// - Vérifie que le nombre de lignes écrites = le nombre de lignes dans la base (sinon code de sortie 1).
// - Garde les 14 dernières sauvegardes + la première de chaque mois (pour toujours).
// - Si SAUVEGARDE_COPIE=<dossier> est écrit dans .env.local (ex. un dossier Google Drive ou une clé USB),
//   la sauvegarde y est aussi copiée, avec les photos de backups/photos/ (scripts/copier_photos.mjs).
// - Dossier backups/ hors GitHub (.gitignore) : il contient les prix d'achat et les clients.
// Remettre des données : scripts/restaurer.mjs
import { createClient } from "@supabase/supabase-js";
import { gzipSync, gunzipSync } from "node:zlib";
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, renameSync, existsSync, cpSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = join(ROOT, "backups");
const PAGE = 1000;
const EN_PARALLELE = 6;
const GARDER_RECENTES = 14;

const sb = createClient(SUPABASE_URL, SUPABASE_CLE, { auth: { persistSession: false } });
const entetes = { apikey: SUPABASE_CLE, Authorization: `Bearer ${SUPABASE_CLE}` };

function lireCopie() {
  if (process.env.SAUVEGARDE_COPIE) return process.env.SAUVEGARDE_COPIE;
  const f = join(ROOT, ".env.local");
  if (!existsSync(f)) return "";
  const m = readFileSync(f, "utf8").match(/^\s*SAUVEGARDE_COPIE\s*=\s*(.+?)\s*$/m);
  return m ? m[1].replace(/^["']|["']$/g, "") : "";
}

// Liste des tables (les vues sans clé primaire sont recalculées par la base : inutile de les garder)
async function listerTables() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: entetes });
  if (!r.ok) throw new Error(`Liste des tables impossible : ${r.status}`);
  const spec = await r.json();
  const tables = [];
  for (const [nom, def] of Object.entries(spec.definitions || {})) {
    const cles = Object.entries(def.properties || {})
      .filter(([, v]) => (v.description || "").includes("<pk/>"))
      .map(([k]) => k);
    if (cles.length) tables.push({ nom, cles, colonnes: Object.keys(def.properties || {}) });
  }
  return tables.sort((a, b) => a.nom.localeCompare(b.nom));
}

async function compter(nom) {
  const { count, error } = await sb.from(nom).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${nom} : ${error.message}`);
  return count ?? 0;
}

async function lirePage(nom, cles, p) {
  for (let essai = 1; ; essai++) {
    let q = sb.from(nom).select("*");
    for (const c of cles) q = q.order(c, { ascending: true });
    const { data, error } = await q.range(p * PAGE, p * PAGE + PAGE - 1);
    if (!error) return data;
    if (essai >= 4) throw new Error(`${nom} page ${p} : ${error.message}`);
    await new Promise((r) => setTimeout(r, 2000 * essai));
  }
}

async function lireTable(t) {
  const total = await compter(t.nom);
  const pages = Math.ceil(total / PAGE);
  const lignes = new Array(pages);
  for (let i = 0; i < pages; i += EN_PARALLELE) {
    const lot = [];
    for (let p = i; p < Math.min(i + EN_PARALLELE, pages); p++) lot.push(lirePage(t.nom, t.cles, p).then((d) => (lignes[p] = d)));
    await Promise.all(lot);
  }
  return { total, lignes: lignes.flat() };
}

// Garde les N plus récentes + la plus ancienne de chaque mois
function nettoyer(dossier) {
  if (!existsSync(dossier)) return [];
  const dates = readdirSync(dossier).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort();
  const garder = new Set(dates.slice(-GARDER_RECENTES));
  const mois = new Set();
  for (const d of dates) if (!mois.has(d.slice(0, 7))) { mois.add(d.slice(0, 7)); garder.add(d); }
  const supprimees = dates.filter((d) => !garder.has(d));
  for (const d of supprimees) rmSync(join(dossier, d), { recursive: true, force: true });
  return supprimees;
}

const debut = Date.now();
const jour = new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Casablanca" }); // AAAA-MM-JJ
const cible = join(DOSSIER, jour);
const temporaire = join(DOSSIER, `.${jour}.en_cours`);
rmSync(temporaire, { recursive: true, force: true });
mkdirSync(temporaire, { recursive: true });

console.log(`=== Sauvegarde FiltroPro du ${jour} ===`);
const tables = await listerTables();
const manifeste = { date: new Date().toISOString(), projet: SUPABASE_URL, tables: {} };
let problemes = 0;

for (const t of tables) {
  const { total, lignes } = await lireTable(t);
  const fichier = `${t.nom}.json.gz`;
  const contenu = gzipSync(Buffer.from("[\n" + lignes.map((l) => JSON.stringify(l)).join(",\n") + "\n]\n", "utf8"));
  writeFileSync(join(temporaire, fichier), contenu);
  // Relecture du fichier écrit : la sauvegarde n'est bonne que si on peut la relire
  const relu = JSON.parse(gunzipSync(readFileSync(join(temporaire, fichier))).toString("utf8")).length;
  const ok = relu === total;
  if (!ok) problemes++;
  manifeste.tables[t.nom] = { lignes: relu, attendu: total, cles: t.cles, colonnes: t.colonnes, fichier, octets: contenu.length };
  console.log(`${ok ? "✔" : "✖"} ${t.nom.padEnd(24)} ${String(relu).padStart(7)} lignes  ${(contenu.length / 1024).toFixed(0).padStart(6)} Ko${ok ? "" : `  (attendu ${total})`}`);
}

writeFileSync(join(temporaire, "manifeste.json"), JSON.stringify(manifeste, null, 2));
rmSync(cible, { recursive: true, force: true });
renameSync(temporaire, cible);
const supprimees = nettoyer(DOSSIER);
console.log(`→ ${cible}`);
if (supprimees.length) console.log(`Anciennes sauvegardes retirées : ${supprimees.join(", ")}`);

const copie = lireCopie();
if (copie) {
  try {
    mkdirSync(copie, { recursive: true });
    cpSync(cible, join(copie, jour), { recursive: true });
    nettoyer(copie);
    console.log(`→ copie : ${join(copie, jour)}`);
    // Photos (scripts/copier_photos.mjs) : seulement les nouvelles, l'index est remis à jour
    const photos = join(DOSSIER, "photos");
    if (existsSync(photos)) {
      cpSync(photos, join(copie, "photos"), { recursive: true, force: false, errorOnExist: false });
      if (existsSync(join(photos, "index.json"))) cpSync(join(photos, "index.json"), join(copie, "photos", "index.json"));
      console.log(`→ photos copiées : ${join(copie, "photos")}`);
    }
  } catch (e) {
    problemes++;
    console.log(`✖ copie impossible vers ${copie} : ${e.message}`);
  }
}

console.log(`=== ${problemes ? `ATTENTION : ${problemes} problème(s)` : "TERMINÉ sans erreur"} en ${Math.round((Date.now() - debut) / 1000)} s ===`);
process.exit(problemes ? 1 : 0);
