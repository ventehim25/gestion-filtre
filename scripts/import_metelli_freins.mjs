// Import du catalogue PDF OFFICIEL Metelli « Brake Disc and Pads » (metelligroup.it → Support → Catalogues,
// « Dischi, Pastiglie freno — Metelli », juillet 2023) → fiches Metelli (disques 23-…, plaquettes 22-…, stock 0)
// + voitures (avant / arrière) + équivalences TRW / Bosch déclarées par Metelli (« Adaptable to ») + numéros d'origine.
// BIBLE §8.35. Aucune référence inventée : tout vient du PDF ; une ligne mal lue est écartée, jamais devinée.
//
//   node scripts/import_metelli_freins.mjs "<Metelli BrakeDiscandPads.pdf>"             (lecture + essai à blanc)
//   node scripts/import_metelli_freins.mjs "<pdf>" --ecrire [--remplacer]               (écrit)
//   --explique=SANDERO : montre pourquoi des voitures de ce modèle ne sont pas reliées à Filtron
//
// La lecture du PDF (5 600 pages, ≈ 3 min) est gardée dans backups/metelli/lecture-<pdf>.json (relancer = immédiat).
import { createClient } from "@supabase/supabase-js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";
import * as lib from "./lib_voitures.mjs";
import { sansAccent, codes, ecrireDate, ch } from "./lib_voitures.mjs";

const args = process.argv.slice(2);
const PDF = args.find((a) => !a.startsWith("--"));
const ECRIRE = args.includes("--ecrire");
const REMPLACER = args.includes("--remplacer");
const DEBUG = (args.find((a) => a.startsWith("--explique=")) ?? "").slice(11).toUpperCase();
if (!PDF) { console.error('Usage : node scripts/import_metelli_freins.mjs "<catalogue Metelli.pdf>" [--ecrire] [--remplacer]'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_CLE, { global: { fetch: lib.fetchAvecReprise } }); // coupure réseau : réessaie (lectures, effacements, upserts)
const DOSSIER = join(process.cwd(), "backups", "metelli");
mkdirSync(DOSSIER, { recursive: true });

const REF_DISQUE = /^23-\d{4}[A-Z]{0,2}$/;
const REF_PLAQ = /^22-\d{4}-\d[A-Z]?$/;
const REF_METELLI = /^2[23]-\d{4}(-\d)?[A-Z]{0,2}$/;

// ───────────── 1. Lecture du PDF ─────────────
// Pages voitures : en-tête « Spare Parts | METELLI ref | L/R | Dim | NOTE » ×2 (gauche = AVANT, droite = ARRIÈRE).
//   marque en haut de page ; ligne modèle (taille 15) « Sandero II 10/12-1/70 » ; ligne moteur (taille 10)
//   « 1.6 MPI 85 ( 62 kW) Eng.K7M 800, K7M 818 5/10-6/13 » ; puis une ligne par pièce (référence, date limite, cote, note).
// Pages « Adaptable to | METELLI Ref » ×3 colonnes : titre de marque en gras taille 11, puis code → réf. Metelli.
const colG = (x) => (x < 95 ? "ref" : x < 140 ? "date" : x < 165 ? "lr" : x < 222 ? "dim" : "note");
const RE_MOTEUR = /^(.*?)\s*\(\s*(\d+)\s*kW\)\s*(?:Eng\.\s*(.*?))?\s+(\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{2})\s*$/;
const RE_MODELE = /^(.*?)\s+(\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{2})\s*$/;

async function lirePdf(fichier) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(fichier)), verbosity: 0 }).promise;
  const lignes = [], paires = [], titres = new Map(), inconnus = new Map();
  let marque = null, modele = null, moteur = null, marqueCroisee = null, codePrecedent = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const its = (await page.getTextContent()).items.filter((i) => i.str?.trim())
      .map((i) => ({ x: i.transform[4], y: i.transform[5], h: i.transform[0], f: i.fontName, s: i.str.trim() }));
    page.cleanup();
    if (p % 500 === 0) process.stdout.write(`  … page ${p}/${doc.numPages}\n`);

    // Équivalences
    const enteteCroise = its.filter((i) => i.s === "Adaptable to");
    if (enteteCroise.length) {
      const yh = Math.min(...enteteCroise.map((i) => i.y));
      const corps = its.filter((i) => i.y < yh - 2 && i.y > 30);
      for (const g of [0, 1, 2]) {
        const dansG = corps.filter((i) => (i.x < 205 ? 0 : i.x < 395 ? 1 : 2) === g).sort((a, b) => b.y - a.y || a.x - b.x);
        const rangs = [];
        for (const i of dansG) { const r = rangs.find((r) => Math.abs(r.y - i.y) < 2); if (r) r.its.push(i); else rangs.push({ y: i.y, its: [i] }); }
        for (const r of rangs) {
          const titre = r.its.find((i) => i.h >= 10.6 && !REF_METELLI.test(i.s));
          if (titre) { marqueCroisee = titre.s; codePrecedent = null; titres.set(marqueCroisee, 0); }
          const ref = r.its.find((i) => REF_METELLI.test(i.s));
          const code = r.its.find((i) => i !== titre && i !== ref && !REF_METELLI.test(i.s));
          if (code) codePrecedent = code.s;
          if (ref && codePrecedent && marqueCroisee) {
            paires.push({ marque: marqueCroisee, code: codePrecedent, ref: ref.s });
            titres.set(marqueCroisee, (titres.get(marqueCroisee) ?? 0) + 1);
          }
        }
      }
      continue;
    }

    // Voitures
    if (!its.some((i) => i.s === "Spare" && i.y > 730) || !its.some((i) => i.s === "METELLI" && i.y > 730)) continue;
    // Marque = gros titre (taille 15) SANS dates, à gauche ou à droite, en haut OU au milieu de la page (« ACURA » après
    // « ABARTH ») ; modèle = gros titre AVEC ses dates (« RDX 1/12-1/70 »). Avant (17/11) : seule la marque en haut à gauche
    // était lue → Acura, Aixam… restaient sous Abarth.
    // Un titre peut être en deux morceaux sur la même ligne (« Transit » + « VI Bus (E_ _) 6/94-6/00 ») : on les recolle.
    // Marque = police du titre en haut de page (gras) ; modèle = avec ses dates (ou une autre police).
    const grandes = [];
    for (const i of its.filter((i) => i.h >= 13).sort((a, b) => b.y - a.y || a.x - b.x)) {
      const l = grandes.find((g) => Math.abs(g.y - i.y) < 2.5);
      if (l) { l.s += " " + i.s; l.polices.add(i.f); } else grandes.push({ y: i.y, s: i.s, polices: new Set([i.f]) });
    }
    const policeMarque = new Set(its.filter((i) => i.h >= 13 && i.y > 770).map((i) => i.f));
    const titresMarque = grandes.map((g) => {
      const m = g.s.match(RE_MODELE);
      if (m) return { y: g.y, type: "modele", nom: m[1].trim() };
      const estMarque = policeMarque.size ? [...g.polices].every((f) => policeMarque.has(f)) : g.s === g.s.toUpperCase();
      return { y: g.y, type: estMarque ? "marque" : "modele", nom: g.s.trim() };
    }).filter((t) => !/^\d+$/.test(t.nom));
    const corps = its.filter((i) => i.y < 730 && i.y > 30).sort((a, b) => b.y - a.y || a.x - b.x);
    const gauche = corps.filter((i) => i.x < 35);
    for (const i of gauche) i.vu = false;
    // lignes modèle / moteur
    const evts = [];
    for (let k = 0; k < gauche.length; k++) {
      const i = gauche[k];
      if (i.h >= 13) continue; // titres (marque / modèle) : lus plus haut, morceaux recollés
      if (/kW\)/.test(i.s) || /\(\s*\d+\s*kW/.test(i.s)) {
        let txt = i.s, m = txt.match(RE_MOTEUR), j = k;
        while (!m && j + 1 < gauche.length && gauche[j + 1].h < 13 && !/kW/.test(gauche[j + 1].s) && i.y - gauche[j + 1].y < 12) { j++; txt += " " + gauche[j].s; m = txt.match(RE_MOTEUR); }
        if (m) evts.push({ y: i.y, type: "moteur", label: m[1].trim(), kw: Number(m[2]), codes: (m[3] ?? "").trim().replace(/^-$/, ""), de: m[4], a: m[5] });
        else inconnus.set("moteur illisible", (inconnus.get("moteur illisible") ?? 0) + 1);
      }
    }
    // lignes de pièces : une icône (F disque, G plaquette…) à x ≈ 37
    const icones = corps.filter((i) => i.x >= 35 && i.x < 45 && i.s.length === 1);
    const tout = [...titresMarque.map((e) => ({ ...e, ordre: e.y + 0.5 })), ...evts.map((e) => ({ ...e, ordre: e.y })), ...icones.map((i) => ({ type: "piece", y: i.y, ordre: i.y }))].sort((a, b) => b.ordre - a.ordre);
    for (const e of tout) {
      if (e.type === "marque") { if (e.nom !== marque) { marque = e.nom; modele = null; moteur = null; } continue; }
      if (e.type === "modele") { modele = e.nom; moteur = null; continue; }
      if (e.type === "moteur") { moteur = e; continue; }
      const rang = corps.filter((i) => Math.abs(i.y - e.y) < 2.6 && i.x >= 45);
      for (const [cote, dx] of [["avant", 0], ["arrière", 267]]) {
        const cellules = { ref: "", date: "", lr: "", dim: "", note: "" };
        for (const i of rang) {
          // gauche (avant) : x de 45 à 300 ; droite (arrière) : la même grille décalée de 267
          if ((dx === 0) !== (i.x < 300)) continue;
          const x = i.x - dx;
          if (x < 45) continue;
          const c = colG(x);
          cellules[c] = (cellules[c] ? cellules[c] + " " : "") + i.s;
        }
        if (!cellules.ref) continue;
        if (!REF_METELLI.test(cellules.ref)) { inconnus.set(cellules.ref.replace(/\d/g, "9"), (inconnus.get(cellules.ref.replace(/\d/g, "9")) ?? 0) + 1); continue; }
        if (!marque || !modele || !moteur) { inconnus.set("pièce sans voiture", (inconnus.get("pièce sans voiture") ?? 0) + 1); continue; }
        lignes.push({ page: p, marque, modele, label: moteur.label, kw: moteur.kw, codes: moteur.codes, de: moteur.de, a: moteur.a, cote, ...cellules });
      }
    }
  }
  return { pages: doc.numPages, lignes, paires, titres: Object.fromEntries(titres), inconnus: Object.fromEntries(inconnus) };
}

// ───────────── 2. Programme : lecture (ou cache) ─────────────
const cache = join(DOSSIER, `lecture-${basename(PDF).replace(/\.pdf$/i, "")}.json`);
let L;
if (existsSync(cache) && statSync(cache).mtimeMs > statSync(PDF).mtimeMs) {
  L = JSON.parse(readFileSync(cache, "utf8"));
  console.log(`Lecture reprise du cache ${basename(cache)}`);
} else {
  console.log(`Lecture de ${basename(PDF)} (≈ 3 min)…`);
  L = await lirePdf(PDF);
  writeFileSync(cache, JSON.stringify(L));
}
console.log(`${L.pages} pages · ${L.lignes.length} lignes voiture → pièce · ${L.paires.length} équivalences lues`);
console.log("Écartés (non lus) :", L.inconnus);
const titresTries = Object.entries(L.titres).sort((a, b) => b[1] - a[1]);
console.log(`Titres de la section « Adaptable to » (${titresTries.length}) :`, titresTries.slice(0, 60).map(([t, n]) => `${t} ${n}`).join(" · "));
const parCote = {}; for (const l of L.lignes) { const k = `${REF_DISQUE.test(l.ref) ? "disque" : "plaquette"} ${l.cote}`; parCote[k] = (parCote[k] ?? 0) + 1; }
console.log("Pièces par type et côté :", parCote);
console.log("Exemples Dacia :", L.lignes.filter((l) => /DACIA/.test(l.marque) && /Sandero II/.test(l.modele)).slice(0, 6));

// ───────────── 3. Fiches Metelli ─────────────
const SYSTEMES = { Ate: "ATE", Gir: "Girling", Trw: "TRW", Knr: "Knorr", Bre: "Brembo", Bch: "Bosch", Ake: "Akebono", Sum: "Sumitomo", Mer: "Meritor",
  Man: "Mando", Bdx: "Bendix", Wab: "Wabco", "K.H.": "Kelsey-Hayes", Advics: "Advics", Per: "Perrot", Loc: "Lockheed", GM: "GM", Tokico: "Tokico",
  Citr: "Citroën", Wag: "Wagner", Hit: "Hitachi", Alc: "Alcon", Luc: "Lucas", Hal: "Haldex", Ligier: "Ligier" };
const plusFrequent = (arr) => { const m = new Map(); for (const x of arr) if (x) m.set(x, (m.get(x) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""; };
/** « Ate th 18,0 » → « système ATE · épaisseur 18 mm » ; « ø 258,0 » (+ ventilé, peint) → « Ø 258 mm · ventilé · peint » */
function cotes(ref, lignes) {
  const dim = plusFrequent(lignes.map((l) => l.dim.trim()));
  if (REF_PLAQ.test(ref)) {
    const m = dim.match(/^(.*?)\s*th\s*([\d,]+)/);
    const sys = m ? (SYSTEMES[m[1].trim()] ?? m[1].trim()) : "";
    return [sys && `système ${sys}`, m && `épaisseur ${m[2].replace(/,0$/, "")} mm`].filter(Boolean).join(" · ") || null;
  }
  const m = dim.match(/ø\s*([\d,]+)/);
  const vent = lignes.filter((l) => /Vent\.|Ventilated/.test(l.note)).length > lignes.length / 2;
  const peint = /C$/.test(ref) || lignes.some((l) => /Coated/.test(l.note));
  return [m && `Ø ${m[1].replace(/,0$/, "")} mm`, vent ? "ventilé" : "plein", peint && "peint"].filter(Boolean).join(" · ") || null;
}
const parRef = new Map();
for (const l of L.lignes) {
  if (!REF_METELLI.test(l.ref)) continue;
  if (!parRef.has(l.ref)) parRef.set(l.ref, []);
  parRef.get(l.ref).push(l);
}
const fiches = new Map();
for (const [ref, ls] of parRef) {
  const disque = REF_DISQUE.test(ref);
  fiches.set(ref, {
    reference: ref, categorie: disque ? "disque_frein" : "plaquette_frein",
    nom: disque ? "Disque de frein Metelli" : "Plaquettes de frein Metelli", nomAr: disque ? "قرص الفرامل Metelli" : "وسادات الفرامل Metelli",
    dimensions: cotes(ref, ls),
  });
}
const nbCat = {}; for (const f of fiches.values()) nbCat[f.categorie] = (nbCat[f.categorie] ?? 0) + 1;
console.log(`${fiches.size} références Metelli :`, nbCat, "· ex.", [...fiches.values()].slice(0, 2).map((f) => `${f.reference} = ${f.dimensions}`).join(" ; "));

// Équivalences gardées (demande de l'utilisateur : TRW, Bosch ; + WVA = numéro européen des plaquettes, pour la recherche)
const GARDER = { TRW: "TRW", BOSCH: "Bosch", WVA: "WVA" };
const equivs = new Map(); // ref Metelli → [{ marque, reference }]
for (const p of L.paires) {
  const marque = GARDER[p.marque];
  if (!marque || !fiches.has(p.ref)) continue;
  if (!equivs.has(p.ref)) equivs.set(p.ref, []);
  const liste = equivs.get(p.ref);
  if (!liste.some((e) => e.marque === marque && e.reference === p.code)) liste.push({ marque, reference: p.code });
}
const nbEq = {}; for (const l of equivs.values()) for (const e of l) nbEq[e.marque] = (nbEq[e.marque] ?? 0) + 1;
console.log("Équivalences à ajouter :", nbEq, `(sur ${equivs.size} fiches)`);

// ───────────── 4. Voitures : Metelli ↔ Filtron ─────────────
/** « 5/10 » → 201005 ; « 1/70 » = pas de date (fin ouverte) */
const dateMetelli = (s) => { const m = (s ?? "").match(/^(\d{1,2})\/(\d{2})$/); if (!m) return null; const a = Number(m[2]); if (a === 70 && Number(m[1]) === 1) return null; return (a >= 50 ? 1900 + a : 2000 + a) * 100 + Number(m[1]); };
const dateTexte = (s) => { const n = dateMetelli(s.replace(/^(\d{1,2})\/(\d{2})$/, "$1/$2")); return n ? ecrireDate(n) : s; };
// En-tête Metelli → marque Filtron. Utilitaires (LCV, HCV) = la marque normale (Master chez RENAULT, Jumper chez CITROEN) ;
// camions et bus = la marque Filtron des camions (vérifié en base le 17/11/2026).
const CAMIONS = {
  "VOLVO": "VOLVO CARS", "VOLVO TRUCK": "VOLVO TRUCKS", "VOLVO BUS": "VOLVO BUS", "RENAULT TRUCK": "RENAULT TRUCKS (RVI)",
  "MAN TRUCK": "MAN TRUCK", "MAN HCV": "MAN TRUCK", "MAN BUS": "MAN BUS (NEOMAN)", "DAF TRUCK": "DAF TRUCKS", "SCANIA TRUCK": "SCANIA",
  "IVECO TRUCK": "IVECO", "IVECO HCV": "IVECO", "IVECO BUS": "IVECO BUS", "MERCEDES BENZ TRUCK": "MERCEDES-BENZ", "MERCEDES BENZ HCV": "MERCEDES-BENZ",
  "MERCEDES BENZ BUS": "MERCEDES-BENZ", "NISSAN TRUCK": "NISSAN DIESEL / UD TRUCKS", "MITSUBISHI TRUCK": "MITSUBISHI FUSO (DAIMLER)",
  "ISUZU TRUCK": "ISUZU", "FORD TRUCK": "FORD",
};
const marqueCatalogue = (m) => (CAMIONS[m.trim()] ? m.trim() : m.replace(/\s+(LCV|HCV|TRUCK|BUS|\(AXLE\)|AXLE)$/i, "").trim());
const NOTES = [
  [/\bCoated\b,?/g, ""], [/\bVent(?:\.|ilated\b),?/g, ""], [/Made in [A-Z][a-z]+/g, ""],
  [/\+\/-ABS/g, "avec ou sans ABS"], [/\+ABS/g, "avec ABS"], [/-ABS/g, "sans ABS"],
  [/\+EPB/g, "avec frein de parking électrique"], [/-EPB/g, "sans frein de parking électrique"], [/\+ESP/g, "avec ESP"],
  [/(\d+(?:\/\d+)?)Inch Wheels/g, "jantes $1 pouces"], [/Only Chinese Market/g, "marché chinois seulement"],
  [/\bA\/T\b/g, "boîte auto"], [/\b4WD\b/g, "4 roues motrices"], [/\+Bearing/g, "avec roulement"], [/\bCh\./g, "châssis"],
];
function remarque(l) {
  const morceaux = [l.cote];
  if (l.lr) morceaux[0] += l.lr === "L" ? " gauche" : l.lr === "R" ? " droite" : "";
  const d = l.date.trim();
  let m;
  if ((m = d.match(/^(\d{1,2}\/\d{2})-(\d{1,2}\/\d{2})$/))) morceaux.push(`de ${dateTexte(m[1])} à ${dateTexte(m[2])}`);
  else if ((m = d.match(/^-(\d{1,2}\/\d{2})-?$/))) morceaux.push(`jusqu'à ${dateTexte(m[1])}`);
  else if ((m = d.match(/^(\d{1,2}\/\d{2})-$/))) morceaux.push(`à partir de ${dateTexte(m[1])}`);
  else if (d && d !== "-") morceaux.push(d);
  let n = l.note;
  for (const [re, par] of NOTES) n = n.replace(re, par);
  n = n.replace(/\s*,\s*,/g, ",").replace(/^[\s,]+|[\s,]+$/g, "").replace(/\s+/g, " ");
  if (n) morceaux.push(n);
  return morceaux.join(" · ");
}

const marquesCat = [...new Set(L.lignes.map((l) => marqueCatalogue(l.marque)))];
const filtron = new Map();
for (const mc of marquesCat) {
  const mf = CAMIONS[mc] ?? await lib.marqueFiltron(sb, mc);
  const autres = lib.AUSSI[sansAccent(mc)] ?? [];
  const voitures = (await lib.voituresFiltron(sb, mf)).voitures;
  for (const a of autres) voitures.push(...(await lib.voituresFiltron(sb, a)).voitures);
  filtron.set(mc, { marque: mf, voitures });
}
console.log(`${marquesCat.length} marques de voitures dans le catalogue, comparées à ${[...filtron.values()].reduce((s, x) => s + x.voitures.length, 0)} versions Filtron`);

const apps = new Map();
let exactes = 0, famille = 0, metelli = 0, vus = 0, sansCode = 0;
const nonRelies = new Map(), reliesParMarque = new Map();
function ajouter(ref, c, rem) {
  const k = [ref, c.marque, c.modele, c.moteur ?? "", c.code_moteur ?? "", c.annee_debut ?? ""].join("|");
  const ex = apps.get(k);
  if (ex) { if (rem && !ex.remarques.includes(rem)) ex.remarques.push(rem); return; }
  apps.set(k, { ref, ...c, remarques: rem ? [rem] : [] });
}
for (const l of L.lignes) {
  if (!fiches.has(l.ref)) continue;
  const mc = marqueCatalogue(l.marque);
  const { marque: mf, voitures } = filtron.get(mc);
  const d = dateMetelli(l.de) ?? 0, f = dateMetelli(l.a) ?? 999912, cv = ch(l.kw);
  const cm = codes(l.codes.replace(/\(\s*\d{2}\.\d{2}\s*-[^)]*\)/g, "")); // « D7F 730 (01.96-.) » : date retirée
  const { trouvees, famille: parFamille } = lib.memesVoitures(voitures, { modele: l.modele, codesMoteur: cm, cv, d, f });
  const rem = [parFamille ? `moteur ${l.codes}` : "", remarque(l)].filter(Boolean).join(" · ");
  if (trouvees.length) {
    if (parFamille) famille++; else exactes++;
    for (const v of trouvees) ajouter(l.ref, { marque: v.marque, modele: v.modele, moteur: v.moteur, code_moteur: v.code_moteur, annee_debut: v.annee_debut, annee_fin: v.annee_fin, puissance: v.puissance }, rem);
  } else {
    metelli++; nonRelies.set(l.marque, (nonRelies.get(l.marque) ?? 0) + 1); if (!l.codes) sansCode++;
    if (DEBUG && sansAccent(l.modele).includes(DEBUG) && vus++ < 10) {
      const proches = voitures.filter((v) => v.cles.some((c) => lib.clesModele(l.modele).includes(c)) && v.codes.some((c) => cm.some((g) => g.slice(0, 3) === c.slice(0, 3))));
      console.log(`\n[non reliée] ${l.marque} · ${l.modele} · ${l.label} · ${l.codes} (${cm.join(",")}) · ${l.kw} kW = ${cv} ch · ${l.de}→${l.a}`);
      for (const v of proches.slice(0, 5)) console.log(`   Filtron : ${v.modele} · ${v.moteur} · ${v.code_moteur} · ${v.puissance} ch · ${v.annee_debut}→${v.annee_fin}`);
    }
    ajouter(l.ref, { marque: mf, modele: l.modele, moteur: l.label, code_moteur: l.codes || null, annee_debut: ecrireDate(d === 0 ? null : d), annee_fin: f === 999912 ? "" : ecrireDate(f), puissance: String(cv) }, rem);
  }
}
const total = exactes + famille + metelli;
console.log(`Non reliées : ${sansCode} lignes sans code moteur (« Eng.- ») ; par marque :`, [...nonRelies.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([m, n]) => `${m} ${n}`).join(" · "));
console.log(`Voitures : ${exactes} lignes reliées à Filtron (code exact), ${famille} par la famille du moteur, ${metelli} écrites avec le nom Metelli (${Math.round((exactes + famille) * 100 / total)} % reliées)`);
console.log(`→ ${apps.size} liens pièce ↔ voiture à écrire`);
const exLogan = [...apps.values()].filter((a) => /Logan/i.test(a.modele) && /K9K 796/.test(a.code_moteur ?? "")).slice(0, 8);
console.log("Exemples Logan K9K 796 :", exLogan.map((a) => `${a.ref} → ${a.modele} · ${a.moteur} · ${a.puissance} ch · ${a.remarques.join(" / ")}`));

if (!ECRIRE) { console.log("\nEssai à blanc : rien n'est écrit. Ajouter --ecrire pour enregistrer."); process.exit(0); }

// ───────────── 5. Écriture ─────────────
const refs = [...fiches.keys()];
const existantes = new Map();
for (let i = 0; i < refs.length; i += 100) {
  const { data, error } = await sb.from("products").select("id, reference, marque").in("reference", refs.slice(i, i + 100));
  if (error) throw error;
  for (const p of data) existantes.set(p.reference, p);
}
const creees = [], gardees = [], conflits = [];
const nouvelles = [];
for (const f of fiches.values()) {
  const p = existantes.get(f.reference);
  if (p) { if (sansAccent(p.marque) === "METELLI") { f.id = p.id; gardees.push(f.reference); } else conflits.push(`${f.reference} (déjà « ${p.marque} »)`); continue; }
  nouvelles.push(f);
}
for (let i = 0; i < nouvelles.length; i += 200) {
  const lot = nouvelles.slice(i, i + 200);
  const { data, error } = await sb.from("products").insert(lot.map((f) => ({
    reference: f.reference, marque: "Metelli", categorie: f.categorie, nom_fr: f.nom, nom_ar: f.nomAr, dimensions: f.dimensions,
    prix_achat: 0, prix_vente: 0, stock: 0, stock_min: 1, notes: `Catalogue officiel Metelli (PDF « ${basename(PDF)} »)`,
  }))).select("id, reference");
  if (error) throw new Error(`fiches : ${error.message}`);
  for (const p of data) { fiches.get(p.reference).id = p.id; creees.push({ id: p.id, reference: p.reference }); }
}
console.log(`Fiches : ${creees.length} créées, ${gardees.length} déjà là, ${conflits.length} laissées (autre marque) ${conflits.slice(0, 5).join(", ")}`);

// Équivalences (sans doublon)
const ids = [...fiches.values()].filter((f) => f.id).map((f) => f.id);
const dejaEq = new Set();
for (let i = 0; i < ids.length; i += 150) {
  const { data, error } = await sb.from("equivalences").select("product_id, marque, reference").in("product_id", ids.slice(i, i + 150));
  if (error) throw error;
  for (const e of data) dejaEq.add(`${e.product_id}|${e.marque}|${e.reference}`);
}
const eqAEcrire = [];
for (const [ref, liste] of equivs) {
  const id = fiches.get(ref)?.id;
  if (!id) continue;
  for (const e of liste) if (!dejaEq.has(`${id}|${e.marque}|${e.reference}`)) eqAEcrire.push({ product_id: id, marque: e.marque, reference: e.reference, prix: null, prix_achat: null, stock: 0 });
}
for (let i = 0; i < eqAEcrire.length; i += 500) {
  // upsert « ignorer les doublons » : la liste dejaEq (par paquets limités à 1000 lignes) peut être incomplète
  const { error } = await sb.from("equivalences").upsert(eqAEcrire.slice(i, i + 500), { onConflict: "product_id,marque,reference", ignoreDuplicates: true });
  if (error) throw new Error(`équivalences : ${error.message}`);
}
console.log(`Équivalences : ${eqAEcrire.length} ajoutées`);

// Voitures
if (REMPLACER) {
  let effaces = 0;
  for (let i = 0; i < ids.length; i += 150) {
    const { error, count } = await sb.from("applications").delete({ count: "exact" }).in("product_id", ids.slice(i, i + 150));
    if (error) throw error;
    effaces += count ?? 0;
  }
  console.log(`--remplacer : ${effaces} anciens liens Metelli effacés`);
}
const aEcrire = [...apps.values()].filter((a) => fiches.get(a.ref)?.id).map((a) => ({
  product_id: fiches.get(a.ref).id, marque: a.marque, modele: a.modele, moteur: a.moteur, code_moteur: a.code_moteur,
  annee_debut: a.annee_debut, annee_fin: a.annee_fin, puissance: a.puissance, remarque: a.remarques.join(" — ou — ") || null,
}));
let ecrites = 0;
for (let i = 0; i < aEcrire.length; i += 500) {
  const { error, count } = await sb.from("applications").upsert(aEcrire.slice(i, i + 500), {
    onConflict: "product_id,marque,modele,moteur,code_moteur,annee_debut", ignoreDuplicates: true, count: "exact",
  });
  if (error) throw new Error(`voitures : ${error.message}`);
  ecrites += count ?? 0;
  if (i % 10000 === 0) process.stdout.write(`  … ${i}/${aEcrire.length}\n`);
}
console.log(`Voitures : ${ecrites} liens écrits (sur ${aEcrire.length})`);
const trace = join(DOSSIER, `${new Date().toISOString().slice(0, 10)}-${basename(PDF).replace(/\.pdf$/i, "")}.json`);
writeFileSync(trace, JSON.stringify({ pdf: basename(PDF), creees, gardees, conflits, equivalences: eqAEcrire.length, liens: aEcrire.length, ecrites }, null, 1));
console.log(`Trace : ${trace}`);
