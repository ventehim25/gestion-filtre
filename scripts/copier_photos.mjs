// COPIE DES PHOTOS de filtres chez nous (BIBLE §8.14, 14/11/2026).
// Les photos viennent du serveur d'images MANN+HUMMEL (Scene7). Si ce serveur change ou ne répond plus,
// l'app affiche notre copie (src/components/FilterImage.tsx : dernier essai avant le logo).
//
//   node scripts/copier_photos.mjs              → toutes les références (reprend là où il s'est arrêté)
//   node scripts/copier_photos.mjs --limite 20  → essai sur 20 références
//   node scripts/copier_photos.mjs --refaire    → recopie même ce qui est déjà copié, et réessaie les « sans photo »
//
// Pour chaque produit : même ordre d'essai que l'app (image_url, puis les variantes Scene7).
// La première photo qui répond est gardée en 2 endroits :
//   - sur le PC : backups/photos/<NOM>.jpg (+ index.json)
//   - dans Supabase Storage : produits/copie/<NOM>.jpg (public, comme le catalogue)
// <NOM> = nom Scene7 de la référence (OP540/1 → OP_540.1), même calcul que copieKey() de FilterImage.tsx.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = join(ROOT, "backups", "photos");
const INDEX = join(DOSSIER, "index.json");
const ECART = 300; // ms entre deux demandes d'un même fil
const LARGEUR = 700;
const EN_PARALLELE = 3; // 3 demandes à la fois au plus : léger pour leur serveur

const args = process.argv.slice(2);
const LIMITE = args.includes("--limite") ? Number(args[args.indexOf("--limite") + 1]) : Infinity;
const REFAIRE = args.includes("--refaire");

const sb = createClient(SUPABASE_URL, SUPABASE_CLE, { auth: { persistSession: false } });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function s7Name(ref) {
  const m = ref.toUpperCase().match(/^([A-Z]+)\s*(.+)$/);
  return m ? m[1] + "_" + m[2].replace(/\//g, ".") : ref.toUpperCase();
}
const copieKey = (ref) => s7Name(ref).replace(/[^A-Za-z0-9._-]/g, "_");
const s7 = (ref, suffixe) => `https://s7g10.scene7.com/is/image/mannhummel/${s7Name(ref)}${suffixe}`;

async function tousLesProduits() {
  const out = [];
  for (let p = 0; ; p++) {
    const { data, error } = await sb.from("products").select("reference,image_url").order("reference").range(p * 1000, p * 1000 + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

async function dejaEnLigne() {
  const noms = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from("produits").list("copie", { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(error.message);
    for (const f of data) noms.add(f.name);
    if (data.length < 1000) return noms;
  }
}

// Renvoie { buf, source } ; null si la photo n'existe pas ; lance une erreur si le réseau ne répond pas
async function telecharger(url) {
  const r = await fetch(`${url}?qlt=85&wid=${LARGEUR}`, { headers: { "User-Agent": "Mozilla/5.0 FiltroPro-copie-photos" } });
  if (r.status === 403 || r.status === 404) return null;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const type = r.headers.get("content-type") || "";
  if (!type.startsWith("image/")) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.length > 500 ? buf : null;
}

mkdirSync(DOSSIER, { recursive: true });
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : { photos: {}, sans_photo: [] };
const sansPhoto = new Set(index.sans_photo);
const produits = await tousLesProduits();
const enLigne = await dejaEnLigne();
const vus = new Set();
const stats = { produits: produits.length, copiees: 0, deja: 0, sans_photo: 0, erreurs: 0 };
console.log(`${produits.length} produits · ${enLigne.size} photos déjà en ligne`);

let traites = 0, echecsDeSuite = 0, enPause = null;
const ecrireIndex = () => { index.sans_photo = [...sansPhoto].sort(); writeFileSync(INDEX, JSON.stringify(index, null, 1)); };

// Liste des références à traiter (une seule fois par nom de photo)
const aFaire = [];
for (const p of produits) {
  const cle = copieKey(p.reference);
  if (vus.has(cle)) continue;
  vus.add(cle);
  const fichier = `${cle}.jpg`;
  if (!REFAIRE && enLigne.has(fichier) && existsSync(join(DOSSIER, fichier))) {
    stats.deja++;
    if (!index.photos[p.reference]) index.photos[p.reference] = { fichier, source: "", octets: statSync(join(DOSSIER, fichier)).size, date: "" };
    continue;
  }
  if (!REFAIRE && sansPhoto.has(p.reference)) { stats.sans_photo++; continue; }
  if (aFaire.length < LIMITE) aFaire.push({ p, fichier });
}
console.log(`${aFaire.length} références à copier (${EN_PARALLELE} à la fois)`);

async function traiter({ p, fichier }) {
  const essais = [...(p.image_url ? [p.image_url.split("?")[0]] : []),
    s7(p.reference, "-1"), s7(p.reference, ""), s7(p.reference, "-filter-with-box"), s7(p.reference, "-2"), s7(p.reference, "-3")];
  let trouve = null, source = "", panne = false;
  for (const url of [...new Set(essais)]) {
    if (enPause) await enPause;
    try {
      await pause(ECART);
      const buf = await telecharger(url);
      if (buf) { trouve = buf; source = url; break; }
    } catch (e) { panne = true; console.log(`  ⚠ ${p.reference} : ${e.message}`); break; }
  }
  if (panne) {
    stats.erreurs++;
    if (++echecsDeSuite >= 5 && !enPause) {
      console.log("5 échecs de suite : pause 5 minutes");
      enPause = pause(300000).then(() => { enPause = null; echecsDeSuite = 0; });
    }
    return;
  }
  echecsDeSuite = 0;
  if (!trouve) { stats.sans_photo++; sansPhoto.add(p.reference); return; }
  writeFileSync(join(DOSSIER, fichier), trouve);
  const { error } = await sb.storage.from("produits").upload(`copie/${fichier}`, trouve, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
  if (error) { stats.erreurs++; console.log(`  ✖ envoi ${fichier} : ${error.message}`); return; }
  sansPhoto.delete(p.reference);
  index.photos[p.reference] = { fichier, source, octets: trouve.length, date: new Date().toISOString().slice(0, 10) };
  stats.copiees++;
  if (stats.copiees % 50 === 0) { ecrireIndex(); console.log(`… ${stats.copiees} copiées / ${aFaire.length}`); }
}

let suivant = 0;
await Promise.all(Array.from({ length: EN_PARALLELE }, async () => {
  while (suivant < aFaire.length) { const item = aFaire[suivant++]; traites++; await traiter(item); }
}));

ecrireIndex();
console.log("=== TERMINÉ ===", stats);
