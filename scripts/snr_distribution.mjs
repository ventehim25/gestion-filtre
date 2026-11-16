// Catalogue officiel NTN-SNR « Distribution » (PDF public, 2019) → références SNR + véhicules + équivalences.
// Source : https://www.ntn-snr.com/sites/default/files/2019-03/cat-distribution_2019-opt.pdf (BIBLE §8.34)
// Étape 1 (ce script) : EXTRACTION seulement, sans rien écrire dans la base → backups/snr/snr_distribution.json
//   node scripts/snr_distribution.mjs <chemin du PDF> [--debut 5] [--fin 740]
// Ne jamais inventer : seules les lignes lues dans le PDF sont gardées ; une ligne douteuse est comptée à part.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pdfjs = await import("file:///" + require.resolve("pdfjs-dist/legacy/build/pdf.mjs").replace(/\\/g, "/"));

const args = process.argv.slice(2);
const pdfPath = args.find((a) => a.toLowerCase().endsWith(".pdf"));
if (!pdfPath) { console.error("Usage : node scripts/snr_distribution.mjs <catalogue.pdf>"); process.exit(1); }
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? +args[i + 1] : d; };

const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(pdfPath)), useSystemFonts: true }).promise;
const DEBUT = opt("--debut", 1), FIN = Math.min(opt("--fin", doc.numPages), doc.numPages);

const DATE = /^\d{4}\/\d{2}$/;
const REF = /^(KDP|KD|GT|GE|KDC|KDA|KA|WP|CA)\d{3}\.\d{2,3}$/; // familles SNR vues dans le catalogue
const estCodeMoteur = (s) => /[A-Z0-9]/.test(s) && !DATE.test(s);

const lignesDe = (items) => {
  // Regroupe les éléments d'une même ligne (y à ±2 près), triés de haut en bas puis de gauche à droite
  const tri = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const out = [];
  for (const it of tri) {
    const l = out.find((L) => Math.abs(L.y - it.y) <= 2.5);
    if (l) l.items.push(it); else out.push({ y: it.y, items: [it] });
  }
  for (const l of out) l.items.sort((a, b) => a.x - b.x);
  return out.sort((a, b) => b.y - a.y);
};

const apps = [];            // { marque, modele, modeleDebut, version, moteurs[], debut, fin, dents, refs[] , page }
const douteuses = [];
const prefixes = {};
let marque = "", modele = "", modeleDebut = "", version = "", moteurs = [];

for (let p = DEBUT; p <= FIN; p++) {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  const items = tc.items.filter((i) => i.str.trim()).map((i) => ({
    x: i.transform[4], y: i.transform[5], f: Math.abs(i.transform[0]), s: i.str.trim(),
  }));
  for (const l of lignesDe(items)) {
    const its = l.items.filter((i) => i.f > 1); // f=0 : texte caché (index de marge)
    if (!its.length) continue;
    const gauche = its[0];
    // Marque : gros titre en haut de page (≈ 15 pt)
    if (gauche.f >= 14.5 && l.y > 740) { const m = its.map((i) => i.s).join(" ").trim(); if (/^[A-Z0-9 .\-’'&/]+$/.test(m)) { if (m !== marque) { modele = ""; version = ""; moteurs = []; } marque = m; } continue; }
    // Modèle : ≈ 14 pt à gauche, suivi de sa date de début
    if (gauche.f >= 13 && gauche.f < 14.5 && gauche.x < 80) {
      modele = gauche.s; modeleDebut = its.find((i) => DATE.test(i.s))?.s ?? ""; version = ""; moteurs = []; continue;
    }
    // Version : ≈ 9 pt tout à gauche (x ≈ 68)
    if (gauche.x < 80 && gauche.f < 13 && !DATE.test(gauche.s)) { version = its.map((i) => i.s).join(" ").trim(); moteurs = []; continue; }
    // Codes moteur : repère « m » (x ≈ 83) + texte à x ≈ 101 qui n'est pas une date
    const texte101 = its.find((i) => i.x > 95 && i.x < 110);
    const repereM = its.some((i) => i.s === "m" && i.x > 78 && i.x < 92);
    if (texte101 && !DATE.test(texte101.s) && (repereM || /[A-Z]\d|\d[A-Z]/.test(texte101.s))) {
      moteurs = texte101.s.split("/").map((x) => x.trim()).filter(estCodeMoteur); continue;
    }
    // Application : date de début à x ≈ 101
    if (texte101 && DATE.test(texte101.s)) {
      const fin = its.find((i) => i.x > 135 && i.x < 175 && DATE.test(i.s))?.s ?? "";
      const dents = its.find((i) => i.x > 195 && i.x < 222 && /^\d{2,3}$/.test(i.s))?.s ?? "";
      const refs = its.filter((i) => i.x > 235).map((i) => i.s).filter((s) => REF.test(s));
      for (const r of its.filter((i) => i.x > 235).map((i) => i.s)) { const k = (r.match(/^[A-Z]+/) ?? ["?"])[0]; prefixes[k] = (prefixes[k] ?? 0) + 1; }
      const ligne = { page: p, marque, modele, modeleDebut, version, moteurs: [...moteurs], debut: texte101.s, fin, dents, refs };
      if (!marque || !modele || !refs.length) douteuses.push(ligne); else apps.push(ligne);
    }
  }
  if (p % 50 === 0) process.stderr.write(`page ${p}/${FIN}…\n`);
}

// ---- Liste de correspondances (pages ≈ 688-733) : 3 colonnes par page, chacune « réf. autre marque | réf. SNR ».
// Le nom de la marque (CONTITECH, DAYCO, GATES, INA, SKF… ou le constructeur pour les numéros d'origine) apparaît
// en tête de bloc et vaut pour les lignes suivantes (lecture colonne par colonne, de page en page).
// « * » après la réf. SNR = équivalence PARTIELLE → pas gardée comme équivalence (comptée à part).
const SNR_REF = /^(KDP|KD|GT|GE|KDC|GA)\d{3}\.\d{2,3}(\*)?$/;
const equivs = []; const partielles = []; let marqueEq = "";
const DEB_EQ = opt("--eq-debut", 688), FIN_EQ = Math.min(opt("--eq-fin", 733), doc.numPages);
for (let p = DEB_EQ; p <= FIN_EQ; p++) {
  const tc = await (await doc.getPage(p)).getTextContent();
  const its = tc.items.filter((i) => i.str.trim() && Math.abs(i.transform[0]) > 1)
    .map((i) => ({ x: i.transform[4], y: i.transform[5], s: i.str.trim() })).filter((i) => i.y > 60 && i.y < 820);
  for (let c = 0; c < 3; c++) {
    const col = its.filter((i) => (c === 0 ? i.x < 200 : c === 1 ? i.x >= 200 && i.x < 400 : i.x >= 400));
    if (!col.length) continue;
    const x0 = Math.min(...col.map((i) => i.x));
    for (const l of lignesDe(col)) {
      const gauche = l.items.filter((i) => i.x < x0 + 70).map((i) => i.s).join(" ").trim();
      const droite = l.items.filter((i) => i.x >= x0 + 70).map((i) => i.s).join("").trim();
      const m = droite.match(SNR_REF);
      if (!m) { if (gauche && /^[A-Z][A-Z0-9 .\-:,&]+$/.test(gauche) && !/\d{3}/.test(gauche)) marqueEq = gauche.replace(/,\s*$/, ""); continue; }
      if (!gauche || !marqueEq) continue;
      const e = { marque: marqueEq, reference: gauche, snr: droite.replace("*", ""), page: p };
      (m[2] ? partielles : equivs).push(e);
    }
  }
}

mkdirSync("backups/snr", { recursive: true });
writeFileSync("backups/snr/snr_distribution.json", JSON.stringify({ source: "NTN-SNR cat-distribution 2019", pages: [DEBUT, FIN], apps, douteuses, equivs, partielles }, null, 1));
const parMarqueEq = {}; for (const e of equivs) parMarqueEq[e.marque] = (parMarqueEq[e.marque] ?? 0) + 1;
console.log(`Équivalences : ${equivs.length} (+ ${partielles.length} partielles écartées)`, parMarqueEq);
const refs = new Set(apps.flatMap((a) => a.refs));
const parType = {}; for (const r of refs) { const k = r.match(/^[A-Z]+/)[0]; parType[k] = (parType[k] ?? 0) + 1; }
console.log(`Applications : ${apps.length} · douteuses : ${douteuses.length}`);
console.log(`Marques : ${new Set(apps.map((a) => a.marque)).size} · modèles : ${new Set(apps.map((a) => a.marque + "|" + a.modele)).size}`);
console.log("Références distinctes par type :", parType);
console.log("Textes vus dans les colonnes de références (préfixes) :", prefixes);
console.log("Lignes sans nombre de dents :", apps.filter((a) => !a.dents).length);
