// Import du catalogue PDF OFFICIEL Gates « Applications véhicules particuliers » (téléchargé par l'utilisateur
// sur navigates.gates.com, une marque de voiture par PDF) → fiches Gates (stock 0) + voitures compatibles.
// BIBLE §8.34. Aucune référence inventée : tout vient du PDF ; une ligne mal lue est écartée, pas devinée.
//
//   node scripts/import_gates_pdf.mjs "C:\Users\deux\Desktop\gates distribution renault.pdf"            (essai à blanc)
//   node scripts/import_gates_pdf.mjs "C:\Users\deux\Desktop\gates distribution renault.pdf" --ecrire   (écrit)
//
// Voitures : si la voiture Gates est la même qu'une voiture Filtron déjà en base (même modèle, même code moteur,
// même puissance, années qui se recouvrent), la pièce est rangée SUR la voiture Filtron (même fiche que les filtres).
// Sinon elle est écrite avec le nom Gates (« Logan (LS_) »). Les remarques de montage (« à partir de 09/2010 »,
// « avec climatisation », « moteur K9K 608 »…) vont dans applications.remarque (supabase/applications_remarque.sql).
// Reprenable : une fiche qui existe est réutilisée, une voiture déjà reliée n'est pas recopiée.
import { createClient } from "@supabase/supabase-js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const args = process.argv.slice(2);
const PDF = args.find((a) => !a.startsWith("--"));
const ECRIRE = args.includes("--ecrire");
const REMPLACER = args.includes("--remplacer"); // avec --ecrire : efface d'abord les liens Gates de la marque
const DEBUG = (args.find((a) => a.startsWith("--explique=")) ?? "").slice(11).toUpperCase(); // ex. --explique=CLIO
let debugVus = 0;
if (!PDF) { console.error('Usage : node scripts/import_gates_pdf.mjs "<catalogue Gates.pdf>" [--ecrire]'); process.exit(1); }
const sb = createClient(SUPABASE_URL, SUPABASE_CLE);

// ───────────── 1. Lecture du PDF (position de chaque mot) ─────────────
async function lireMots(fichier) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(fichier)), verbosity: 0 }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    pages.push(tc.items.filter((it) => it.str && it.str.trim()).map((it) => ({ p, x: it.transform[4], y: it.transform[5], w: it.width, s: it.str })));
    page.cleanup();
  }
  return { pages, edition: null };
}

// Colonnes du tableau Gates (x de gauche, identiques sur toutes les pages)
const col = (x) =>
  x < 90 ? "modele" : x < 132 ? "moteur" : x < 160 ? "cyl" : x < 190 ? "kw" : x < 232 ? "de" :
  x < 270 ? "a" : x < 335 ? "groupe" : x < 400 ? "unites" : x < 505 ? "comm" : "article";
const TITRE = /^([A-ZÀ-Ý0-9][A-ZÀ-Ý0-9 .'&+\/-]*?) - (.+)$/;
const nettoie = (s) => s.replace(/\s*\(continued\)\s*/gi, " ").replace(/™/g, "").replace(/\s+/g, " ").trim();

function lireTableau(pages) {
  const lignes = [];
  let titre = null; // continue d'une page à l'autre
  for (const its of pages) {
    if (!its.some((i) => i.s === "Article" && i.y > 740)) continue; // sommaire, couverture
    const corps = its.filter((i) => i.y > 40 && i.y < 740).map((i) => ({ ...i, c: col(i.x) }));
    const titres = corps.filter((i) => i.c === "modele" && TITRE.test(i.s.trim()) &&
      !corps.some((j) => j !== i && Math.abs(j.y - i.y) < 3 && j.c !== "modele"));
    const ancres = [];
    for (const i of corps.filter((i) => ["cyl", "kw", "de", "a"].includes(i.c))) {
      if (!ancres.some((a) => Math.abs(a - i.y) < 2.5)) ancres.push(i.y);
    }
    const evts = [...titres.map((t) => ({ y: t.y, t })), ...ancres.map((y) => ({ y }))].sort((a, b) => b.y - a.y);
    for (let k = 0; k < evts.length; k++) {
      const e = evts[k];
      if (e.t) { const m = nettoie(e.t.s).match(TITRE); titre = { marque: m[1].trim(), modele: m[2].trim() }; continue; }
      const bas = k + 1 < evts.length ? evts[k + 1].y + 4 : -1;
      const zone = corps.filter((i) => i.y <= e.y + 4 && i.y > bas && !titres.includes(i));
      const txt = (c) => nettoie(zone.filter((i) => i.c === c).sort((a, b) => b.y - a.y || a.x - b.x).map((i) => i.s).join(" "));
      const surLigne = (c) => nettoie(zone.filter((i) => i.c === c && Math.abs(i.y - e.y) < 2.5).map((i) => i.s).join(" "));
      const v = { page: its[0]?.p, ...titre, version: txt("modele"), moteurs: txt("moteur"), cyl: surLigne("cyl"), kw: surLigne("kw"), de: surLigne("de"), a: surLigne("a") };
      // Pièces : une référence = une ligne de groupe ; une référence trop longue continue sur la ligne du dessous
      const grp = zone.filter((i) => i.c === "groupe");
      const debutGroupe = (y) => grp.some((g) => Math.abs(g.y - y) < 1.5) && !grp.some((g) => g.y - y > 6 && g.y - y < 12);
      const refs = [];
      for (const a of zone.filter((i) => i.c === "article" && !/^\(continued\)$/i.test(i.s.trim())).sort((a, b) => b.y - a.y)) {
        const prec = refs[refs.length - 1];
        if (prec && prec.yDernier - a.y < 10.5 && !debutGroupe(a.y) && prec.droite >= 545) {
          prec.ref += a.s.trim(); prec.yDernier = a.y; prec.droite = a.x + a.w;
        } else refs.push({ ref: a.s.trim(), y: a.y, yDernier: a.y, droite: a.x + a.w });
      }
      for (let r = 0; r < refs.length; r++) {
        const haut = refs[r].y + 1.5, basR = r + 1 < refs.length ? refs[r + 1].y + 1.5 : -Infinity;
        const dans = (c) => nettoie(zone.filter((i) => i.c === c && i.y <= haut && i.y > basR).sort((a, b) => b.y - a.y || a.x - b.x).map((i) => i.s).join(" "));
        lignes.push({ ...v, groupe: dans("groupe"), unites: dans("unites"), comm: dans("comm"), article: refs[r].ref.replace(/\s+/g, "") });
      }
    }
  }
  return lignes;
}

// ───────────── 2. Types de pièces Gates → catégories FiltroPro ─────────────
// [motif du groupe Gates, motif obligatoire de la référence, catégorie, nom FR, nom AR]
const TYPES = [
  [/^PowerGrip Kit \+ MV Kit$/, /^KP\d{5}XSPK(-\d)?$/, "kit_distribution_pompe", "Kit de distribution + pompe à eau + kit courroie d'accessoire", "طقم التوزيع مع مضخة الماء وطقم حزام الملحقات"],
  [/^Kit PowerGrip \+ pompe à eau \+ thermostat$/, /^KP\d?TH\d{5}XS(-\d)?$/, "kit_distribution_pompe", "Kit de distribution + pompe à eau + thermostat", "طقم التوزيع مع مضخة الماء والترموستات"],
  [/^Kit PowerGrip \+ pompe à eau$/, /^KP\d{5}XS(-\d)?$/, "kit_distribution_pompe", "Kit de distribution + pompe à eau", "طقم التوزيع مع مضخة الماء"],
  [/^Kit PowerGrip$/, /^K0\d{5}(XS)?$/, "kit_distribution", "Kit de distribution", "طقم التوزيع"],
  [/^PowerGrip Kit \+ Chain Kit$/, /^KP\dCHK\d{4}XS$/, "kit_distribution", "Kit de distribution + kit chaîne", "طقم التوزيع مع طقم السلسلة"],
  [/^(Courroie PowerGrip|RoadMax Value Line|RPM Racing Timing Belt)$/, /^(\d{4}(XS|RM)?|T\d{3}RB)$/, "courroie_distribution", "Courroie de distribution", "حزام التوزيع"],
  [/^Poulie du tendeur PowerGrip$/, /^T\d{5}$/, "galet_distribution", "Galet tendeur de distribution", "بكرة الشد للتوزيع"],
  [/^Galet enrouleur PowerGrip$/, /^T\d{5}$/, "galet_distribution", "Galet enrouleur de distribution", "بكرة التوجيه للتوزيع"],
  [/^Amortisseur de vibrations PowerGrip$/, /^T\d{5}$/, "galet_distribution", "Amortisseur de vibrations de distribution", "مخمد اهتزازات التوزيع"],
  [/^Bras de tendeur PowerGrip$/, /^T\d{5}$/, "galet_distribution", "Bras de tendeur de distribution", "ذراع الشد للتوزيع"],
  [/^Kit de chaîne de distribution$/, /^CHK\d{4}(M|MA|MB)?$/, "chaine_distribution", "Kit chaîne de distribution", "طقم سلسلة التوزيع"],
];
const IGNORES = [/^Solénoïde de soupape de commande$/]; // pas de la distribution (électrovanne de calage)

// ───────────── 3. Remarques de montage en français clair ─────────────
function remarque(comm) {
  let t = comm
    .replace(/Numéro d.article de l.outil spécialisé recommandé:\s*\S+/g, " ")
    .replace(/Article complémentaire \/ Info complémentaire \d:\s*/g, " ")
    .replace(/Équipement véhicule:\s*/g, " ")
    .replace(/Type de véhicule:\s*/g, " ")
    .replace(/numéro TECDOC du moteur:\s*/g, " moteur ")
    .replace(/Code moteur:\s*/g, " code moteur ")
    .replace(/Année à partir de:\s*/g, " à partir de ")
    .replace(/Année jusqu'à:\s*/g, " jusqu'à ")
    .replace(/Commande de poulie de tension:\s*manuel/g, " tendeur manuel")
    .replace(/Nombre de pièces nécessaires:\s*/g, " quantité : ")
    .replace(/pour numéro OE:\s*HEIGHT\s*(\d+)\s*MM/g, " hauteur $1 mm")
    .replace(/pour numéro OE:\s*(BELT\s*)?/g, " réf. d'origine ")
    .replace(/Séparation des bloques:/g, " | ")
    .replace(/\s+/g, " ").trim();
  // « moteur K9K 608 moteur K9K 628 » → « moteur K9K 608, K9K 628 »
  t = t.replace(/moteur ([A-Z0-9]{3} ?\d{3})((?: moteur [A-Z0-9]{3} ?\d{3})+)/g, (m, a, b) => `moteur ${[a, ...b.trim().split(/ ?moteur /).filter(Boolean)].join(", ")}`);
  t = t.replace(/^\|\s*|\s*\|$/g, "").replace(/\s*\|\s*/g, " — ou — ").trim();
  return t;
}
const oeDe = (comm) => [...comm.matchAll(/pour numéro OE:\s*(?:BELT\s*)?([0-9][0-9A-Z]{7,}|[0-9A-Z]{3,}[0-9][0-9A-Z]{4,})/g)].map((m) => m[1]).filter((x) => /\d{4}/.test(x) && !/^HEIGHT/.test(x));

// ───────────── 4. Voitures : Gates ↔ Filtron ─────────────
const sansAccent = (s) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
const codeNorm = (s) => sansAccent(s).replace(/[^A-Z0-9]/g, "");
/** Codes moteur écrits de toutes les façons (Filtron comme Gates) :
 *  « K9K 790/792 » → K9K790, K9K792 · « DV4TD/TED/TED4, DV4C » → DV4TD, DV4TED, DV4TED4, DV4C
 *  « HFZ / HFX (TU1JP) » → HFZ, HFX, TU1JP · « RHY (DW10TD) » → RHY, DW10TD · « K4M » → K4M.
 *  « CJAA, CFCA » (VW) → CJAA, CFCA · « OM 607.951 (K9K) » → OM607951, K9K.
 *  Suffixe (jamais gardé seul) : que des chiffres (« 792 », « 632 ») ou, après « / », un morceau court derrière
 *  une famille PSA/Renault qui contient un chiffre (« DV4TD/TED » → DV4TED). Entre parenthèses = toujours un code complet. */
function codes(s) {
  const out = new Set();
  let base = "";
  const txt = (s ?? "").replace(/\(([^)]*)\)/g, (m, x) => `,¤${x.split(/[,;\/]+/).join(",¤")},`);
  let sep = ",";
  for (const p of txt.split(/([,;\/])/)) {
    if (p === "," || p === ";" || p === "/") { sep = p === "/" ? "/" : ","; continue; }
    const entier = p.includes("¤");
    const n = codeNorm(p.replace(/¤/g, ""));
    if (!n) continue;
    const suffixe = !entier && base && !n.startsWith(base) &&
      (/^\d{1,4}$/.test(n) || (sep === "/" && n.length <= 4 && /\d/.test(base)));
    if (suffixe) { out.add(base + n); continue; }
    out.add(n);
    if (!entier) base = n.length >= 4 ? n.slice(0, 3) : "";
  }
  return [...out];
}
/** Clé du nom de modèle : 1er mot (2 si « GRAND »), pour chaque nom séparé par « / ».
 *  Mercedes : « CLASSE A », « A-Class », « A-Klasse » → « A ». */
const clesModele = (nom) => sansAccent(nom)
  .replace(/\bCLASSE\s+([A-Z]+)\b/g, "$1").replace(/\b([A-Z]+)-(CLASS|KLASSE)\b/g, "$1")
  .split("/").map((a) => {
  const mots = a.split(/[^A-Z0-9]+/).filter(Boolean);
  return mots[0] === "GRAND" ? mots.slice(0, 2).join(" ") : mots[0];
}).filter(Boolean);
const nomFiltron = (modele) => { const i = modele.lastIndexOf(" | "); return i > 0 ? modele.slice(0, i) : modele; };
/** « 02/08 » → 200802 ; « on » ou vide → null */
const dateGates = (s) => { const m = (s ?? "").match(/^(\d{2})\/(\d{2})$/); if (!m) return null; const a = Number(m[2]); return (a >= 50 ? 1900 + a : 2000 + a) * 100 + Number(m[1]); };
const dateFiltron = (s) => { const m = (s ?? "").match(/(\d{1,2})\s*[/.-]\s*(\d{4})/); return m ? Number(m[2]) * 100 + Number(m[1]) : null; };
const ecrireDate = (n) => (n ? `${String(n % 100).padStart(2, "0")}/${Math.floor(n / 100)}` : "");
const ch = (kw) => Math.round(Number(kw) * 1.35962);
const titreCase = (s) => s.toLowerCase().replace(/(^|[\s/(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

// Seulement les voitures des filtres (pas celles déjà écrites par un import Gates : un réimport ne se compare pas à lui-même)
async function voituresFiltron(marque) {
  const base = () => sb.from("applications").select("marque, modele, moteur, code_moteur, annee_debut, annee_fin, puissance, products!inner(marque)", { count: "exact" })
    .eq("marque", marque).neq("products.marque", "Gates");
  const { count, error } = await base().range(0, 0);
  if (error) throw error;
  const pages = await Promise.all(Array.from({ length: Math.ceil((count ?? 0) / 1000) }, (_, i) =>
    base().range(i * 1000, i * 1000 + 999)));
  const vus = new Map();
  for (const p of pages) {
    if (p.error) throw p.error;
    for (const r of p.data) {
      const k = [r.modele, r.moteur, r.code_moteur, r.annee_debut, r.annee_fin, r.puissance].join("|");
      if (!vus.has(k)) vus.set(k, { ...r, cles: clesModele(nomFiltron(r.modele)), codes: codes(r.code_moteur), d: dateFiltron(r.annee_debut) ?? 0, f: dateFiltron(r.annee_fin) ?? 999912 });
    }
  }
  return { lignes: count ?? 0, voitures: [...vus.values()] };
}

/** Marque Filtron principale pour une marque Gates (« DACIA » → « DACIA (RENAULT GROUP) ») */
const ALIAS = { VOLKSWAGEN: "VW (VOLKSWAGEN)", VW: "VW (VOLKSWAGEN)", CITROEN: "CITROEN", DACIA: "DACIA (RENAULT GROUP)", KIA: "KIA MOTORS", MERCEDES: "MERCEDES-BENZ", "MERCEDES-BENZ": "MERCEDES-BENZ" };
async function marqueFiltron(marqueGates) {
  const alias = ALIAS[sansAccent(marqueGates)];
  if (alias) {
    const { count } = await sb.from("applications").select("id", { count: "exact", head: true }).eq("marque", alias);
    if (count) return alias;
  }
  const motif = `${sansAccent(marqueGates).replace(/[^A-Z0-9]/g, "_")}%`;
  const { data, error } = await sb.from("applications").select("marque").ilike("marque", motif).limit(1000);
  if (error) throw error;
  const n = new Map();
  for (const r of data) n.set(r.marque, (n.get(r.marque) ?? 0) + 1);
  const exacte = [...n.keys()].find((m) => sansAccent(m) === sansAccent(marqueGates));
  return exacte ?? [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? marqueGates;
}

// ───────────── 5. Programme ─────────────
console.log(`Lecture de ${basename(PDF)}…`);
const { pages } = await lireMots(PDF);
const brut = lireTableau(pages);
const edition = (pages[0] ?? []).map((i) => i.s.trim()).find((s) => /^\d{1,2} [A-Z]{3} \d{4}$/.test(s)) ?? "?";
console.log(`${pages.length} pages · édition ${edition} · ${brut.length} lignes voiture → pièce`);

// Une référence Gates : lettres/chiffres (tiret permis), au moins un chiffre — ex. K015578XS, KP25578XSPK-2, T360HOB, CHK1049
const REF_GATES = /^(?=.*\d)[A-Z0-9][A-Z0-9-]{2,19}$/;
const ecartees = [];
const inhabituelles = new Map();
const lignes = [];
for (const l of brut) {
  if (IGNORES.some((r) => r.test(l.groupe))) continue;
  const t = TYPES.find(([g]) => g.test(l.groupe));
  if (!t || !REF_GATES.test(l.article) || !l.marque || !l.moteurs || !l.kw || !dateGates(l.de)) { ecartees.push(l); continue; }
  if (!t[1].test(l.article)) inhabituelles.set(`${l.groupe} ⇒ ${l.article}`, (inhabituelles.get(`${l.groupe} ⇒ ${l.article}`) ?? 0) + 1);
  lignes.push({ ...l, categorie: t[2], nom: t[3], nomAr: t[4] });
}
console.log(`${lignes.length} lignes gardées · ${ecartees.length} écartées (mal lues ou type inconnu)`);
const resume = new Map();
for (const e of ecartees) { const k = `${e.groupe || "(sans type)"} ⇒ ${e.article.replace(/\d/g, "9")}${e.moteurs && e.kw && dateGates(e.de) ? "" : " (voiture incomplète)"}`; resume.set(k, (resume.get(k) ?? 0) + 1); }
for (const [k, n] of [...resume.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  écartées ${n} × ${k}`);
if (inhabituelles.size) console.log(`Références de forme inhabituelle (gardées) : ${[...inhabituelles.keys()].map((k) => k.split(" ⇒ ")[1]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 25).join(", ")}`);

// Une fiche par référence (le type le plus fréquent si une référence apparaît sous deux noms)
const fiches = new Map();
for (const l of lignes) {
  let f = fiches.get(l.article);
  if (!f) { f = { reference: l.article, types: new Map(), oe: new Set() }; fiches.set(l.article, f); }
  const k = `${l.categorie}|${l.nom}|${l.nomAr}`;
  f.types.set(k, (f.types.get(k) ?? 0) + 1);
  for (const o of oeDe(l.comm)) f.oe.add(o);
}
for (const f of fiches.values()) {
  const [categorie, nom, nomAr] = [...f.types.entries()].sort((a, b) => b[1] - a[1])[0][0].split("|");
  Object.assign(f, { categorie, nom, nomAr });
}
const parCat = {};
for (const f of fiches.values()) parCat[f.categorie] = (parCat[f.categorie] ?? 0) + 1;
console.log(`${fiches.size} références Gates :`, parCat);

// Voitures
const marquesGates = [...new Set(lignes.map((l) => l.marque))];
const filtron = new Map();
for (const mg of marquesGates) {
  const mf = await marqueFiltron(mg);
  const { lignes: n, voitures } = await voituresFiltron(mf);
  filtron.set(mg, { marque: mf, voitures });
  console.log(`Marque ${mg} → Filtron « ${mf} » : ${voitures.length} versions (${n} lignes)`);
}

const apps = new Map(); // clé unique de la base → ligne
let exactes = 0, famille = 0, gates = 0;
const nonReliees = new Map();
for (const l of lignes) {
  const { marque: mf, voitures } = filtron.get(l.marque);
  const cg = codes(l.moteurs), cv = ch(l.kw), d = dateGates(l.de), f = dateGates(l.a) ?? 999912;
  const cles = clesModele(l.modele);
  const memes = (v) => v.cles.some((c) => cles.includes(c)) && Math.abs(Number(v.puissance) - cv) <= 2 && v.d <= f && d <= v.f;
  let trouvees = voitures.filter((v) => memes(v) && v.codes.some((c) => cg.includes(c)));
  let precision = "";
  if (trouvees.length) exactes++;
  else {
    // Filtron n'a que la famille du moteur (« K9K ») : on relie, en écrivant le code exact Gates dans la remarque
    // (« K9K » ou Mercedes « M 266 », « OM 640 » : le code Gates commence par la famille Filtron, + 1 à 4 caractères)
    trouvees = voitures.filter((v) => memes(v) && cg.some((c) => v.codes.some((b) => b.length >= 3 && c.length > b.length && c.length - b.length <= 4 && c.startsWith(b))));
    if (trouvees.length) { famille++; precision = `moteur ${l.moteurs}`; }
  }
  const rem = [precision, remarque(l.comm)].filter(Boolean).join(" · ");
  const cibles = trouvees.length ? trouvees.map((v) => ({ marque: mf, modele: v.modele, moteur: v.moteur, code_moteur: v.code_moteur, annee_debut: v.annee_debut, annee_fin: v.annee_fin, puissance: v.puissance })) : null;
  if (!cibles) {
    gates++;
    if (DEBUG && sansAccent(l.modele).includes(DEBUG) && debugVus++ < 12) {
      const proches = voitures.filter((v) => v.cles.some((c) => cles.includes(c)) && v.codes.some((c) => cg.some((g) => g.slice(0, 3) === c.slice(0, 3))));
      console.log(`\n[non reliée] ${l.modele} · ${l.version} · ${l.moteurs} (${cg.join(",")}) · ${l.kw} kW = ${cv} ch · ${l.de}→${l.a}`);
      for (const v of proches.slice(0, 6)) console.log(`   Filtron : ${v.modele} · ${v.moteur} · ${v.code_moteur} (${v.codes.join(",")}) · ${v.puissance} ch · ${v.annee_debut}→${v.annee_fin}`);
      if (!proches.length) console.log("   (aucune voiture Filtron de ce modèle avec cette famille de moteur)");
    }
    // « B/C57_,5/357 _ Berline à hayon 1.9 D » → codes du modèle « B/C57_,5/357 », moteur « 1.9 D »
    const mots = l.version.split(" ").filter(Boolean);
    const codesModele = [];
    while (mots.length && !/\p{Ll}/u.test(mots[0]) && /[\d_,\/]/.test(mots[0])) codesModele.push(mots.shift());
    const codeModele = codesModele.join(" ").replace(/[\s,_]+$/, "").slice(0, 30);
    const i = mots.findIndex((m) => /^\d[.,]\d/.test(m));
    const moteur = i >= 0 ? mots.slice(i).join(" ") : mots.join(" ") || l.version;
    const modele = `${titreCase(l.modele)}${codeModele ? ` (${codeModele})` : ""}`;
    nonReliees.set(l.modele, (nonReliees.get(l.modele) ?? 0) + 1);
    const c = { marque: mf, modele, moteur, code_moteur: l.moteurs, annee_debut: ecrireDate(d), annee_fin: f === 999912 ? "" : ecrireDate(f), puissance: String(cv) };
    ajouter(l.article, c, rem);
  } else for (const c of cibles) ajouter(l.article, c, rem);
}
function ajouter(ref, c, rem) {
  const k = [ref, c.marque, c.modele, c.moteur ?? "", c.code_moteur ?? "", c.annee_debut ?? ""].join("|");
  const ex = apps.get(k);
  if (ex) { if (rem && !ex.remarques.includes(rem)) ex.remarques.push(rem); return; }
  apps.set(k, { ref, ...c, remarques: rem ? [rem] : [] });
}
console.log(`Voitures : ${exactes} lignes reliées à Filtron (code exact), ${famille} par la famille du moteur, ${gates} écrites avec le nom Gates`);
console.log(`→ ${apps.size} liens pièce ↔ voiture à écrire`);
console.log("Lignes écrites avec le nom Gates, par modèle :", Object.fromEntries([...nonReliees.entries()].sort((a, b) => b[1] - a[1])));
const ex = [...apps.values()].filter((a) => /LOGAN/i.test(a.modele)).slice(0, 6);
console.log("Exemples Logan :", ex.map((a) => `${a.ref} → ${a.modele} · ${a.moteur} · ${a.code_moteur} · ${a.annee_debut}-${a.annee_fin} · ${a.puissance} ch${a.remarques.length ? " · " + a.remarques.join(" / ") : ""}`));

if (!ECRIRE) { console.log("\nEssai à blanc : rien n'est écrit. Ajouter --ecrire pour enregistrer."); process.exit(0); }

// ───────────── 6. Écriture ─────────────
const { error: errRem } = await sb.from("applications").select("remarque").limit(1);
if (errRem) { console.error("La colonne applications.remarque n'existe pas encore : colle supabase/applications_remarque.sql dans Supabase, puis relance."); process.exit(1); }

const refs = [...fiches.keys()];
const existantes = new Map();
for (let i = 0; i < refs.length; i += 100) {
  const { data, error } = await sb.from("products").select("id, reference, marque, categorie").in("reference", refs.slice(i, i + 100));
  if (error) throw error;
  for (const p of data) existantes.set(p.reference, p);
}
const creees = [], gardees = [], conflits = [];
for (const f of fiches.values()) {
  const p = existantes.get(f.reference);
  if (p) { if (sansAccent(p.marque) === "GATES") { f.id = p.id; gardees.push(f.reference); } else conflits.push(`${f.reference} (déjà « ${p.marque} »)`); continue; }
  const { data, error } = await sb.from("products").insert({
    reference: f.reference, marque: "Gates", categorie: f.categorie, nom_fr: `${f.nom} Gates`, nom_ar: `${f.nomAr} Gates`,
    prix_achat: 0, prix_vente: 0, stock: 0, stock_min: 1, notes: `Catalogue officiel Gates (PDF « ${basename(PDF)} », édition ${edition})`,
  }).select("id").single();
  if (error) throw new Error(`${f.reference} : ${error.message}`);
  f.id = data.id; creees.push({ id: data.id, reference: f.reference });
}
console.log(`Fiches : ${creees.length} créées, ${gardees.length} déjà là, ${conflits.length} laissées (autre marque) ${conflits.slice(0, 5).join(", ")}`);

// Codes d'origine (OE) cités par Gates → équivalences (recherche par numéro d'origine)
let oeAjoutes = 0;
for (const f of fiches.values()) {
  if (!f.id || !f.oe.size) continue;
  const mf = filtron.get(marquesGates[0]).marque;
  for (const o of f.oe) {
    const { data: deja } = await sb.from("equivalences").select("id").eq("product_id", f.id).ilike("reference", o).limit(1);
    if (deja?.length) continue;
    const { error } = await sb.from("equivalences").insert({ product_id: f.id, marque: mf, reference: o, prix: null, prix_achat: null, stock: 0 });
    if (error) throw error;
    oeAjoutes++;
  }
}

const aEcrire = [...apps.values()].filter((a) => fiches.get(a.ref)?.id).map((a) => ({
  product_id: fiches.get(a.ref).id, marque: a.marque, modele: a.modele, moteur: a.moteur, code_moteur: a.code_moteur,
  annee_debut: a.annee_debut, annee_fin: a.annee_fin, puissance: a.puissance, remarque: a.remarques.join(" — ou — ") || null,
}));
// --remplacer : réimport d'une marque (rapprochement amélioré) → ses anciens liens Gates sont effacés d'abord.
// Seules les voitures de CETTE marque reliées à des fiches Gates (qui ne reçoivent des voitures que par ce script).
if (REMPLACER) {
  const gatesIds = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await sb.from("products").select("id").eq("marque", "Gates").range(i, i + 999);
    if (error) throw error;
    gatesIds.push(...data.map((p) => p.id));
    if (data.length < 1000) break;
  }
  let effaces = 0;
  for (const mg of marquesGates) {
    const mf = filtron.get(mg).marque;
    for (let i = 0; i < gatesIds.length; i += 150) {
      const { error, count } = await sb.from("applications").delete({ count: "exact" }).eq("marque", mf).in("product_id", gatesIds.slice(i, i + 150));
      if (error) throw error;
      effaces += count ?? 0;
    }
  }
  console.log(`--remplacer : ${effaces} anciens liens Gates effacés pour ${marquesGates.join(", ")}`);
}
let ecrites = 0;
for (let i = 0; i < aEcrire.length; i += 500) {
  const { error, count } = await sb.from("applications").upsert(aEcrire.slice(i, i + 500), {
    onConflict: "product_id,marque,modele,moteur,code_moteur,annee_debut", ignoreDuplicates: true, count: "exact",
  });
  if (error) throw error;
  ecrites += count ?? 0;
}
console.log(`Voitures : ${ecrites} liens écrits (sur ${aEcrire.length}) · ${oeAjoutes} codes d'origine ajoutés`);

// Trace locale (pour défaire si besoin) : backups/gates/
const dossier = join(process.cwd(), "backups", "gates");
mkdirSync(dossier, { recursive: true });
const trace = join(dossier, `${new Date().toISOString().slice(0, 10)}-${basename(PDF).replace(/\.pdf$/i, "")}.json`);
writeFileSync(trace, JSON.stringify({ pdf: basename(PDF), edition, creees, gardees, conflits, liens: aEcrire.length, ecrites, oeAjoutes }, null, 1));
console.log(`Trace : ${trace}`);
