// Classe chaque fiche en 'voiture' (voitures + utilitaires) ou 'camion' (poids lourds, bus) → products.vehicule
// (supabase/products_vehicule.sql). Même règle que classifyKind (src/lib/vehicleType.ts — garder les deux pareils) :
//   1) préfixe Filtron camion (OM, OR, OT, AM, AD, AE, AG, PK) ou série PM800 → PM815 ;
//   2) sinon, marques des voitures compatibles : majorité (ou égalité) de marques poids lourd / bus → camion.
// Ajouts pour les catalogues Gates / Metelli / Graf : marques Filtron des camions (MAN TRUCK, VOLVO TRUCKS, RENAULT TRUCKS,
// DAF TRUCKS, MITSUBISHI FUSO…) et, chez Mercedes-Benz, les modèles camion / bus (Actros, Atego, Axor, Citaro…).
// Une fiche sans voiture (huile, accessoire…) reste 'voiture'. Non destructif : rien n'est supprimé (BIBLE §8.37).
// À relancer après chaque import de catalogue :  node scripts/classer_vehicules.mjs [--ecrire]
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_CLE } from "./cle_supabase.mjs";

const ECRIRE = process.argv.includes("--ecrire");
const sb = createClient(SUPABASE_URL, SUPABASE_CLE);

const CAMION_PREFIXES = new Set(["OM", "OR", "OT", "AM", "AD", "AE", "AG", "PK"]);
const HEAVY_KEYWORDS = [
  "TRUCK", "BUS", "TRACTOR", "TRACTEUR", "FUSO",
  "DENNIS", "DEUTZ", "ERF", "SCANIA", "IVECO", "DAF", "KAMAZ", "LIEBHERR",
  "CASE-IH", "CASE IH", "NEW HOLLAND", "CLAAS", "FENDT", "JOHN DEERE", "MASSEY",
  "VALTRA", "ZETOR", "URSUS", "LANDINI", "JELCZ", "AUTOSAN", "KRAZ", "MAZ",
  "URAL", "TATRA", "LIAZ", "AVIA", "MULTICAR", "MANITOU", "MAGNI", "EVOBUS",
  "SETRA", "NEOPLAN", "SOLARIS", "VAN HOOL", "IRISBUS", "VDL", "BOVA", "BREDA",
  "MENARINI", "BELL EQUIPMENT", "JCB", "CATERPILLAR", "KOMATSU", "TEREX",
  "BOMAG", "DOOSAN", "KUBOTA", "YANMAR", "STEYR", "TEMSA", "OTOKAR",
  "BUMAR", "AGRIFULL", "ANTONIO CARRARO", "AKERMAN", "ANDORIA", "HANOMAG",
  "ASHOK LEYLAND", "AUWAERTER", "BUESSING", "AGRIA", "AEBI", "AMMANN", "BAUTZ",
];
const MERCEDES_CAMION = /\b(ACTROS|ATEGO|AXOR|ANTOS|AROCS|ECONIC|UNIMOG|ZETROS|VARIO|CITARO|TRAVEGO|TOURISMO|INTOURO|CONECTO|INTEGRO|TOURINO|CAPACITY|SK|NG|MK|LK|LN2|LP|LA|O ?\d{3}[A-Z]?)\b/i;
const refPrefix = (r) => (r.match(/^[A-Za-z]+/) || [""])[0].toUpperCase();
const pmIsCamion = (r) => { const m = r.toUpperCase().match(/^PM\s*(\d+)(?:\/(\d+))?/); if (!m) return false; const n = +m[1], v = m[2] ? +m[2] : 0; return n >= 800 && (n < 815 || (n === 815 && v === 0)); };
const lourde = (make) => HEAVY_KEYWORDS.some((k) => make.toUpperCase().includes(k));
function classer(reference, makes) {
  if (CAMION_PREFIXES.has(refPrefix(reference)) || pmIsCamion(reference)) return "camion";
  if (makes.length) { const h = makes.filter(lourde).length; if (h > 0 && h >= makes.length - h) return "camion"; }
  return "voiture";
}

// Fiches
const produits = [];
for (let i = 0; ; i += 1000) {
  const { data, error } = await sb.from("products").select("id, reference, marque" + (ECRIRE ? ", vehicule" : "")).range(i, i + 999);
  if (error) throw error;
  produits.push(...data);
  if (data.length < 1000) break;
}
// Marques compatibles par fiche (Mercedes : camion si le modèle est un camion / bus)
// Lecture « à la suite » par identifiant (un saut loin dans 380 000 lignes dépasse le temps permis par la base)
const makes = new Map();
let dernier = null, lus = 0;
for (;;) {
  let q = sb.from("applications").select("id, product_id, marque, modele").order("id").limit(1000);
  if (dernier) q = q.gt("id", dernier);
  const { data, error } = await q;
  if (error) throw error;
  for (const a of data) {
    let m = a.marque ?? "";
    if (/^MERCEDES/i.test(m) && MERCEDES_CAMION.test(a.modele ?? "")) m = "MERCEDES-BENZ TRUCK";
    if (!makes.has(a.product_id)) makes.set(a.product_id, new Set());
    makes.get(a.product_id).add(m);
  }
  lus += data.length;
  if (data.length < 1000) break;
  dernier = data[data.length - 1].id;
  if (lus % 50000 === 0) process.stdout.write(`  … voitures lues ${lus}\n`);
}
const parType = { voiture: 0, camion: 0 }, parMarque = {};
const changements = { voiture: [], camion: [] };
for (const p of produits) {
  const t = classer(p.reference, [...(makes.get(p.id) ?? [])]);
  parType[t]++;
  parMarque[`${p.marque} ${t}`] = (parMarque[`${p.marque} ${t}`] ?? 0) + 1;
  if (!ECRIRE || p.vehicule !== t) changements[t].push(p.id);
}
console.log(`${produits.length} fiches : ${parType.voiture} voitures, ${parType.camion} camions`);
console.log("Par marque :", Object.entries(parMarque).sort().map(([k, n]) => `${k} ${n}`).join(" · "));
if (!ECRIRE) { console.log("Essai à blanc : rien n'est écrit (--ecrire pour enregistrer)."); process.exit(0); }
for (const t of ["voiture", "camion"]) {
  const ids = changements[t];
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await sb.from("products").update({ vehicule: t }).in("id", ids.slice(i, i + 200));
    if (error) throw new Error(error.message.includes("vehicule") ? "Colonne products.vehicule absente : colle supabase/products_vehicule.sql" : error.message);
  }
}
console.log(`Écrit : ${changements.camion.length} fiches passées en camion, ${changements.voiture.length} en voiture.`);
