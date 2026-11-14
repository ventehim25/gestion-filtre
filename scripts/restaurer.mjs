// REMETTRE des données depuis une sauvegarde de scripts/sauvegarde.mjs (BIBLE §8.14, 14/11/2026).
// Par défaut : ne fait que COMPARER (rien n'est écrit).
//
//   node scripts/restaurer.mjs                                   → liste les sauvegardes
//   node scripts/restaurer.mjs 2026-11-14                        → compare toutes les tables avec la base
//   node scripts/restaurer.mjs 2026-11-14 applications --ecrire  → remet les lignes MANQUANTES de cette table
//   node scripts/restaurer.mjs 2026-11-14 tout --ecrire          → remet les lignes manquantes de toutes les tables
//   … --remplacer : écrase AUSSI les lignes existantes avec la version de la sauvegarde (stock, prix…) — à éviter
//                   sauf si la base a été abîmée : les ventes faites depuis la sauvegarde seraient perdues.
// Ne supprime jamais rien dans la base.
import { createClient } from "@supabase/supabase-js";
import { gunzipSync } from "node:zlib";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = join(ROOT, "backups");
// Les tables dont les autres dépendent passent d'abord (un filtre avant ses voitures, une vente avant ses lignes)
const ORDRE = ["utilisateurs_autorises", "fournisseurs", "products", "vehicules", "clients", "garages", "prospects",
  "equivalences", "applications", "compatibilites", "receptions", "sales", "sale_items", "avances"];

const args = process.argv.slice(2);
const ECRIRE = args.includes("--ecrire");
const REMPLACER = args.includes("--remplacer");
const [jour, quoi] = args.filter((a) => !a.startsWith("--"));

if (!jour) {
  const dates = existsSync(DOSSIER) ? readdirSync(DOSSIER).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort() : [];
  console.log(dates.length ? `Sauvegardes disponibles :\n  ${dates.join("\n  ")}` : "Aucune sauvegarde dans backups/");
  process.exit(0);
}

const dossier = join(DOSSIER, jour);
const manifeste = JSON.parse(readFileSync(join(dossier, "manifeste.json"), "utf8"));
const sb = createClient(SUPABASE_URL, SUPABASE_CLE, { auth: { persistSession: false } });
const cleDe = (ligne, cles) => cles.map((c) => String(ligne[c])).join("|");

async function clesEnBase(nom, cles) {
  const vues = new Set();
  for (let p = 0; ; p++) {
    let q = sb.from(nom).select(cles.join(","));
    for (const c of cles) q = q.order(c, { ascending: true });
    const { data, error } = await q.range(p * 1000, p * 1000 + 999);
    if (error) throw new Error(`${nom} : ${error.message}`);
    for (const l of data) vues.add(cleDe(l, cles));
    if (data.length < 1000) return vues;
  }
}

const noms = Object.keys(manifeste.tables).sort((a, b) => {
  const ia = ORDRE.indexOf(a), ib = ORDRE.indexOf(b);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
});
const choisies = !quoi || quoi === "tout" ? noms : [quoi];
if (ECRIRE && !quoi) { console.log("Pour écrire, précise une table ou « tout »."); process.exit(1); }

console.log(`=== Sauvegarde du ${jour} ${ECRIRE ? (REMPLACER ? "→ ÉCRITURE (remplace aussi l'existant)" : "→ ÉCRITURE (lignes manquantes seulement)") : "(comparaison, rien n'est écrit)"} ===`);
for (const nom of choisies) {
  const info = manifeste.tables[nom];
  if (!info) { console.log(`✖ ${nom} : absente de cette sauvegarde`); continue; }
  const lignes = JSON.parse(gunzipSync(readFileSync(join(dossier, info.fichier))).toString("utf8"));
  const presentes = await clesEnBase(nom, info.cles);
  const manquantes = lignes.filter((l) => !presentes.has(cleDe(l, info.cles)));
  const aEcrire = REMPLACER ? lignes : manquantes;
  console.log(`${nom.padEnd(24)} sauvegarde ${String(lignes.length).padStart(7)} · base ${String(presentes.size).padStart(7)} · manquantes ${String(manquantes.length).padStart(7)}`);
  if (!ECRIRE || !aEcrire.length) continue;
  let ecrites = 0;
  for (let i = 0; i < aEcrire.length; i += 500) {
    const lot = aEcrire.slice(i, i + 500);
    const { error } = await sb.from(nom).upsert(lot, { onConflict: info.cles.join(","), ignoreDuplicates: !REMPLACER });
    if (error) { console.log(`  ✖ arrêt à la ligne ${i} : ${error.message}`); break; }
    ecrites += lot.length;
  }
  console.log(`  → ${ecrites} ligne(s) écrite(s)`);
}
